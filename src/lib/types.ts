export type PoolStats = {
  label: string;
  total_deposits: number;
  user_count: number;
};

export type PoolPosition = {
  deposited: number;
  pending_bonus: number;
  risk_score: number;
  lock_days: number;
  updated_at: number;
};

export type PoolEvent = {
  id: string;
  contractId: string;
  topic: string;
  ledger: number;
  value: string;
  timestamp?: string;
};

export type WalletState = {
  address: string;
  connected: boolean;
};

