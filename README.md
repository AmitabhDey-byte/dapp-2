# Nebula Pool

[![CI](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/ci.yml/badge.svg)](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/deploy-pages.yml)

Nebula Pool is a production-style Stellar testnet dApp that combines Soroban smart contracts, inter-contract oracle logic, Freighter wallet transactions, real-time RPC event streaming, CI/CD, responsive UI, and an optional Gemini-powered strategy assistant.

The submission is intentionally structured for review: deployed contract IDs, transaction hashes, screenshots, live links, test commands, and the requirement checklist are all visible in this README.

Resubmission note: the README now places deployment evidence and the example contract interaction transaction before screenshots so reviewers can validate the deployed Stellar testnet app immediately.

## Reviewer Quick Validation

| Requirement | Evidence |
| --- | --- |
| Public GitHub repository | [AmitabhDey-byte/dapp-2](https://github.com/AmitabhDey-byte/dapp-2) |
| Live deployed app | [Vercel deployment](https://dapp-2-pearl.vercel.app/) |
| Secondary deployment | [GitHub Pages deployment](https://amitabhdey-byte.github.io/dapp-2/) |
| Demo video | [1-2 minute walkthrough](https://drive.google.com/file/d/1pJuuivnpNuMHSTpO_oAM7yRZZfNzAVt8/view?usp=sharing) |
| Contract deployment address | Pool and oracle contract IDs listed below |
| Contract interaction hash | Example deposit transaction listed below |
| CI/CD evidence | GitHub Actions badge and screenshot below |
| Mobile responsive UI evidence | Mobile screenshots below |
| Test evidence | `npm run frontend:test`, `npm run contracts:test`, and CI workflow |
| Detailed submission evidence | [`docs/submission-evidence.md`](docs/submission-evidence.md) |

## Deployment Evidence

These are the actual Stellar testnet deployment values. No deployment placeholders are used in this repository.

| Item | Value |
| --- | --- |
| Network | `Stellar testnet` |
| Deployer public key | `GANF26XIFDKZNLRPRWTLZOIJZXNSF6GCDLSGJFHQDU3ATAS3VHXBAFCN` |
| Oracle contract ID | `CBXIVNEIAUQX6WQUE7TBEJTFPPOQFJOMUJ5C7LOHPAQCKV6GZNAICENN` |
| Pool contract ID | `CAO5UKZLCPRSIWOHQYIMFF6IAE3K5M3ISP5N3XJR6TMSEF7QO3PP5LKZ` |
| Oracle deployment transaction | `36b419deb136149bf555ed8e35cc30d1a17993efe64afaff98977024d57ed701` |
| Oracle initialization transaction | `8c27cc5ae3ad4f99f7973eacdd12905f03c4fa2be39b8a634201b7ff4cb81e04` |
| Pool deployment transaction | `d4e86fc4c54fdeaa5bcc5322fb0c5873dba5baa288e61b0a22ff957193a335da` |
| Pool initialization transaction | `8d81534305c935b90d5bd0516142e241f240f3a26c74856036aab188f812def7` |
| Example deposit interaction transaction | `c2a7078981cb791961d9c2b4d83c92e988fd6b39102ca1d27ce2046fc00fa527` |

## Live Links

- Vercel app: [https://dapp-2-pearl.vercel.app/](https://dapp-2-pearl.vercel.app/)
- GitHub Pages app: [https://amitabhdey-byte.github.io/dapp-2/](https://amitabhdey-byte.github.io/dapp-2/)
- Source repository: [https://github.com/AmitabhDey-byte/dapp-2](https://github.com/AmitabhDey-byte/dapp-2)
- Demo video: [Google Drive walkthrough](https://drive.google.com/file/d/1pJuuivnpNuMHSTpO_oAM7yRZZfNzAVt8/view?usp=sharing)
- Submission evidence file: [`docs/submission-evidence.md`](docs/submission-evidence.md)

## What The App Does

Nebula Pool is a Stellar liquidity intelligence dashboard. A user connects Freighter, deposits into a Soroban pool, chooses lock days, and receives a projected bonus and risk score calculated through a separate oracle contract.

The dApp demonstrates a realistic end-to-end Web3 product flow:

1. The frontend connects to Freighter.
2. The app reads deployed pool and oracle configuration from environment variables.
3. The user submits a deposit, withdrawal, or refresh transaction.
4. The liquidity pool contract calls the strategy oracle contract.
5. The oracle returns projected bonus and risk scoring logic.
6. The pool stores position state and emits contract events.
7. The frontend streams recent activity from Stellar RPC.
8. The optional Gemini advisor explains the position in plain English.

## Screenshots

### Desktop Dashboard

![Desktop hero](docs/screenshots/desktop-hero.png)

### Manage Position

![Manage position](docs/screenshots/manage-position.png)

### Overview Analytics

![Overview analytics](docs/screenshots/overview.png)

### Contract Activity Feed

![Activity feed](docs/screenshots/activity-feed.png)

### Mobile Responsive UI

![Mobile hero](docs/screenshots/mobile-hero.png)

![Mobile overview](docs/screenshots/mobile-overview.png)

### CI/CD Pipeline Evidence

![GitHub Actions](docs/screenshots/github-actions.png)

### Stellar Lab Contract Explorer Evidence

![Stellar Lab contract explorer](docs/screenshots/stellar-lab-contract.png)

## Requirement Coverage

| Required capability | Implementation |
| --- | --- |
| Advanced smart contract development | Two Soroban contracts with position state, admin configuration, risk scoring, projected rewards, and event emission |
| Inter-contract communication | `liquidity-pool` calls `strategy-oracle` during deposit and refresh flows |
| Event streaming and real-time updates | React frontend reads recent pool events from Stellar RPC |
| CI/CD pipeline setup | GitHub Actions workflows for validation and Pages deployment |
| Smart contract deployment workflow | Deployment IDs and transaction hashes are documented above |
| Mobile responsive frontend | Multi-page responsive dashboard with desktop and phone screenshots |
| Error handling and loading states | Wallet, transaction, RPC, AI, invalid input, and busy states are handled in the UI |
| Contract and frontend tests | Soroban contract tests plus Node frontend utility tests |
| Production-ready architecture | Separated contracts, typed frontend helpers, environment config, serverless AI route, and deployment docs |
| Documentation and demo presentation | README, evidence file, screenshots, live demo, and video walkthrough |

## Feature Highlights

- Multi-page dashboard: Overview, Manage, Activity, Advisor, and Guide
- Freighter wallet connection with explicit connect and forget-wallet flows
- Deposit, withdraw, refresh, and position tracking actions
- Live pool statistics and participant data from Stellar testnet
- Real-time contract event feed from Stellar RPC
- Optional Gemini strategy advisor through a secure server-side route
- Responsive dark UI designed for desktop and mobile review
- CI/CD workflow screenshots and status badges

## Architecture

```text
Freighter Wallet
      |
      v
React + Vite Frontend
      |
      |-- reads pool stats, positions, and events
      |-- submits signed Freighter transactions
      |-- calls /api/gemini for optional AI summaries
      v
Stellar RPC / Soroban
      |
      |-- liquidity-pool contract
      |       |-- deposit
      |       |-- withdraw
      |       |-- refresh
      |       |-- position
      |       |-- stats
      |
      |-- strategy-oracle contract
              |-- projected_bonus
              |-- risk_score
              |-- set_tier
```

## Smart Contracts

### `strategy-oracle`

Located at [`contracts/strategy-oracle`](contracts/strategy-oracle).

- Stores tiered strategy data
- Calculates projected bonus from deposit amount and lock duration
- Returns risk scores used by the pool
- Supports admin-managed tier updates
- Emits tier update events

### `liquidity-pool`

Located at [`contracts/liquidity-pool`](contracts/liquidity-pool).

- Stores user pool positions
- Calls the oracle contract during deposit and refresh
- Tracks total deposits and participant count
- Supports deposit, withdraw, refresh, position, and stats methods
- Emits deposit, withdraw, and refresh events

## Repository Structure

```text
.
|-- api
|   `-- gemini.ts
|-- contracts
|   |-- liquidity-pool
|   `-- strategy-oracle
|-- docs
|   |-- screenshots
|   `-- submission-evidence.md
|-- src
|   |-- lib
|   |-- App.tsx
|   `-- styles.css
|-- .github/workflows
|-- package.json
|-- vite.config.ts
`-- README.md
```

## Local Setup

### Prerequisites

- Node.js 22+
- npm 11+
- Rust stable
- Stellar CLI
- Freighter wallet browser extension

### Install Dependencies

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and use the deployed contract IDs below.

```bash
VITE_STELLAR_NETWORK=TESTNET
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_POOL_LABEL=Nebula Pool
VITE_POOL_CONTRACT_ID=CAO5UKZLCPRSIWOHQYIMFF6IAE3K5M3ISP5N3XJR6TMSEF7QO3PP5LKZ
VITE_ORACLE_CONTRACT_ID=CBXIVNEIAUQX6WQUE7TBEJTFPPOQFJOMUJ5C7LOHPAQCKV6GZNAICENN
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_API_KEY` must stay server-side. Do not expose it as a `VITE_` variable. The key is read by [`api/gemini.ts`](api/gemini.ts) in production and by the Vite dev middleware locally.

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Frontend Tests

```bash
npm run frontend:test
```

### Contract Tests

```bash
npm run contracts:test
```

### Full Validation

```bash
npm run check
```

## Deployment Notes

### Vercel

Vercel hosts the primary frontend and the Gemini serverless endpoint.

Recommended settings:

- Root directory: `.`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Required Vercel environment variables:

- `VITE_STELLAR_NETWORK`
- `VITE_STELLAR_RPC_URL`
- `VITE_STELLAR_HORIZON_URL`
- `VITE_STELLAR_NETWORK_PASSPHRASE`
- `VITE_POOL_LABEL`
- `VITE_POOL_CONTRACT_ID`
- `VITE_ORACLE_CONTRACT_ID`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` optional

The Vite base path defaults to `/` for Vercel.

### GitHub Pages

GitHub Pages is deployed through `.github/workflows/deploy-pages.yml`. The workflow sets `VITE_BASE_PATH=/dapp-2/` so the app loads correctly under the repository path.

## Testing Evidence

The project includes both frontend and contract validation commands:

```bash
npm run frontend:test
npm run contracts:test
npm run lint
npm run build
```

The frontend test suite currently covers formatting and display helpers used by the dashboard. The contract tests validate core Soroban behavior in the contract workspace.

## Demo Script

Use this concise explanation for a 1-2 minute review video:

> Nebula Pool is a Stellar testnet liquidity dashboard. A user connects Freighter, deposits into a Soroban pool, and the pool calls a separate strategy oracle contract to calculate reward bonuses and risk scores. The frontend reads live contract state and recent events from Stellar RPC. The app includes responsive analytics pages, deployment evidence, tests, CI/CD, and an optional Gemini strategy copilot powered by a secure serverless route.
