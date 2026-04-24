import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection } from '@solana/web3.js';
import idl from './target/idl/automated_payroll.json';

async function run() {
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    const programId = new PublicKey(idl.address);
    
    console.log("Fetching all accounts for program:", programId.toBase58());
    const accounts = await connection.getProgramAccounts(programId);
    
    console.log(`Found ${accounts.length} accounts.`);
    accounts.forEach((acc, i) => {
        console.log(`Account ${i}: ${acc.pubkey.toBase58()}`);
        console.log(`  Data length: ${acc.account.data.length}`);
    });
}
run().catch(console.error);
