import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import fs from 'fs';

async function run() {
    const idlStr = fs.readFileSync('target/idl/automated_payroll.json', 'utf8');
    const idl = JSON.parse(idlStr);
    
    // Create a mock wallet and connection
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    const payer = Keypair.generate();
    
    // Airdrop
    const sig = await connection.requestAirdrop(payer.publicKey, 2 * 1e9);
    await connection.confirmTransaction(sig);
    
    const wallet = new anchor.Wallet(payer);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    anchor.setProvider(provider);
    
    // @ts-ignore
    const program = new anchor.Program(idl, provider);
    
    // 1. Initialize
    console.log("Initializing payroll...");
    const [payrollPda] = PublicKey.findProgramAddressSync([Buffer.from("payroll_config"), payer.publicKey.toBuffer()], program.programId);
    const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), payer.publicKey.toBuffer()], program.programId);
    
    await program.methods.initializePayroll(new anchor.BN(100 * 1e9))
        .accounts({
            employer: payer.publicKey,
            payrollConfig: payrollPda,
            vaultPda: vaultPda,
        })
        .rpc();
        
    // 2. Add Employee
    const employeeWallet = Keypair.generate().publicKey;
    const [employeePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("employee"), payer.publicKey.toBuffer(), employeeWallet.toBuffer()],
        program.programId
    );
    console.log("Employee PDA:", employeePda.toBase58());
    
    console.log("Adding employee...");
    try {
        await program.methods.addEmployee(new anchor.BN(10 * 1e9), new anchor.BN(15))
            .accounts({
                employer: payer.publicKey,
                employeeWallet: employeeWallet,
            })
            .rpc();
        console.log("Success! Employee added.");
    } catch (e) {
        console.error("Error adding employee:", e);
    }
}
run().catch(console.error);
