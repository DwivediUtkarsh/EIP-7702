# EIP-7702 Atomic UserOperation Execution

A production-ready implementation demonstrating atomic execution of EIP-7702 authorization with ERC-20 token transfers through Account Abstraction (ERC-4337) using the Alto bundler.

## Overview

This project implements the complete flow of using EIP-7702 to enable smart contract wallet capabilities on an Externally Owned Account (EOA), then executing an ERC-20 token transfer—all within a single atomic transaction on Sepolia testnet.

**Note**: The original assignment specified EntryPoint v0.6; this implementation uses EntryPoint v0.8 via Pimlico's infrastructure, which provides the latest features and is fully compatible with the core EIP-7702 functionality demonstrated here.

### Key Features

- **Atomic Execution**: EIP-7702 authorization and token transfer in one transaction
- **Account Abstraction**: Full ERC-4337 integration with EntryPoint v0.8
- **Production Ready**: TypeScript with strict mode, comprehensive error handling
- **Alto Bundler**: Integration with Pimlico's open-source bundler
- **Live on Sepolia**: Verified transactions on Ethereum testnet

## Live Demo

**Atomic Transaction Hash**: `0x146cfb030078d8fd63ba35aa9b91e9ce60dc6f3ec4c8278c91a56f2d7d7256f9`

[View on Etherscan →](https://sepolia.etherscan.io/tx/0x146cfb030078d8fd63ba35aa9b91e9ce60dc6f3ec4c8278c91a56f2d7d7256f9)

This transaction demonstrates:
- EIP-7702 authorization to enable smart account features
- EOA gains SimpleAccount capabilities at the same address
- ERC-20 token transfer (10 TTK)
- All executed atomically on Sepolia testnet

## Technical Architecture

```
┌──────────────────────────────────────────┐
│  EOA (Owner) @ 0xYourAddress             │
│  ↓ EIP-7702 authorization                │
│  EOA with SimpleAccount code (same addr) │  to7702SimpleSmartAccount
└───────────────┬──────────────────────────┘
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
│  (Sepolia)          │  • EIP-7702 processing sets EOA code
│                     │  • EntryPoint executes UserOperation
└─────────────────────┘

Note: EOA and Smart Account share the same address
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
- Enables smart account features on EOA
- Transfers 10 TTK tokens
- All in ONE transaction

**Subsequent Executions:**
- Only transfers tokens (no authorization needed)
- Smart account features already enabled

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

  // Send transaction with EIP-7702 authorization
  const hash = await smartAccountClient.sendTransaction({
    to: tokenAddress,
    data: transferCalldata,
    authorization, // EIP-7702: only on first tx
    value: 0n,
  });
}
```

### Important Notes

1. **Same Address**: With `to7702SimpleSmartAccount`, the EOA and smart account share the same address. EIP-7702 sets the EOA's code to point to SimpleAccount implementation.

2. **Authorization Signing**: `to7702SimpleSmartAccount` creates the account but doesn't auto-sign authorization. You must explicitly call `owner.signAuthorization()`.

3. **EOA Nonce**: Use the EOA's transaction nonce (`getTransactionCount`), not the smart account nonce.

4. **Authorization Pattern**: In this implementation, we only send an EIP-7702 authorization in the first transaction. The delegation remains valid until changed, so subsequent UserOperations don't include a new authorization.

5. **Atomic Execution**: The bundler ensures both EIP-7702 delegation and the UserOperation execute in a single transaction.

## Verification

All transactions can be verified on Sepolia Etherscan:

**Deployed Contracts:**
- TestToken: [`0x8ccaf35f0d2906cdec896909dcb1654b56501652`](https://sepolia.etherscan.io/address/0x8ccaf35f0d2906cdec896909dcb1654b56501652)
- EOA/Smart Account: [`0xE14227b225621B9aACf2fd60dcfdB9384747Be6E`](https://sepolia.etherscan.io/address/0xE14227b225621B9aACf2fd60dcfdB9384747Be6E) (same address)

**Example Transactions:**
- Atomic (7702 + Transfer): [`0x146c...56f9`](https://sepolia.etherscan.io/tx/0x146cfb030078d8fd63ba35aa9b91e9ce60dc6f3ec4c8278c91a56f2d7d7256f9)
- Subsequent Transfer: [`0xdeea...ca03`](https://sepolia.etherscan.io/tx/0xdeea242ccd43ad5e8373e8e9c88ecd0e7ca3f964eeb91d8e4b1258f39278ca03)

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
- **Authorization Security**: EIP-7702 authorization sets your EOA's code to the specified contract. Only delegate to trusted, audited contracts like Eth-Infinitism's SimpleAccount.
- **Address Reuse**: With `to7702SimpleSmartAccount`, your EOA address becomes the smart account address. All existing funds at that address remain accessible.
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
