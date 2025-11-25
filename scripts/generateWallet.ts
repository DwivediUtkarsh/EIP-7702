#!/usr/bin/env tsx
/**
 * Wallet Generation Utility
 * 
 * Generates a new Ethereum wallet with cryptographically secure randomness.
 * Outputs private key and address for use in testing/development.
 * 
 * @security Private keys must never be committed to version control
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

console.log('🔐 Generating new Ethereum wallet...\n');

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('✅ Wallet generated successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📝 SAVE THESE DETAILS SECURELY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🔑 Private Key:');
console.log(privateKey);
console.log('\n📧 Address:');
console.log(account.address);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('⚠️  IMPORTANT:');
console.log('1. Add to .env: PRIVATE_KEY=' + privateKey);
console.log('2. Add to .env: RECEIVER_ADDRESS=' + account.address + ' (or use different address)');
console.log('3. Fund with Sepolia ETH:');
console.log('   • https://sepoliafaucet.com/');
console.log('   • https://www.alchemy.com/faucets/ethereum-sepolia');
console.log('\n⚠️  NEVER share private key or commit to git!\n');

