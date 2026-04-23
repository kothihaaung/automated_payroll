'use client';

import { useEffect, useMemo, useState } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import idl from '../idl/automated_payroll.json';
import { AutomatedPayroll } from '../idl/automated_payroll';

// Simple NodeWallet equivalent for the browser
class LocalWallet {
    constructor(readonly payer: Keypair) {}
    async signTransaction<T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(tx: T): Promise<T> {
        if ('version' in tx) {
            tx.sign([this.payer]);
        } else {
            tx.partialSign(this.payer);
        }
        return tx;
    }
    async signAllTransactions<T extends anchor.web3.Transaction | anchor.web3.VersionedTransaction>(txs: T[]): Promise<T[]> {
        return txs.map((t) => {
            if ('version' in t) {
                t.sign([this.payer]);
            } else {
                t.partialSign(this.payer);
            }
            return t;
        });
    }
    get publicKey(): PublicKey {
        return this.payer.publicKey;
    }
}

export const usePayroll = () => {
    // Instantiate connection directly for local testnet, avoiding Context providers
    const connection = useMemo(() => new anchor.web3.Connection("http://127.0.0.1:8899", "processed"), []);
    
    // Instead of useAnchorWallet, we manage a local Keypair
    const [localKeypair, setLocalKeypair] = useState<Keypair | null>(null);
    const [program, setProgram] = useState<anchor.Program<AutomatedPayroll> | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const storedSecret = localStorage.getItem('mockWalletSecret');
        if (storedSecret) {
            const secretArray = new Uint8Array(JSON.parse(storedSecret));
            setLocalKeypair(Keypair.fromSecretKey(secretArray));
        }
    }, []);

    const generateNewIdentity = async () => {
        const newKp = Keypair.generate();
        localStorage.setItem('mockWalletSecret', JSON.stringify(Array.from(newKp.secretKey)));
        setLocalKeypair(newKp);
        
        // Auto-airdrop 10 SOL to the new identity
        try {
            const sig = await connection.requestAirdrop(newKp.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig);
            console.log("Airdropped 10 SOL to new identity:", newKp.publicKey.toBase58());
        } catch (e) {
            console.error("Failed to airdrop:", e);
        }
        
        return newKp;
    };
    
    const clearIdentity = () => {
        localStorage.removeItem('mockWalletSecret');
        setLocalKeypair(null);
    };

    const wallet = useMemo(() => localKeypair ? new LocalWallet(localKeypair) : null, [localKeypair]);

    useEffect(() => {
        if (wallet) {
            const provider = new anchor.AnchorProvider(connection, wallet, {
                preflightCommitment: 'processed',
            });
            const program = new anchor.Program(idl as any, provider);
            setProgram(program);
        }
    }, [wallet, connection]);

    const getVaultPda = (employerPubkey: PublicKey) => {
        return anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), employerPubkey.toBuffer()],
            program?.programId || new PublicKey("FhyRNpsvvtY3HB1jtubTAJnWwkPrhWysHAcKS3SekXZs")
        )[0];
    };

    const getPayrollPda = (employerPubkey: PublicKey) => {
        return anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("payroll_config"), employerPubkey.toBuffer()],
            program?.programId || new PublicKey("FhyRNpsvvtY3HB1jtubTAJnWwkPrhWysHAcKS3SekXZs")
        )[0];
    };

    const getEmployeePda = (employerPubkey: PublicKey, employeeWallet: PublicKey) => {
        return anchor.web3.PublicKey.findProgramAddressSync(
            [
                Buffer.from("employee"),
                employerPubkey.toBuffer(),
                employeeWallet.toBuffer()
            ],
            program?.programId || new PublicKey("FhyRNpsvvtY3HB1jtubTAJnWwkPrhWysHAcKS3SekXZs")
        )[0];
    };

    return {
        program,
        wallet,
        connection,
        generateNewIdentity,
        clearIdentity,
        getVaultPda,
        getPayrollPda,
        getEmployeePda,
    };
};
