# Submission Evidence

Use this page as the final review checklist before submitting Nebula Pool.

## Repository

- Public repository: <https://github.com/AmitabhDey-byte/dapp-2>
- Meaningful commits: 10+
- CI workflow: `.github/workflows/ci.yml`
- Deployment workflow: `.github/workflows/deploy-pages.yml`

## Live Demo

- Demo URL: <https://amitabhdey-byte.github.io/dapp-2/>
- Mobile screenshot: `docs/mobile-view.png`
- Demo video: `TBD_VIDEO_LINK`

## Contracts

- Oracle contract ID: `TBD_AFTER_DEPLOY`
- Pool contract ID: `TBD_AFTER_DEPLOY`
- Oracle deployment transaction: `TBD_AFTER_DEPLOY`
- Pool deployment transaction: `TBD_AFTER_DEPLOY`
- Example interaction transaction: `TBD_AFTER_FIRST_INTERACTION`

## Test Evidence

Run these commands and capture the output for the submission screenshots:

```bash
npm run frontend:test
npm run contracts:test
npm run lint
npm run build
```

Expected frontend test summary:

```text
# tests 3
# pass 3
# fail 0
```

## Feature Coverage

- Advanced Soroban contracts: `contracts/strategy-oracle` and `contracts/liquidity-pool`
- Inter-contract communication: liquidity pool calls the strategy oracle
- Event streaming: frontend reads recent Stellar RPC contract events
- Error/loading states: transaction buttons disable during invalid or busy states
- Mobile responsiveness: CSS breakpoints cover tablet and phone layouts
- CI/CD: GitHub Actions validates and deploys the app
