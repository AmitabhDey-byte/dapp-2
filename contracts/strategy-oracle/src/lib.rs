#![no_std]

use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, Map, String};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Label,
    Tiers,
}

#[derive(Clone)]
#[contracttype]
pub struct Tier {
    pub minimum: i128,
    pub rate_bps: u32,
}

#[derive(Clone)]
#[contractevent]
pub struct TierUpdated {
    pub minimum: i128,
    pub rate_bps: u32,
}

#[contract]
pub struct StrategyOracle;

#[contractimpl]
impl StrategyOracle {
    pub fn init(env: Env, admin: Address, label: String) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Label, &label);
        env.storage().instance().set(&DataKey::Tiers, &default_tiers(&env));
    }

    pub fn set_tier(env: Env, minimum: i128, rate_bps: u32) {
        let admin = read_admin(&env);
        admin.require_auth();

        if minimum <= 0 || rate_bps == 0 {
            panic!("invalid tier");
        }

        let mut tiers = read_tiers(&env);
        tiers.set(minimum, Tier { minimum, rate_bps });
        env.storage().instance().set(&DataKey::Tiers, &tiers);
        TierUpdated { minimum, rate_bps }.publish(&env);
    }

    pub fn projected_bonus(env: Env, amount: i128, lock_days: u32) -> i128 {
        if amount <= 0 || lock_days == 0 {
            return 0;
        }

        let tier = select_tier(&env, amount);
        let lock_multiplier = i128::from(lock_days);
        let numerator = amount * i128::from(tier.rate_bps) * lock_multiplier;
        numerator / 36_500
    }

    pub fn risk_score(env: Env, amount: i128) -> u32 {
        let tier = select_tier(&env, amount);
        if tier.rate_bps >= 1600 {
            82
        } else if tier.rate_bps >= 1200 {
            54
        } else {
            27
        }
    }

    pub fn label(env: Env) -> String {
        env.storage().instance().get(&DataKey::Label).unwrap()
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }

    pub fn tiers(env: Env) -> Map<i128, Tier> {
        read_tiers(&env)
    }
}

fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_tiers(env: &Env) -> Map<i128, Tier> {
    env.storage().instance().get(&DataKey::Tiers).unwrap()
}

fn select_tier(env: &Env, amount: i128) -> Tier {
    let tiers = read_tiers(env);
    let mut selected = tiers.get(1_000).unwrap();

    for minimum in tiers.keys() {
        if amount >= minimum {
            selected = tiers.get(minimum).unwrap();
        }
    }

    selected
}

fn default_tiers(env: &Env) -> Map<i128, Tier> {
    let mut tiers = Map::new(env);
    tiers.set(1_000, Tier { minimum: 1_000, rate_bps: 700 });
    tiers.set(5_000, Tier { minimum: 5_000, rate_bps: 1200 });
    tiers.set(10_000, Tier { minimum: 10_000, rate_bps: 1600 });
    tiers
}

#[cfg(test)]
mod tests {
    use super::{StrategyOracle, StrategyOracleClient};
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn calculates_bonus_from_tiers() {
        let env = Env::default();
        let contract_id = env.register(StrategyOracle, ());
        let client = StrategyOracleClient::new(&env, &contract_id);
        let admin = Address::generate(&env);

        client.init(&admin, &String::from_str(&env, "Nebula tiers"));

        assert_eq!(client.projected_bonus(&1_000, &30), 575);
        assert_eq!(client.projected_bonus(&6_000, &30), 5917);
        assert_eq!(client.risk_score(&12_000), 82);
    }

    #[test]
    fn admin_can_add_high_value_tier() {
        let env = Env::default();
        let contract_id = env.register(StrategyOracle, ());
        let client = StrategyOracleClient::new(&env, &contract_id);
        let admin = Address::generate(&env);

        client.init(&admin, &String::from_str(&env, "Nebula tiers"));
        env.mock_all_auths();
        client.set_tier(&15_000, &2_000);

        assert_eq!(client.projected_bonus(&20_000, &30), 32876);
        assert_eq!(client.risk_score(&20_000), 82);
        assert!(client.tiers().contains_key(15_000));
    }
}
