#![no_std]

use soroban_sdk::{
    contract, contractclient, contractevent, contractimpl, contracttype, Address, Env, String,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Oracle,
    Label,
    TotalDeposits,
    UserCount,
    Position(Address),
}

#[derive(Clone)]
#[contracttype]
pub struct Position {
    pub deposited: i128,
    pub pending_bonus: i128,
    pub risk_score: u32,
    pub lock_days: u32,
    pub updated_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct PoolStats {
    pub label: String,
    pub total_deposits: i128,
    pub user_count: u32,
}

#[derive(Clone)]
#[contractevent]
pub struct Deposited {
    pub user: Address,
    pub amount: i128,
    pub bonus: i128,
    pub risk_score: u32,
}

#[derive(Clone)]
#[contractevent]
pub struct Withdrawn {
    pub user: Address,
    pub amount: i128,
}

#[derive(Clone)]
#[contractevent]
pub struct Refreshed {
    pub user: Address,
    pub bonus: i128,
    pub risk_score: u32,
}

#[contractclient(name = "StrategyOracleClient")]
pub trait StrategyOracleTrait {
    fn projected_bonus(env: Env, amount: i128, lock_days: u32) -> i128;
    fn risk_score(env: Env, amount: i128) -> u32;
}

#[contract]
pub struct LiquidityPool;

#[contractimpl]
impl LiquidityPool {
    pub fn init(env: Env, admin: Address, oracle: Address, label: String) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Label, &label);
        env.storage().instance().set(&DataKey::TotalDeposits, &0_i128);
        env.storage().instance().set(&DataKey::UserCount, &0_u32);
    }

    pub fn deposit(env: Env, user: Address, amount: i128, lock_days: u32) -> Position {
        user.require_auth();

        if amount <= 0 || lock_days == 0 {
            panic!("invalid deposit");
        }

        let oracle = read_oracle(&env);
        let oracle_client = StrategyOracleClient::new(&env, &oracle);
        let bonus = oracle_client.projected_bonus(&amount, &lock_days);
        let risk_score = oracle_client.risk_score(&amount);
        let now = env.ledger().timestamp();
        let key = DataKey::Position(user.clone());
        let previous = env.storage().persistent().get::<_, Position>(&key);

        let position = match previous {
            Some(existing) => Position {
                deposited: existing.deposited + amount,
                pending_bonus: existing.pending_bonus + bonus,
                risk_score,
                lock_days,
                updated_at: now,
            },
            None => {
                let user_count = read_user_count(&env) + 1;
                env.storage().instance().set(&DataKey::UserCount, &user_count);
                Position {
                    deposited: amount,
                    pending_bonus: bonus,
                    risk_score,
                    lock_days,
                    updated_at: now,
                }
            }
        };

        let total_deposits = read_total_deposits(&env) + amount;
        env.storage().instance().set(&DataKey::TotalDeposits, &total_deposits);
        env.storage().persistent().set(&key, &position);
        Deposited {
            user,
            amount,
            bonus,
            risk_score,
        }
        .publish(&env);
        position
    }

    pub fn withdraw(env: Env, user: Address, amount: i128) -> Position {
        user.require_auth();

        if amount <= 0 {
            panic!("invalid withdraw");
        }

        let key = DataKey::Position(user.clone());
        let mut position: Position = env.storage().persistent().get(&key).unwrap();

        if amount > position.deposited {
            panic!("insufficient position");
        }

        position.deposited -= amount;
        position.updated_at = env.ledger().timestamp();

        let total_deposits = read_total_deposits(&env) - amount;
        env.storage().instance().set(&DataKey::TotalDeposits, &total_deposits);
        env.storage().persistent().set(&key, &position);
        Withdrawn { user, amount }.publish(&env);
        position
    }

    pub fn refresh(env: Env, user: Address) -> Position {
        let key = DataKey::Position(user.clone());
        let mut position: Position = env.storage().persistent().get(&key).unwrap();
        let oracle = read_oracle(&env);
        let oracle_client = StrategyOracleClient::new(&env, &oracle);
        let bonus = oracle_client.projected_bonus(&position.deposited, &position.lock_days);
        position.pending_bonus = bonus;
        position.risk_score = oracle_client.risk_score(&position.deposited);
        position.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &position);
        Refreshed {
            user,
            bonus,
            risk_score: position.risk_score,
        }
        .publish(&env);
        position
    }

    pub fn position(env: Env, user: Address) -> Position {
        env.storage()
            .persistent()
            .get(&DataKey::Position(user))
            .unwrap_or(Position {
                deposited: 0,
                pending_bonus: 0,
                risk_score: 0,
                lock_days: 0,
                updated_at: 0,
            })
    }

    pub fn stats(env: Env) -> PoolStats {
        PoolStats {
            label: env.storage().instance().get(&DataKey::Label).unwrap(),
            total_deposits: read_total_deposits(&env),
            user_count: read_user_count(&env),
        }
    }

    pub fn oracle(env: Env) -> Address {
        read_oracle(&env)
    }
}

fn read_oracle(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Oracle).unwrap()
}

fn read_total_deposits(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::TotalDeposits).unwrap()
}

fn read_user_count(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::UserCount).unwrap()
}

#[cfg(test)]
mod tests {
    use super::{LiquidityPool, LiquidityPoolClient};
    use soroban_sdk::{testutils::Address as _, Address, Env, String};
    use strategy_oracle::StrategyOracle;

    #[test]
    fn deposit_uses_oracle_contract() {
        let env = Env::default();
        let oracle_id = env.register(StrategyOracle, ());
        let pool_id = env.register(LiquidityPool, ());

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        let oracle_client = strategy_oracle::StrategyOracleClient::new(&env, &oracle_id);
        oracle_client.init(&admin, &String::from_str(&env, "Nebula oracle"));

        let pool_client = LiquidityPoolClient::new(&env, &pool_id);
        pool_client.init(&admin, &oracle_id, &String::from_str(&env, "Nebula pool"));

        env.mock_all_auths();

        let position = pool_client.deposit(&user, &6_000, &30);
        let refreshed = pool_client.refresh(&user);

        assert_eq!(position.deposited, 6_000);
        assert_eq!(position.pending_bonus, 5917);
        assert_eq!(refreshed.risk_score, 54);
        assert_eq!(pool_client.stats().total_deposits, 6_000);
    }
}
