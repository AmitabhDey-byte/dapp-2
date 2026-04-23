# Nebula Pool

[![CI](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/ci.yml/badge.svg)](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/ci.yml)
[![Deploy Pages](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/AmitabhDey-byte/dapp-2/actions/workflows/deploy-pages.yml)

Nebula Pool is a production-minded Stellar dapp built around advanced Soroban contract patterns. It combines a custom liquidity pool contract with a separate strategy oracle contract, connects through Freighter wallet, streams events from Stellar RPC in real time, and ships with CI/CD for GitHub.

## Live demo

Planned Pages URL after push and Pages enablement:

[https://amitabhdey-byte.github.io/dapp-2/](https://amitabhdey-byte.github.io/dapp-2/)

## What this project covers

- Freighter wallet integration
- Soroban inter-contract call between `liquidity-pool` and `strategy-oracle`
- Custom pool mechanics with deposit, withdraw, refresh, and risk-aware bonus projection
- Real-time event streaming from Stellar RPC
- Mobile responsive React frontend
- CI/CD with GitHub Actions

## Repository structure

```text
.
|-- contracts
|   |-- liquidity-pool
|   `-- strategy-oracle
|-- src
|-- .github/workflows
`-- README.md
```

## Local setup

### Prerequisites

- Node.js 22+
- npm 11+
- Rust stable
- Stellar CLI
- Freighter wallet installed in the browser

### Install

```bash
npm install
```

### Frontend environment

Copy `.env.example` into `.env` and fill the deployed contract addresses:

```bash
VITE_POOL_CONTRACT_ID=YOUR_POOL_CONTRACT_ID
VITE_ORACLE_CONTRACT_ID=YOUR_ORACLE_CONTRACT_ID
```

### Run the frontend

```bash
npm run dev
```

### Run contract tests

```bash
npm run contracts:test
```

### Run the full project check

```bash
npm run check
```

## Contract overview

### `strategy-oracle`

- Stores tiered APR-style bonus logic
- Returns projected bonus based on deposit amount and lock duration
- Returns a risk score used by the pool contract
- Emits tier update events

### `liquidity-pool`

- Stores user pool positions
- Calls the oracle contract during `deposit` and `refresh`
- Tracks total deposits and participant count
- Emits `deposit`, `withdraw`, and `refresh` events

## Deployment flow

1. Build the contracts:

```bash
npm run contracts:build
```

2. Deploy `strategy-oracle` first.
3. Deploy `liquidity-pool` with the oracle contract address.
4. Add both contract IDs to `.env`.
5. Push to GitHub to trigger CI and Pages deployment.

## Submission checklist

- Public GitHub repository: `https://github.com/AmitabhDey-byte/dapp-2`
- Live demo link: `https://amitabhdey-byte.github.io/dapp-2/`
- Mobile responsive view screenshot: add after local or deployed capture
- CI/CD badge: included at the top of this README
- Contract addresses and transaction hashes:
  - Oracle contract ID: `TBD_AFTER_DEPLOY`
  - Oracle deploy transaction: `TBD_AFTER_DEPLOY`
  - Pool contract ID: `TBD_AFTER_DEPLOY`
  - Pool deploy transaction: `TBD_AFTER_DEPLOY`
- Token or pool address:
  - Pool address: `TBD_AFTER_DEPLOY`

## Mobile responsive proof

Add a screenshot like `docs/mobile-view.png` after deployment or local capture and reference it here:

```md
![Mobile responsive view](docs/mobile-view.png)
```

## CI/CD proof

The GitHub Actions badges above will show passing status after the repository is pushed.

## Recommended commit plan

To keep the submission aligned with the 8+ meaningful commits requirement, use a sequence close to this:

1. `chore: initialize nebula pool workspace`
2. `feat: add strategy oracle soroban contract`
3. `feat: add liquidity pool contract with inter-contract call`
4. `feat: build freighter wallet dashboard`
5. `feat: add live stellar event streaming`
6. `style: polish responsive nebula interface`
7. `ci: add github actions for validation and pages deployment`
8. `docs: finalize readme and submission details`

## Notes

This repo is configured for GitHub Pages because it does not require external deployment credentials. If you prefer Vercel or Netlify later, the frontend is already structured to deploy cleanly there as well.
