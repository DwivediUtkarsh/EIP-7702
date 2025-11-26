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
  console.log('   • With to7702SimpleSmartAccount, these addresses are the SAME');
  console.log('   • EIP-7702 sets the EOA\'s code to SimpleAccount implementation');
  console.log('   • The EOA address gains smart account capabilities');
  console.log('   • All funds (ETH/tokens) remain at this single address');
  console.log('   • Authorization enables smart account features on first transaction');
  console.log('   • Subsequent transactions use the enabled smart account features\n');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

