import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AutomatedPayroll } from "../target/types/automated_payroll";
import { expect } from "chai";

describe("automated_payroll", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.AutomatedPayroll as Program<AutomatedPayroll>;

    it("Initializes the payroll config!", async () => {
        const employer = anchor.web3.Keypair.generate();

        // Airdrop SOL to the new employer
        const signature = await provider.connection.requestAirdrop(
            employer.publicKey,
            anchor.web3.LAMPORTS_PER_SOL
        );
        const latestBlockHash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: signature,
        });

        // 1. Derive the PDA (Program Derived Address)
        const [payrollPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("payroll_config"), employer.publicKey.toBuffer()],
            program.programId
        );

        const budget = new anchor.BN(5000);

        // 2. Execute the transaction
        await program.methods
            .initializePayroll(budget)
            .accounts({
                employer: employer.publicKey,
            })
            .signers([employer])
            .rpc();

        // 3. Fetch and Verify the data
        const account = await program.account.payrollConfig.fetch(payrollPda);

        expect(account.employer.toBase58()).to.equal(employer.publicKey.toBase58());
        expect(account.totalBudget.toString()).to.equal("5000");
        console.log("🚀 Payroll Config Initialized at:", payrollPda.toBase58());
    });

    it("Fails if the PDA seeds don't match the employer!", async () => {
        const employerA = anchor.web3.Keypair.generate();
        const employerB = anchor.web3.Keypair.generate();

        // Airdrop to employerB (the one who will try to sign)
        const sig = await provider.connection.requestAirdrop(
            employerB.publicKey,
            anchor.web3.LAMPORTS_PER_SOL
        );
        const latestBlockHash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: sig,
        });

        // Derive PDA for employerA (the incorrect one we'll try to use)
        const [pdaA] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("payroll_config"), employerA.publicKey.toBuffer()],
            program.programId
        );

        // Derive PDA for employerB's vault (needs to be passed in accountsStrict)
        const [vaultPdaB] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), employerB.publicKey.toBuffer()],
            program.programId
        );

        const budget = new anchor.BN(5000);

        try {
            // Attempt to initialize for employerB using employerA's PDA
            await program.methods
                .initializePayroll(budget)
                .accountsStrict({
                    employer: employerB.publicKey,
                    payrollConfig: pdaA, // Incorrect PDA for employerB
                    vaultPda: vaultPdaB,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([employerB])
                .rpc();

            expect.fail("The transaction should have failed but it succeeded!");
        } catch (error) {
            // Check logs or message for ConstraintSeeds
            const logs = error.logs ? error.logs.join("") : error.message;
            expect(logs).to.include("ConstraintSeeds");
            console.log("✅ Correctly rejected invalid PDA seeds!");
        }
    });

    it("Adds an employee successfully!", async () => {
        const employer = provider.wallet.publicKey;
        // Create a random keypair for a "New Employee"
        const employeeWallet = anchor.web3.Keypair.generate().publicKey;

        const [employeePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("employee"),
                employer.toBuffer(),
                employeeWallet.toBuffer()
            ],
            program.programId
        );

        const salary = new anchor.BN(500); // 500 units per interval
        const interval = new anchor.BN(60 * 60 * 24 * 30); // 30 days in seconds

        await program.methods
            .addEmployee(salary, interval)
            .accounts({
                employer: employer,
                employeeWallet: employeeWallet,
                // employeePda: employeePda, // Inferred
            })
            .rpc();

        const account = await program.account.employee.fetch(employeePda);
        expect(account.wallet.toBase58()).to.equal(employeeWallet.toBase58());
        expect(account.salary.toString()).to.equal("500");
        console.log("✅ Employee Account created at:", employeePda.toBase58());
    });

    it("Disburses payment correctly!", async () => {
        const employerKeypair = anchor.web3.Keypair.generate();
        const employer = employerKeypair.publicKey;

        // Airdrop SOL to the new employer
        const sig = await provider.connection.requestAirdrop(
            employer,
            5 * anchor.web3.LAMPORTS_PER_SOL
        );
        const latestBlockHash = await provider.connection.getLatestBlockhash();
        await provider.connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: sig,
        });

        const employeeKeypair = anchor.web3.Keypair.generate();
        const employeeWallet = employeeKeypair.publicKey;

        // 1. Add Employee with 0 interval for immediate testing
        const salary = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL); // 1 SOL
        const interval = new anchor.BN(0);

        const [employeePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("employee"),
                employer.toBuffer(),
                employeeWallet.toBuffer()
            ],
            program.programId
        );

        // 1. Initialize Payroll (This now creates the Vault PDA correctly)
        const budget = new anchor.BN(5000);
        await program.methods
            .initializePayroll(budget)
            .accounts({
                employer: employer,
            })
            .signers([employerKeypair])
            .rpc();

        // 2. Add Employee with 0 interval for immediate testing
        await program.methods
            .addEmployee(salary, interval)
            .accounts({
                employer: employer,
                employeeWallet: employeeWallet,
            })
            .signers([employerKeypair])
            .rpc();

        // 3. Derive and Fund the Vault PDA
        const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), employer.toBuffer()],
            program.programId
        );

        const fundTx = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.transfer({
                fromPubkey: employer,
                toPubkey: vaultPda,
                lamports: 2 * anchor.web3.LAMPORTS_PER_SOL,
            })
        );
        await anchor.web3.sendAndConfirmTransaction(
            provider.connection,
            fundTx,
            [employerKeypair]
        );

        // 3. Disburse Payment
        const initialBalance = await provider.connection.getBalance(employeeWallet);

        await program.methods
            .disbursePayment()
            .accounts({
                employeePda: employeePda,
                employeeWallet: employeeWallet,
                employer: employer,
            })
            .signers([employerKeypair])
            .rpc();

        // 4. Verify results
        const finalBalance = await provider.connection.getBalance(employeeWallet);
        expect(finalBalance).to.be.gt(initialBalance);
        console.log("✅ Payment disbursed! Employee received:", (finalBalance - initialBalance) / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    });
});