import { useEffect, useState } from "react";
import { config, hasContractConfig } from "./lib/config";
import { formatAmount, formatRelativeDate, normalizeError, truncateAddress } from "./lib/format";
import { canAccessWallet, connectWallet } from "./lib/freighter";
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

type Page = "overview" | "manage" | "activity" | "advisor" | "guide";

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
  const [activePage, setActivePage] = useState<Page>("overview");
  const [stats, setStats] = useState<PoolStats>(initialStats);
  const [position, setPosition] = useState<PoolPosition>(initialPosition);
  const [events, setEvents] = useState<PoolEvent[]>([]);
  const [depositAmount, setDepositAmount] = useState("6000");
  const [lockDays, setLockDays] = useState("30");
  const [withdrawAmount, setWithdrawAmount] = useState("1000");
  const [projectedBonus, setProjectedBonus] = useState(0);
  const [advisorPrompt, setAdvisorPrompt] = useState("How should I evaluate this pool position?");
  const [advisorAnswer, setAdvisorAnswer] = useState("");
  const [advisorError, setAdvisorError] = useState("");
  const [advisorBusy, setAdvisorBusy] = useState(false);
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
  const poolShare = stats.total_deposits > 0 ? (position.deposited / stats.total_deposits) * 100 : 0;
  const bonusRatio = position.deposited > 0 ? (position.pending_bonus / position.deposited) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, 100 - position.risk_score + Math.min(20, bonusRatio)));
  const riskLabel = position.risk_score >= 75 ? "High risk" : position.risk_score >= 45 ? "Moderate risk" : "Conservative";
  const formHint = !hasContractConfig
    ? "Deploy contracts and add their IDs before sending transactions."
    : !wallet.connected
      ? "Connect Freighter to manage your pool position."
      : "Enter positive values to submit pool actions.";
  const previewEnabled = hasContractConfig && hasValidDeposit && hasValidLockDays;
  const projectedBonusValue = previewEnabled ? projectedBonus : 0;
  const completionSteps = [
    { label: "Contracts deployed", complete: hasContractConfig },
    { label: "Wallet connected", complete: wallet.connected },
    { label: "Pool has activity", complete: stats.total_deposits > 0 },
    { label: "Your position loaded", complete: position.updated_at > 0 }
  ];
  const activePageLabel = {
    overview: "Overview",
    manage: "Manage Pool",
    activity: "Live Activity",
    advisor: "AI Advisor",
    guide: "How It Works"
  }[activePage];

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
        await refreshData();

        if (allowed) {
          setStatus("Freighter permission found. Click Connect Freighter to load your wallet position.");
        }
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

  function handleForgetWallet() {
    setWallet({ address: "", connected: false });
    setPosition(initialPosition);
    setStatus("Wallet disconnected in this session. Revoke site access in Freighter to fully clear permission.");
    setError("");
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

  async function handleAskAdvisor() {
    try {
      setAdvisorBusy(true);
      setAdvisorError("");
      setError("");
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: advisorPrompt,
          context: {
            network: config.network,
            walletConnected: wallet.connected,
            totalDeposits: stats.total_deposits,
            userCount: stats.user_count,
            position,
            projectedBonus: projectedBonusValue,
            poolSharePercent: poolShare,
            bonusRatioPercent: bonusRatio,
            riskLabel
          }
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "AI advisor request failed");
      }

      setAdvisorAnswer(data.answer ?? "No advisor response returned.");
    } catch (caughtError) {
      setAdvisorError(normalizeError(caughtError));
    } finally {
      setAdvisorBusy(false);
    }
  }

  return (
    <main className="shell">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="#overview" onClick={() => setActivePage("overview")}>
          <span className="brand__mark">✦</span>
          <span>Nebula Pool</span>
        </a>
        <div className="nav-pills">
          {(["overview", "manage", "activity", "advisor", "guide"] as Page[]).map((page) => (
            <button
              className={`nav-pill ${activePage === page ? "nav-pill--active" : ""}`}
              key={page}
              onClick={() => setActivePage(page)}
              type="button"
            >
              {page === "overview"
                ? "Overview"
                : page === "manage"
                  ? "Manage"
                  : page === "activity"
                    ? "Activity"
                    : page === "advisor"
                      ? "AI Advisor"
                      : "Guide"}
            </button>
          ))}
        </div>
      </nav>

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
            {wallet.connected ? (
              <button className="button button--ghost" onClick={handleForgetWallet} type="button">
                Forget wallet
              </button>
            ) : null}
            <button className="button button--ghost" onClick={() => setActivePage("manage")} type="button">
              Start managing
            </button>
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

      <section className="page-shell">
        <div className="page-title">
          <p className="eyebrow">Current page</p>
          <h2>{activePageLabel}</h2>
        </div>

        {activePage === "overview" ? (
          <section className="page-grid page-grid--overview">
            <article className="panel panel--wide">
              <div className="panel__header">
                <p className="eyebrow">Launch checklist</p>
                <h2>Your dApp readiness map</h2>
              </div>
              <div className="checklist">
                {completionSteps.map((step) => (
                  <div className="check-item" key={step.label}>
                    <span className={step.complete ? "check-dot check-dot--done" : "check-dot"}>{step.complete ? "✓" : "•"}</span>
                    <strong>{step.label}</strong>
                  </div>
                ))}
              </div>
              <p className="helper-text">
                This page gives reviewers a quick “what works” view before they interact with the wallet flow.
              </p>
            </article>

            <article className="panel panel--gradient">
              <p className="eyebrow">Projected bonus</p>
              <strong className="big-number">{formatAmount(projectedBonusValue)}</strong>
              <span>units for {hasValidLockDays ? parsedLockDays : 0} lock days</span>
              <button className="button button--secondary" onClick={() => setActivePage("manage")} type="button">
                Tune deposit
              </button>
            </article>

            <article className="panel">
              <div className="panel__header">
                <p className="eyebrow">Smart contracts</p>
                <h2>Two-contract architecture</h2>
              </div>
              <div className="flow-list">
                <div><strong>1</strong><span>Frontend signs with Freighter</span></div>
                <div><strong>2</strong><span>Pool contract stores positions</span></div>
                <div><strong>3</strong><span>Oracle returns bonus and risk</span></div>
              </div>
            </article>

            <article className="panel">
              <div className="panel__header">
                <p className="eyebrow">Strategy health</p>
                <h2>{riskLabel}</h2>
              </div>
              <div className="meter" aria-label={`Strategy health ${healthScore.toFixed(0)} out of 100`}>
                <span style={{ width: `${healthScore}%` }} />
              </div>
              <div className="mini-metrics">
                <div><span>Pool share</span><strong>{poolShare.toFixed(2)}%</strong></div>
                <div><span>Bonus ratio</span><strong>{bonusRatio.toFixed(2)}%</strong></div>
                <div><span>Health score</span><strong>{healthScore.toFixed(0)}/100</strong></div>
              </div>
            </article>
          </section>
        ) : null}

        {activePage === "manage" ? (
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
          </section>
        ) : null}

        {activePage === "activity" ? (
          <section className="page-grid page-grid--activity">
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
                    <strong>No recent events loaded</strong>
                    <p>Deposit, withdraw, or refresh rewards to create fresh pool activity in the Stellar RPC feed.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="panel">
              <div className="panel__header">
                <p className="eyebrow">Network health</p>
                <h2>Live testnet config</h2>
              </div>
              <div className="info-stack">
                <div><span>Network</span><strong>{config.network}</strong></div>
                <div><span>Pool</span><strong>{truncateAddress(config.poolContractId)}</strong></div>
                <div><span>Oracle</span><strong>{truncateAddress(config.oracleContractId)}</strong></div>
                <div><span>RPC</span><strong>{config.rpcUrl.replace("https://", "")}</strong></div>
              </div>
            </article>
          </section>
        ) : null}

        {activePage === "advisor" ? (
          <section className="page-grid page-grid--advisor">
            <article className="panel panel--wide">
              <div className="panel__header">
                <p className="eyebrow">Gemini strategy copilot</p>
                <h2>Ask for a plain-English pool analysis</h2>
              </div>
              <label className="field">
                <span>Question</span>
                <textarea value={advisorPrompt} onChange={(event) => setAdvisorPrompt(event.target.value)} rows={5} />
              </label>
              <div className="button-row">
                <button className="button button--primary" onClick={handleAskAdvisor} disabled={advisorBusy || !advisorPrompt.trim()}>
                  {advisorBusy ? "Thinking..." : "Ask Gemini"}
                </button>
                <button
                  className="button button--ghost"
                  onClick={() => setAdvisorPrompt("Summarize my current position, risk score, and bonus opportunity.")}
                  type="button"
                >
                  Use position prompt
                </button>
              </div>
              {advisorAnswer ? (
                <div className="advisor-answer">
                  <strong>Advisor response</strong>
                  <p>{advisorAnswer}</p>
                </div>
              ) : advisorError ? (
                <div className="advisor-answer advisor-answer--error">
                  <strong>Advisor error</strong>
                  <p>{advisorError}</p>
                </div>
              ) : (
                <div className="event-empty">
                  <strong>AI advisor ready</strong>
                  <p>Add `GEMINI_API_KEY` in `.env` for localhost and in Vercel for production, then ask for complete risk summaries, demo explanations, or strategy notes.</p>
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel__header">
                <p className="eyebrow">Advisor context</p>
                <h2>Live inputs</h2>
              </div>
              <div className="info-stack">
                <div><span>Risk label</span><strong>{riskLabel}</strong></div>
                <div><span>Risk score</span><strong>{position.risk_score}/100</strong></div>
                <div><span>Projected bonus</span><strong>{formatAmount(projectedBonusValue)}</strong></div>
                <div><span>Pool share</span><strong>{poolShare.toFixed(2)}%</strong></div>
              </div>
            </article>
          </section>
        ) : null}

        {activePage === "guide" ? (
          <section className="page-grid page-grid--guide">
            <article className="panel panel--wide">
              <div className="panel__header">
                <p className="eyebrow">How it works</p>
                <h2>From wallet click to onchain event</h2>
              </div>
              <div className="timeline">
                <div><strong>Connect</strong><p>Freighter provides the user address and signs transactions.</p></div>
                <div><strong>Preview</strong><p>The oracle simulates projected bonus before any transaction is sent.</p></div>
                <div><strong>Deposit</strong><p>The pool stores the position and calls the oracle for strategy data.</p></div>
                <div><strong>Stream</strong><p>Events are fetched from Stellar RPC and displayed in the activity feed.</p></div>
              </div>
            </article>
            <article className="panel">
              <div className="panel__header">
                <p className="eyebrow">Links</p>
                <h2>Project resources</h2>
              </div>
              <div className="resource-links">
                <a href={config.githubRepo} target="_blank" rel="noreferrer">GitHub repository</a>
                <a href={`https://stellar.expert/explorer/testnet/contract/${config.poolContractId}`} target="_blank" rel="noreferrer">
                  Pool on Stellar Expert
                </a>
                <a href={`https://stellar.expert/explorer/testnet/contract/${config.oracleContractId}`} target="_blank" rel="noreferrer">
                  Oracle on Stellar Expert
                </a>
              </div>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
