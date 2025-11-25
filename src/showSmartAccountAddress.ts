#!/usr/bin/env tsx
/**
 * Account Address Display Utility
 * 
 * Displays EOA owner and derived EIP-7702 smart account addresses.
 * Useful for verification and funding accounts before deployment.
 */

import { getSimple7702Account } from './clients';
import { owner } from './owner';

async function main() {
  const simple7702Account = await getSimple7702Account();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Account Information');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💼 EOA Owner Address:');
  console.log(`   ${owner.address}\n`);
  
  console.log('🏦 Simple 7702 Smart Account Address:');
  console.log(`   ${simple7702Account.address}\n`);
  
  console.log('📝 Notes:');
  console.log('   • These are TWO SEPARATE addresses');
  console.log('   • EOA remains a regular EOA (not converted)');
  console.log('   • Smart account is a separate SimpleAccount contract');
  console.log('   • EOA controls smart account through signatures');
  console.log('   • Smart account address is deterministic (counterfactual)');
  console.log('   • Deployed on first UserOperation\n');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

