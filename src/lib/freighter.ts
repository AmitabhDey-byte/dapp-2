import { config } from "./config";

export async function connectWallet() {
  const { requestAccess } = await import("@stellar/freighter-api");
  const access = await requestAccess();

  if ("error" in access && access.error) {
    throw new Error(access.error);
  }

  const address = await getWalletAddress();
  return address;
}

export async function getWalletAddress() {
  const { getAddress } = await import("@stellar/freighter-api");
  const result = await getAddress();

  if ("error" in result && result.error) {
    throw new Error(result.error);
  }

  return result.address;
}

export async function canAccessWallet() {
  const { isAllowed } = await import("@stellar/freighter-api");
  const result = await isAllowed();

  if ("error" in result && result.error) {
    return false;
  }

  return Boolean(result.isAllowed);
}

export async function signWithFreighter(transactionXdr: string) {
  const { signTransaction } = await import("@stellar/freighter-api");
  const result = await signTransaction(transactionXdr, {
    networkPassphrase: config.networkPassphrase,
    address: undefined
  });

  if (typeof result === "string") {
    return result;
  }

  if ("error" in result && result.error) {
    throw new Error(result.error);
  }

  return result.signedTxXdr;
}
