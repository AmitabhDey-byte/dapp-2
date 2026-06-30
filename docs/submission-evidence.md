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

- Network: Stellar testnet
- Deployer public key: `GANF26XIFDKZNLRPRWTLZOIJZXNSF6GCDLSGJFHQDU3ATAS3VHXBAFCN`
- Oracle contract ID: `CBCV6ZC2XNLPPL2KIO5TQ7Z4BJ4MYCFVXIFG4O5ZZ56JEPHTHUC6FHJB`
- Pool contract ID: `CDYHTLXLYQED6VFIYNLMNWVIUTAH5QSPKNRZTVUZ6QWBOJRGSC3OMHT7`
- Oracle deployment transaction: `36b419deb136149bf555ed8e35cc30d1a17993efe64afaff98977024d57ed701`
- Oracle init transaction: `8c27cc5ae3ad4f99f7973eacdd12905f03c4fa2be39b8a634201b7ff4cb81e04`
- Pool deployment transaction: `d4e86fc4c54fdeaa5bcc5322fb0c5873dba5baa288e61b0a22ff957193a335da`
- Pool init transaction: `8d81534305c935b90d5bd0516142e241f240f3a26c74856036aab188f812def7`
- Example deposit interaction transaction: `c2a7078981cb791961d9c2b4d83c92e988fd6b39102ca1d27ce2046fc00fa527`

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
