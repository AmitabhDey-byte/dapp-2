import { config } from "./config";
import { signWithFreighter } from "./freighter";
import type { PoolEvent, PoolPosition, PoolStats } from "./types";

type ContractMethod = "stats" | "position" | "deposit" | "withdraw" | "refresh" | "projected_bonus";
type StellarModule = typeof import("@stellar/stellar-sdk");
type ScVal = import("@stellar/stellar-sdk").xdr.ScVal;

async function getStellarSdk(): Promise<StellarModule> {
  return import("@stellar/stellar-sdk");
}

async function rpcServer() {
  const StellarSdk = await getStellarSdk();
  return new StellarSdk.rpc.Server(config.rpcUrl, { allowHttp: config.rpcUrl.startsWith("http://") });
}

async function contractCall(contractId: string, method: ContractMethod, args: ScVal[] = []) {
  const StellarSdk = await getStellarSdk();
  const contract = new StellarSdk.Contract(contractId);
  return contract.call(method, ...args);
}

async function toNative(value: ScVal | undefined) {
  const StellarSdk = await getStellarSdk();
  if (!value) {
    return null;
  }

  return StellarSdk.scValToNative(value);
}

async function fromNumber(value: number) {
  const StellarSdk = await getStellarSdk();
  return StellarSdk.nativeToScVal(value, { type: "i128" });
}

async function fromU32(value: number) {
  const StellarSdk = await getStellarSdk();
  return StellarSdk.nativeToScVal(value, { type: "u32" });
}

async function fromAddress(value: string) {
  const StellarSdk = await getStellarSdk();
  return new StellarSdk.Address(value).toScVal();
}

async function simulate(contractId: string, method: ContractMethod, args: ScVal[] = []) {
  const StellarSdk = await getStellarSdk();
  const server = await rpcServer();
  const source = new StellarSdk.Account(StellarSdk.Keypair.random().publicKey(), "0");
  const tx = new StellarSdk.TransactionBuilder(source, {
    fee: "10000",
    networkPassphrase: config.networkPassphrase
  })
    .addOperation(await contractCall(contractId, method, args))
    .setTimeout(30)
    .build();
  const response = await server.simulateTransaction(tx);

  if ("error" in response && response.error) {
    throw new Error(response.error);
  }

  if ("result" in response && response.result) {
    return response.result.retval;
  }

  return undefined;
}

export async function readPoolStats() {
  const value = await simulate(config.poolContractId, "stats");
  const native = (await toNative(value)) as PoolStats | null;

  return (
    native ?? {
      label: config.poolLabel,
      total_deposits: 0,
      user_count: 0
    }
  );
}

export async function readPosition(address: string) {
  const value = await simulate(config.poolContractId, "position", [await fromAddress(address)]);
  const native = (await toNative(value)) as PoolPosition | null;

  return (
    native ?? {
      deposited: 0,
      pending_bonus: 0,
      risk_score: 0,
      lock_days: 0,
      updated_at: 0
    }
  );
}

export async function previewProjectedBonus(amount: number, lockDays: number) {
  const value = await simulate(config.oracleContractId, "projected_bonus", [
    await fromNumber(amount),
    await fromU32(lockDays)
  ]);
  const native = (await toNative(value)) as number | null;
  return native ?? 0;
}

async function submit(method: "deposit" | "withdraw" | "refresh", address: string, args: ScVal[]) {
  const StellarSdk = await getStellarSdk();
  const server = await rpcServer();
  const account = await server.getAccount(address);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: config.networkPassphrase
  })
    .addOperation(await contractCall(config.poolContractId, method, args))
    .setTimeout(60)
    .build();
  const prepared = await server.prepareTransaction(tx);
  const signedXdr = await signWithFreighter(prepared.toXDR());
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  const result = await server.sendTransaction(signedTx);

  if ("errorResult" in result && result.errorResult) {
    throw new Error("Transaction submission failed");
  }

  return result.hash;
}

export async function submitDeposit(address: string, amount: number, lockDays: number) {
  return submit("deposit", address, [await fromAddress(address), await fromNumber(amount), await fromU32(lockDays)]);
}

export async function submitWithdraw(address: string, amount: number) {
  return submit("withdraw", address, [await fromAddress(address), await fromNumber(amount)]);
}

export async function submitRefresh(address: string) {
  return submit("refresh", address, [await fromAddress(address)]);
}

export async function readEvents() {
  if (!config.poolContractId && !config.oracleContractId) {
    return [];
  }

  const body = {
    jsonrpc: "2.0",
    id: "nebula-events",
    method: "getEvents",
    params: {
      startLedger: 1,
      filters: [
        {
          type: "contract",
          contractIds: [config.poolContractId, config.oracleContractId].filter(Boolean)
        }
      ],
      pagination: {
        limit: 12
      }
    }
  };

  const response = await fetch(config.rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  const records = data.result?.events ?? [];

  return records
    .map(
      (event: {
        id: string;
        contractId: string;
        ledger: number;
        topic: unknown[];
        value: unknown;
        timestamp?: string;
      }) =>
        ({
          id: event.id,
          contractId: event.contractId,
          ledger: event.ledger,
          topic: JSON.stringify(event.topic),
          value: JSON.stringify(event.value),
          timestamp: event.timestamp
        }) satisfies PoolEvent
    )
    .reverse();
}
