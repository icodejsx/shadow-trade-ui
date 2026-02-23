# ShadowTrade — Private BTC Prediction Market on Starknet

> Built for the **Starknet Resolve Hackathon**

## What is ShadowTrade?

ShadowTrade is a **privacy-preserving prediction market** where users bet on whether BTC will hit $100k — without revealing their position until the reveal phase. Nobody can front-run or copy your trade.

Built using the **commit-reveal scheme** with Starknet's native **Pedersen hash**, giving cryptographic privacy guarantees without complex ZK circuits.

## Live Contracts (Sepolia Testnet)

| Contract | Address |
|----------|---------|
| ShadowTrade Market | `0x0065cc9da5a59e39ed089e7bd53c2003d680a2be17e8b4f08212f726bdfe316f` |
| sBTC Token | `0x0493a5019b3ca8cb56fd0802851e7f33d9c32260a9a9bf761030b0855040b2ed` |

## How It Works

### 1. Commit Phase
- User selects YES or NO
- Generates `hash(vote, secret)` client-side using Pedersen hash
- Submits the **hash only** to the contract along with a stake
- **Nobody can see your vote on-chain** — only the hash

### 2. Reveal Phase
- After the commit window closes, users reveal `vote + secret`
- Contract recomputes `hash(vote, secret)` and verifies it matches
- Invalid reveals (wrong secret or vote) are rejected
- Vote counts and pools are tallied

### 3. Resolve
- Admin resolves the market with the outcome (YES or NO)

### 4. Claim
- Winners claim their original stake + proportional share of the losing pool
- Payout = `stake + (stake / winning_pool) * losing_pool`

## Why Starknet?

- **Pedersen hash is native** to Cairo/Starknet — no gas overhead
- **Account abstraction** makes UX smooth with multicall (approve + commit in one tx)
- **Cheap transactions** make micro-stakes viable

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Cairo 2.15, Scarb |
| Testing | Starknet Foundry (snforge) |
| Frontend | Next.js 15, TypeScript, Tailwind |
| Wallet | starknet-react v5 (Argent, Braavos) |
| RPC | Alchemy Starknet Sepolia |

## Running Locally

### Contracts

```bash
cd ShadowTrade
scarb build
snforge test
```

### Frontend

```bash
cd shadow-trade-ui
npm install --legacy-peer-deps
npm run dev
```

Visit `http://localhost:3000`

## Deploying a New Market

```bash
# Get current timestamp
date +%s

# Deploy (replace timestamps)
sncast deploy \
  --network sepolia \
  --class-hash 0x6669f3558ab20992c78db85ec54ec07dc75d8917d781051fc6a0c85a87ac364 \
  --arguments '<question_felt252>, <commit_deadline_u64>, <reveal_deadline_u64>, <sbtc_address>'
```

## Security Properties

- **Vote privacy**: Votes are hidden as Pedersen hashes during the commit phase
- **Binding**: Once committed, the vote cannot be changed (changing it changes the hash)
- **Verifiable**: The reveal is cryptographically verified on-chain
- **No front-running**: Observers cannot see how others voted until reveal

## Future Roadmap

- [ ] Oracle integration (Pragma) for automatic BTC price resolution
- [ ] Multiple concurrent markets via Factory contract
- [ ] STRK token staking
- [ ] Mainnet deployment

---

*Built with Cairo 2.15 + Next.js for the Starknet Resolve Hackathon*