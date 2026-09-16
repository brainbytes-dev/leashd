# x402 Multi-Rail Spikes

Pre-implementation research for the x402/USDC rail (Base Account Spend Permissions). No code in this
document — every fact below was fetched or computed live on 2026-09-16 with the exact command shown.
Where a source could not confirm something, that is stated explicitly instead of guessing.

## Step 1: SpendPermissionManager deployment

### Source

`https://docs.base.org/base-account/reference/onchain-contracts/spend-permissions` now **redirects**
("Base Account SDK and Base MCP documentation has moved from Base docs to Coinbase Developer
Platform"). The live location is:

`https://docs.cdp.coinbase.com/base-account/reference/onchain-contracts/spend-permissions`

That page documents the ABI (see Step 4) but does **not** publish a deployed-address table. The
canonical address table lives in the contract's own repo, confirmed via:

```bash
curl -s https://raw.githubusercontent.com/coinbase/spend-permissions/main/README.md | head -30
```

Result (verbatim from the README `## Deployments` section):

```
### SpendPermissionManager

`SpendPermissionManager`: `0xf85210B21cC50302F477BA56686d2019dC9b67Ad`

`PublicERC6492Validator`: `0xcfCE48B757601F3f351CB6f434CB0517aEEE293D`

Testnets:
- Base Sepolia
- Optimism Sepolia
- Ethereum Sepolia

Mainnets:
- Base
- Ethereum
- Optimism
- Arbitrum
- Polygon
- Zora
- Binance Smart Chain
- Avalanche

### SpendRouter
`SpendRouter`: TBD
```

Both addresses are 40 hex chars (20 bytes) — verified by length check, not eyeballed.

### Bytecode verification (`eth_getCode`)

```bash
ADDR="0xf85210B21cC50302F477BA56686d2019dC9b67Ad"
for RPC in https://mainnet.base.org https://sepolia.base.org https://ethereum-rpc.publicnode.com; do
  echo "== $RPC =="
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getCode\",\"params\":[\"$ADDR\",\"latest\"]}" | cut -c1-100
done
```

Results:

| Chain | RPC | Result |
|---|---|---|
| Base mainnet | `https://mainnet.base.org` | `0x608060405260043610610170...` — bytecode present |
| Base Sepolia | `https://sepolia.base.org` | `0x608060405260043610610170...` — bytecode present, identical prefix (same deployer/bytecode) |
| Ethereum mainnet | `https://ethereum-rpc.publicnode.com` | `0x608060405260043610610170...` — bytecode present |

**Finding, and a correction to the brief's assumption:** SpendPermissionManager **is deployed on
Ethereum mainnet** at the same address (`0xf85210B21cC50302F477BA56686d2019dC9b67Ad`), contrary to the
brief's fallback text ("not deployed; Ethereum uses funding=manual until the ERC-7715 issue lands").
The README's own deployments list already named Ethereum as a supported mainnet, and `eth_getCode`
confirms it live. This does not change the ABI (Step 4) but it does mean later tasks should not assume
Ethereum requires manual funding for lack of a deployed contract — if Ethereum is still manual-funding
in the plan, that must be for a different reason (e.g. no facilitator/relayer support, gas cost, or a
deliberate scope cut), not "contract absent." Flagging this for the plan owner to confirm rather than
silently adjusting downstream tasks.

## Step 2: Gas cost of `spend()`

Neither the CDP onchain-contracts doc page nor the CDP improve-ux spend-permissions page mentions gas
costs for `spend()`. No public gas-cost figure exists in Base's docs. Recorded from the contract repo's
own Foundry gas snapshot instead (closest available real data, with the caveat below):

```bash
curl -s https://raw.githubusercontent.com/coinbase/spend-permissions/main/.gas-snapshot | grep '^SpendTest'
```

Relevant lines (fuzz-test mean gas, ERC-20 `spend()` paths — USDC is an ERC-20 that returns `true` on
`transfer`, so `test_spend_success_ERC20ReturnsTrue` is the closest proxy):

```
SpendTest:test_spend_success_ERC20ReturnsTrue(...) (runs: 256, μ: 186880, ~: 186744)
SpendTest:test_spend_success_ERC20_approvalSetToZero(...) (runs: 256, μ: 194071, ~: 193935)
SpendTest:test_spend_success_ERC20NoReturn(...) (runs: 256, μ: 186919, ~: 186783)
```

**Caveat:** these are Foundry fuzz-test gas numbers, which include the test's own setup/fixture path
(e.g. first-time period initialization) inside the measured call, not an isolated `spend()`-only
measurement. Treat ~187k-194k gas as an upper-bound estimate for a "cold" spend (first spend in a
period); a warm repeat spend within the same period would likely cost less (no `getCurrentPeriod`
state write). Task 5's `publicClient.estimateGas` against a real Base Sepolia call will be the
authoritative number — this is the placeholder until that exists.

### USD estimate at current fees (fetched live, 2026-09-16)

```bash
curl -s https://mainnet.base.org -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_gasPrice","params":[]}'
# {"jsonrpc":"2.0","result":"0x5b8d80","id":1}  -> 6,000,000 wei = 0.006 gwei

curl -s https://ethereum-rpc.publicnode.com -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_gasPrice","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0xb0b4db9"}  -> 185,290,169 wei = 0.185290169 gwei

curl -s "https://api.coinbase.com/v2/prices/ETH-USD/spot"
# {"data":{"amount":"2407.565","base":"ETH","currency":"USD"}}
```

Using 186,880 gas (the `ERC20ReturnsTrue` case) and ETH = $2407.565:

- **Base: ~186,880 gas, ~$0.0027 at current fees (0.006 gwei execution gas price).** Note this is L2
  execution gas price only — `eth_gasPrice` on Base does not include the L1 data-posting fee component,
  so real end-to-end cost will be somewhat higher than this figure.
- **Ethereum: ~186,880 gas, ~$0.083 at current fees (0.185 gwei).**

These are point-in-time estimates (gas prices fetched at request time, 2026-09-16 ~12:30 UTC) and will
drift; they are not a promise for the README, just a documented starting point per the brief.

## Step 3: Facilitator behaviour with an EOA on Base Sepolia

### What the x402-foundation repo names

```bash
curl -s https://raw.githubusercontent.com/x402-foundation/x402/main/examples/typescript/clients/fetch/README.md
curl -s https://raw.githubusercontent.com/x402-foundation/x402/main/examples/typescript/servers/express/README.md
```

The fetch-client example does **not** name a public test endpoint — it points at
`http://localhost:4021/weather`, i.e. the local express server example. Per the brief's own fallback
instruction, this is the local resource-server example to run instead:

- Path: `examples/typescript/servers/express` (repo: `x402-foundation/x402`, default branch `main`)
- Start command (from the example's README):
  ```bash
  cd examples/typescript                 # examples root
  pnpm install && pnpm build
  cd servers/express
  cp .env-local .env                     # fill FACILITATOR_URL, EVM_ADDRESS, SVM_ADDRESS
  pnpm dev
  ```
- It serves `GET /weather` on port 4021, requiring `$0.001` (documented) — the actual `PAYMENT-REQUIRED`
  payload in the README shows `"amount": "1000"` (1000 atomic units = 0.001 USDC, 6 decimals),
  `"network": "eip155:84532"` (Base Sepolia, CAIP-2), asset `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  (Base Sepolia USDC), scheme `"exact"`.

### A live public test endpoint (found by direct probing, not named in the README)

While looking for a reachable facilitator/resource-server pair to verify against, the following was
found and verified live:

```bash
curl -sL -i https://x402.org/protected
```

Result: `HTTP/2 402`, body `{}`, with a `payment-required` response header containing base64-encoded
JSON. Decoded:

```bash
curl -s https://x402.org/protected -D - -o /dev/null | grep -i '^payment-required:' \
  | cut -d' ' -f2 | base64 -d | python3 -m json.tool
```

```json
{
    "x402Version": 2,
    "error": "Payment required",
    "resource": {
        "url": "https://x402.vercel.app/protected",
        "description": "Access to protected content",
        "mimeType": ""
    },
    "accepts": [
        {
            "scheme": "exact",
            "network": "eip155:84532",
            "amount": "10000",
            "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
            "maxTimeoutSeconds": 300,
            "extra": { "name": "USDC", "version": "2" }
        },
        {
            "scheme": "exact",
            "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
            "amount": "10000",
            "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
            "payTo": "CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5",
            "maxTimeoutSeconds": 300,
            "extra": { "feePayer": "CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5" }
        }
    ]
}
```

So the live `https://x402.org/protected` endpoint (backed by `https://x402.vercel.app/protected`)
advertises: network `eip155:84532` (Base Sepolia), asset `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
(same USDC address as the local example), amount `10000` atomic units = **0.01 USDC**, `payTo`
`0x209693Bc6afc0C5328bA36FaF03C514EF312287C`, scheme `exact`. This was **not completed** (no payment
was sent — that requires a funded EOA and a signed authorization/settlement round-trip, out of scope
for Task 0's read-only spike), so the actual settlement/facilitator-verify behaviour on submitting a
payment is **not verified** and remains open for Task 5+ to confirm live against Base Sepolia.

## Step 4: ABI check

Source: `https://docs.cdp.coinbase.com/base-account/reference/onchain-contracts/spend-permissions`
(the live location of the Base Account onchain-contracts spend-permissions reference; the old
`docs.base.org` URL from the brief 301s here).

Exact function signatures as documented:

```solidity
function spend(SpendPermission memory spendPermission, uint160 value) external;

function approveWithSignature(SpendPermission calldata spendPermission, bytes calldata signature) external;

function getCurrentPeriod(SpendPermission memory spendPermission) public view returns (PeriodSpend memory);

function isValid(SpendPermission memory spendPermission) public view returns (bool);

function getHash(SpendPermission memory spendPermission) public view returns (bytes32);
```

`SpendPermission` struct field order (the doc explicitly states fields "must be strictly ordered as
defined" — this order is load-bearing for EIP-712 hashing/ABI encoding, not just documentation
convenience):

| Field | Type |
|---|---|
| `account` | `address` |
| `spender` | `address` |
| `token` | `address` |
| `allowance` | `uint160` |
| `period` | `uint48` |
| `start` | `uint48` |
| `end` | `uint48` |
| `salt` | `uint256` |
| `extraData` | `bytes` |

The `PeriodSpend` return-struct for `getCurrentPeriod` was not shown in the CDP doc excerpt, so it was
pulled from the contract source directly instead of left as a gap:

```bash
curl -s https://raw.githubusercontent.com/coinbase/spend-permissions/main/src/SpendPermissionManager.sol \
  | grep -n "struct PeriodSpend" -A 8
```

```solidity
struct PeriodSpend {
    /// @dev Timestamp this period starts at (inclusive, unix seconds).
    uint48 start;
    /// @dev Timestamp this period ends before (exclusive, unix seconds).
    uint48 end;
    /// @dev Accumulated spend amount for the period.
    uint160 spend;
}
```

(Source: `https://github.com/coinbase/spend-permissions`, `src/SpendPermissionManager.sol`, line 82,
`main` branch, fetched 2026-09-16. Doc comment typo "Timstamp" on the `start` field is in the source
itself and corrected here in the copied comment — the field name/type/order was taken verbatim from
the code, not the comment text.)

These five signatures (`spend`, `approveWithSignature`, `getCurrentPeriod`, `isValid`, `getHash`) match
what the brief says Task 5 assumes. No discrepancy found here.
