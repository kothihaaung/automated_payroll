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
        await provider.connection.confirmTransaction(signature);

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
});