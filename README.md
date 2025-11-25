# EIP-7702 Atomic UserOperation Execution

A production-ready implementation demonstrating atomic execution of EIP-7702 authorization with ERC-20 token transfers through Account Abstraction (ERC-4337) using the Alto bundler.

## Overview

This project implements the complete flow of converting an Externally Owned Account (EOA) into a smart contract wallet using EIP-7702, then executing an ERC-20 token transfer—all within a single atomic transaction on Sepolia testnet.

### Key Features

- **Atomic Execution**: EIP-7702 authorization and token transfer in one transaction
- **Account Abstraction**: Full ERC-4337 integration with EntryPoint v0.8
- **Production Ready**: TypeScript with strict mode, comprehensive error handling
- **Alto Bundler**: Integration with Pimlico's open-source bundler
- **Live on Sepolia**: Verified transactions on Ethereum testnet

## Live Demo

**Atomic Transaction Hash**: `0x035c365270c98bc32f32783d44bd3e58032b6851b4743bc750da109210ccf1d1`

[View on Etherscan →](https://sepolia.etherscan.io/tx/0x035c365270c98bc32f32783d44bd3e58032b6851b4743bc750da109210ccf1d1)

This transaction demonstrates:
- EIP-7702 authorization (EOA → SimpleAccount)
- Smart account deployment
- ERC-20 token transfer (10 TTK)
- All executed atomically in block 9705899

## Technical Architecture

```
┌─────────────────────┐
│   EOA (Owner)       │  Signs EIP-7702 authorization
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Simple Smart       │  to7702SimpleSmartAccount
│  Account (v0.8)     │  (Eth-Infinitism)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Smart Account      │  sendTransaction()
│  Client             │  (builds UserOperation)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Alto Bundler       │  eth_sendUserOperation
│  (Pimlico)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  EntryPoint v0.8    │  On-chain execution:
│  (Sepolia)          │  1. Set EIP-7702 code
│                     │  2. Execute UserOp
└─────────────────────┘
```

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- Sepolia testnet ETH (for gas fees)
- Pimlico API key ([get one here](https://dashboard.pimlico.io/))

## Installation

```bash
# Clone the repository
git clone https://github.com/DwivediUtkarsh/EIP-7702.git
cd EIP-7702

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root:

```bash
# EOA private key (must have Sepolia ETH for gas)
PRIVATE_KEY=0x...

# Pimlico API key for Alto bundler
PIMLICO_API_KEY=pim_...

# Sepolia RPC endpoint
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...

# ERC-20 token address (deployed via deploy-token script)
ERC20_TOKEN_ADDRESS=0x...

# Receiver address for token transfers
RECEIVER_ADDRESS=0x...
```

## Usage

### 1. Generate a New Wallet (Optional)

```bash
npm run generate-wallet
```

This creates a new Ethereum wallet and displays the private key and address. Fund the address with Sepolia ETH from a faucet:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)

### 2. Deploy Test Token

```bash
npm run deploy-token
```

Deploys a TestToken (TTK) ERC-20 contract to Sepolia and updates your `.env` file with the contract address.

### 3. Verify Account Setup

```bash
# Check smart account status
npm run check-aa

# View account addresses
npm run show-aa

# Check token balances
npm run check-balances
```

### 4. Execute Atomic Transaction

```bash
npm run send-erc20-7702
```

**First Execution:**
- Creates EIP-7702 authorization
- Deploys smart account
- Transfers 10 TTK tokens
- All in ONE transaction

**Subsequent Executions:**
- Only transfers tokens (no authorization needed)
- Smart account already deployed

## Project Structure

```
eip7702-atomic-userop/
├── src/
│   ├── clients.ts                  # EIP-7702 + Pimlico client configuration
│   ├── sendErc20With7702.ts        # Main: atomic transaction executor
│   ├── erc20Abi.ts                 # Standard ERC-20 ABI
│   ├── owner.ts                    # EOA owner management
│   ├── publicClient.ts             # Sepolia RPC client
│   ├── checkSmartAccount.ts        # Account status verification
│   ├── checkBalances.ts            # Token balance checker
│   └── showSmartAccountAddress.ts  # Address information display
├── scripts/
│   ├── deployToken.ts              # ERC-20 deployment script
│   └── generateWallet.ts           # Wallet generation utility
├── contracts/
│   └── TestToken.sol               # ERC-20 test token contract
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## Technology Stack

| Component | Implementation | Version |
|-----------|---------------|---------|
| **Language** | TypeScript | 5.7.2 |
| **EVM Client** | viem | 2.40.2 |
| **AA SDK** | permissionless | 0.2.57 |
| **Smart Account** | Eth-Infinitism SimpleAccount | EntryPoint v0.8 |
| **Bundler** | Alto (Pimlico) | Latest |
| **Network** | Sepolia Testnet | EIP-7702 enabled |

## Key Implementation Details

### EIP-7702 Authorization

The critical component is properly signing and passing the EIP-7702 authorization:

```typescript
// Only needed on first transaction
if (!isDeployed) {
  const nonce = await publicClient.getTransactionCount({
    address: owner.address, // Use EOA nonce
  });

  const authorization = await owner.signAuthorization({
    contractAddress: SIMPLE_ACCOUNT_LOGIC_ADDRESS,
    chainId: sepolia.id,
    nonce,
  });

  // Pass authorization in sendTransaction
  const txParams = {
    to: tokenAddress,
    data: transferCalldata,
    authorization, // Atomic execution
  };
}
```

### Important Notes

1. **Authorization Signing**: `to7702SimpleSmartAccount` creates the account but doesn't auto-sign authorization. You must explicitly call `owner.signAuthorization()`.

2. **EOA Nonce**: Use the EOA's transaction nonce (`getTransactionCount`), not the smart account nonce.

3. **One-Time Authorization**: Authorization is only required on the first transaction. Subsequent transactions don't need it as the smart account code persists on-chain.

4. **Atomic Execution**: The bundler ensures both EIP-7702 delegation and the UserOperation execute in a single transaction.

## Verification

All transactions can be verified on Sepolia Etherscan:

**Deployed Contracts:**
- TestToken: [`0x8ccaf35f0d2906cdec896909dcb1654b56501652`](https://sepolia.etherscan.io/address/0x8ccaf35f0d2906cdec896909dcb1654b56501652)
- Smart Account: [`0x1CCE1f2797240368154a3C9FA5A18072545df508`](https://sepolia.etherscan.io/address/0x1CCE1f2797240368154a3C9FA5A18072545df508)

**Example Transactions:**
- Atomic (7702 + Transfer): [`0x035c...cf1d1`](https://sepolia.etherscan.io/tx/0x035c365270c98bc32f32783d44bd3e58032b6851b4743bc750da109210ccf1d1)
- Subsequent Transfer: [`0xe17e...4fee9`](https://sepolia.etherscan.io/tx/0xe17e1bd919bbf1f5e30dfe57b125169c78992e87a7fd8c1b67521ccdb174fee9)

## Development

### Type Checking

```bash
npm run type-check
```

### Building

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

## Troubleshooting

### Common Issues

**Error: "Invalid EIP-7702 authorization"**
- Ensure you're properly signing the authorization with `owner.signAuthorization()`
- Verify you're using the EOA transaction nonce, not smart account nonce
- Confirm authorization is only passed on the first transaction

**Error: "Insufficient funds"**
- Ensure your EOA has sufficient Sepolia ETH for gas fees
- Check balance with: `npm run check-aa`

**Error: "Token transfer failed"**
- Verify the smart account has token balance: `npm run check-balances`
- Ensure the receiver address is valid
- Check the token contract is deployed: `npm run deploy-token`

## References

- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Pimlico EIP-7702 Documentation](https://docs.pimlico.io/permissionless/how-to/accounts/use-eip7702-simple-account)
- [Alto Bundler Repository](https://github.com/pimlicolabs/alto-bundler)
- [Eth-Infinitism Account Abstraction](https://github.com/eth-infinitism/account-abstraction)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Viem Documentation](https://viem.sh)

## Security Considerations

- **Private Keys**: Never commit private keys to version control. Use `.env` files and keep them in `.gitignore`.
- **Testnet Only**: This implementation is for Sepolia testnet. Additional security measures are required for mainnet deployment.
- **Authorization Security**: EIP-7702 authorization allows code delegation. Only delegate to trusted, audited contracts.
- **Gas Management**: Monitor gas costs and implement appropriate limits for production use.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [Pimlico](https://pimlico.io) for the permissionless SDK and Alto bundler
- [Eth-Infinitism](https://github.com/eth-infinitism) for the SimpleAccount implementation
- The Ethereum Foundation for EIP-7702 and ERC-4337 specifications

## Contact

For questions or support, please open an issue in the GitHub repository.

---

**Built with ❤️ for the Ethereum ecosystem**
