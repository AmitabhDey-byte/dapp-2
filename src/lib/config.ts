const testnetPassphrase = "Test SDF Network ; September 2015";

export const config = {
  appName: "Nebula Pool",
  network: import.meta.env.VITE_STELLAR_NETWORK ?? "TESTNET",
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
  horizonUrl: import.meta.env.VITE_STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  networkPassphrase: import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ?? testnetPassphrase,
  poolContractId: import.meta.env.VITE_POOL_CONTRACT_ID ?? "",
  oracleContractId: import.meta.env.VITE_ORACLE_CONTRACT_ID ?? "",
  poolLabel: import.meta.env.VITE_POOL_LABEL ?? "Nebula Pool",
  githubRepo: "https://github.com/AmitabhDey-byte/dapp-2"
};

export const hasContractConfig = Boolean(config.poolContractId && config.oracleContractId);

