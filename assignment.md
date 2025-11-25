# 🧩 Take-Home Assignment: Atomic EIP-7702 Authorization + UserOperation Execution using Alto Bundler

## 🧠 Objective

Demonstrate your ability to:
1. Use **EIP-7702 authorization** to convert an **Externally Owned Account (EOA)** into a **smart-contract wallet** in a single on-chain transaction.  
2. Construct and submit a **UserOperation** that performs a **simple ERC-20 token transfer**.  
3. Ensure both — the *EIP-7702 authorization* and *UserOperation execution* — happen **atomically within a single transaction**, relayed through a **Bundler** (preferably the open-source **Alto Bundler** by Pimlico).  
4. Implement this using the **EthInfinitism SimpleAccount** smart contract based on **EntryPoint v0.6**.  

---

## 🧱 Requirements

### 1. EIP-7702 Authorization

- Implement logic to create a valid `authorization` object as defined in [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702).  
- The authorization must:
  - Convert an EOA into a smart-contract wallet using **EthInfinitism’s SimpleAccount** (EntryPoint v0.6).  
  - Include required fields such as `address`, `nonce`, `signature`, `initCode`, and wallet deployment logic.  
  - Use the `authorization` field within the `UserOperation` to carry this payload.  

---

### 2. Smart-Contract Wallet Implementation

- Use the **EthInfinitism** implementation of **SimpleAccount** (EntryPoint v0.6).  
- Official open-source repository:  
  🔗 [https://github.com/eth-infinitism/account-abstraction](https://github.com/eth-infinitism/account-abstraction)  
- You may deploy EntryPoint v0.6 and SimpleAccount locally or use existing deployments on testnets such as **Sepolia** or **Holesky**.  
- No custom wallet logic is required — reuse the provided SimpleAccount contract.

---

### 3. UserOperation Construction

- Construct a `UserOperation` that performs a **simple ERC-20 token transfer** from the smart-contract wallet to another address.  
- Use a mock ERC-20 token if needed (e.g., a local deployment of an OpenZeppelin ERC-20).  
- The `UserOperation` must:
  - Include the EIP-7702 authorization.  
  - Target the deployed SimpleAccount wallet.  
  - Be executed through the **EntryPoint v0.6** contract.  

---

### 4. Bundler Submission

- Submit the `UserOperation` to a bundler — **Alto Bundler (Pimlico)** is the preferred implementation.  
  - Repository: [https://github.com/pimlicolabs/alto-bundler](https://github.com/pimlicolabs/alto-bundler)  
  - RPC endpoint: `eth_sendUserOperation` with EntryPoint v0.6 compatibility.  
- The bundler must:
  - Bundle both the **EIP-7702 authorization** and the **UserOperation**.  
  - Execute both **atomically in one transaction**.  
- Provide the resulting **transaction hash** and **proof** (explorer link or transaction logs) that both occurred within a single on-chain transaction.  

---

### 5. Verification Requirements

Demonstrate via transaction logs, console output, or block explorer that:
1. The smart-contract wallet was successfully deployed.  
2. The ERC-20 transfer succeeded.  
3. Both events occurred within the **same transaction** (single transaction hash).  

---

## 🧩 Deliverables

Provide a GitHub repository or ZIP containing:
