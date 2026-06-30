import { useEffect, useState } from "react";
import { config, hasContractConfig } from "./lib/config";
import { formatAmount, formatRelativeDate, normalizeError, truncateAddress } from "./lib/format";
import { canAccessWallet, connectWallet, getWalletAddress } from "./lib/freighter";
import {
  previewProjectedBonus,
  readEvents,
  readPoolStats,
  readPosition,
  submitDeposit,
  submitRefresh,
  submitWithdraw
} from "./lib/stellar";
import type { PoolEvent, PoolPosition, PoolStats, WalletState } from "./lib/types";

const initialStats: PoolStats = {
  label: config.poolLabel,
  total_deposits: 0,
  user_count: 0
};

const initialPosition: PoolPosition = {
  deposited: 0,
  pending_bonus: 0,
  risk_score: 0,
  lock_days: 0,
  updated_at: 0
};

export default function App() {
  const [wallet, setWallet] = useState<WalletState>({ address: "", connected: false });
  const [stats, setStats] = useState<PoolStats>(initialStats);
  const [position, setPosition] = useState<PoolPosition>(initialPosition);
  const [events, setEvents] = useState<PoolEvent[]>([]);
  const [depositAmount, setDepositAmount] = useState("6000");
  const [lockDays, setLockDays] = useState("30");
  const [withdrawAmount, setWithdrawAmount] = useState("1000");
  const [projectedBonus, setProjectedBonus] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Waiting for wallet connection");
  const [error, setError] = useState("");

  const parsedDepositAmount = Number(depositAmount);
  const parsedLockDays = Number(lockDays);
  const parsedWithdrawAmount = Number(withdrawAmount);
  const hasValidDeposit = Number.isFinite(parsedDepositAmount) && parsedDepositAmount > 0;
  const hasValidLockDays = Number.isInteger(parsedLockDays) && parsedLockDays > 0;
  const hasValidWithdraw = Number.isFinite(parsedWithdrawAmount) && parsedWithdrawAmount > 0;
  const canSubmitDeposit = wallet.connected && hasContractConfig && hasValidDeposit && hasValidLockDays && !busy;
  const canSubmitWithdraw = wallet.connected && hasContractConfig && hasValidWithdraw && !busy;
  const canRefreshRewards = wallet.connected && hasContractConfig && position.deposited > 0 && !busy;
  const formHint = !hasContractConfig
    ? "Deploy contracts and add their IDs before sending transactions."
    : !wallet.connected
      ? "Connect Freighter to manage your pool position."
      : "Enter positive values to submit pool actions.";
  const previewEnabled = hasContractConfig && hasValidDeposit && hasValidLockDays;
  const projectedBonusValue = previewEnabled ? projectedBonus : 0;

  async function refreshData(address?: string) {
    if (!hasContractConfig) {
      setStatus("Add pool and oracle contract IDs to your environment to unlock onchain data");
      return;
    }

    const [nextStats, nextEvents] = await Promise.all([readPoolStats(), readEvents()]);
    setStats(nextStats);
    setEvents(nextEvents);

    if (address) {
      const nextPosition = await readPosition(address);
      setPosition(nextPosition);
      setStatus("Pool data synced from Stellar RPC");
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const allowed = await canAccessWallet();

        if (!allowed) {
          await refreshData();
          return;
        }

        const address = await getWalletAddress();
        setWallet({ address, connected: true });
        await refreshData(address);
      } catch (caughtError) {
        setError(normalizeError(caughtError));
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasContractConfig) {
      return;
    }

    const id = window.setInterval(() => {
      void refreshData(wallet.address || undefined);
    }, 8000);

    return () => window.clearInterval(id);
  }, [wallet.address]);

  useEffect(() => {
    if (!previewEnabled) {
      return;
    }

    const amount = Number(depositAmount);
    const days = Number(lockDays);

    void previewProjectedBonus(amount, days)
      .then(setProjectedBonus)
      .catch(() => setProjectedBonus(0));
  }, [depositAmount, lockDays, previewEnabled]);

  async function handleConnect() {
    try {
      setBusy(true);
      setError("");
      const address = await connectWallet();
      setWallet({ address, connected: true });
      await refreshData(address);
    } catch (caughtError) {
      setError(normalizeError(caughtError));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeposit() {
    if (!canSubmitDeposit) {
      setError("Enter a positive deposit amount and lock duration before depositing.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const txHash = await submitDeposit(wallet.address, parsedDepositAmount, parsedLockDays);
      setStatus(`Deposit submitted: ${txHash}`);
      await refreshData(wallet.address);
    } catch (caughtError) {
      setError(normalizeError(caughtError));
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!canSubmitWithdraw) {
      setError("Enter a positive withdraw amount before withdrawing.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const txHash = await submitWithdraw(wallet.address, parsedWithdrawAmount);
      setStatus(`Withdraw submitted: ${txHash}`);
      await refreshData(wallet.address);
    } catch (caughtError) {
      setError(normalizeError(caughtError));
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    if (!canRefreshRewards) {
      setError("Deposit into the pool before refreshing rewards.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const txHash = await submitRefresh(wallet.address);
      setStatus(`Reward refresh submitted: ${txHash}`);
      await refreshData(wallet.address);
    } catch (caughtError) {
      setError(normalizeError(caughtError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Stellar testnet liquidity intelligence</p>
          <h1>Nebula Pool pairs a strategy oracle with a mobile-first Freighter dashboard.</h1>
          <p className="hero__lede">
            Deposit into a custom Soroban pool, let the contract query a separate oracle contract for projected
            bonus logic, and watch pool activity stream live from Stellar RPC.
          </p>
          <div className="hero__actions">
            <button className="button button--primary" onClick={handleConnect} disabled={busy}>
              {wallet.connected ? "Freighter connected" : "Connect Freighter"}
            </button>
            <a className="button button--ghost" href={config.githubRepo} target="_blank" rel="noreferrer">
              View repo
            </a>
          </div>
        </div>
        <div className="hero__panel">
          <div className="stat-card">
            <span>Total pooled</span>
            <strong>{formatAmount(stats.total_deposits)} units</strong>
          </div>
          <div className="stat-card">
            <span>Active participants</span>
            <strong>{formatAmount(stats.user_count)}</strong>
          </div>
          <div className="stat-card">
            <span>Wallet</span>
            <strong>{truncateAddress(wallet.address)}</strong>
          </div>
          <div className="stat-card">
            <span>Network</span>
            <strong>{config.network}</strong>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="panel panel--form">
          <div className="panel__header">
            <p className="eyebrow">Pool control</p>
            <h2>Manage your position</h2>
          </div>
          <label className="field">
            <span>Deposit amount</span>
            <input value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} inputMode="numeric" />
          </label>
          <label className="field">
            <span>Lock days</span>
            <input value={lockDays} onChange={(event) => setLockDays(event.target.value)} inputMode="numeric" />
          </label>
          <div className="preview">
            <span>Projected bonus</span>
            <strong>{formatAmount(projectedBonusValue)} units</strong>
          </div>
          <p className="helper-text">{formHint}</p>
          <button className="button button--primary" onClick={handleDeposit} disabled={!canSubmitDeposit}>
            {busy ? "Submitting..." : "Deposit to pool"}
          </button>

          <label className="field">
            <span>Withdraw amount</span>
            <input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} inputMode="numeric" />
          </label>
          <div className="button-row">
            <button className="button button--secondary" onClick={handleWithdraw} disabled={!canSubmitWithdraw}>
              Withdraw
            </button>
            <button className="button button--ghost" onClick={handleRefresh} disabled={!canRefreshRewards}>
              Refresh rewards
            </button>
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <p className="eyebrow">Position state</p>
            <h2>Your Soroban position</h2>
          </div>
          <div className="position-grid">
            <div>
              <span>Deposited</span>
              <strong>{formatAmount(position.deposited)}</strong>
            </div>
            <div>
              <span>Pending bonus</span>
              <strong>{formatAmount(position.pending_bonus)}</strong>
            </div>
            <div>
              <span>Risk score</span>
              <strong>{position.risk_score}/100</strong>
            </div>
            <div>
              <span>Lock length</span>
              <strong>{position.lock_days} days</strong>
            </div>
          </div>
          <div className="status-block">
            <span>Last update</span>
            <strong>{formatRelativeDate(position.updated_at)}</strong>
          </div>
          <div className="status-block" aria-live="polite">
            <span>Status</span>
            <strong>{status}</strong>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {!hasContractConfig ? (
            <p className="warning-text">
              Missing `VITE_POOL_CONTRACT_ID` or `VITE_ORACLE_CONTRACT_ID`. The UI is ready, but onchain reads and
              writes need deployed addresses.
            </p>
          ) : null}
        </article>

        <article className="panel panel--events">
          <div className="panel__header">
            <p className="eyebrow">Real-time feed</p>
            <h2>Latest contract events</h2>
          </div>
          <div className="event-list">
            {events.length ? (
              events.map((event) => (
                <div className="event-item" key={event.id}>
                  <div className="event-item__top">
                    <strong>{event.topic}</strong>
                    <span>Ledger {event.ledger}</span>
                  </div>
                  <p>{event.value}</p>
                  <small>{truncateAddress(event.contractId)}</small>
                </div>
              ))
            ) : (
              <div className="event-empty">
                <strong>No events yet</strong>
                <p>Once the pool and oracle are deployed, this panel streams contract activity directly from RPC.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
