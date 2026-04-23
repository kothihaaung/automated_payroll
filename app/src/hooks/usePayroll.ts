'use client';

import { useState, useEffect, useCallback } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '../idl/automated_payroll.json';

const PROGRAM_ID = new PublicKey(idl.address || idl.metadata?.address);
// Use 127.0.0.1 for local validator to avoid IPv6 issues
const NETWORK = "http://127.0.0.1:8899"; 

export interface Identity {
    label: string;
    secretKeyBase64: string;
    publicKeyBase58: string;
}

export class LocalWallet implements anchor.Wallet {
    constructor(readonly payer: Keypair) {}

    get publicKey(): PublicKey {
        return this.payer.publicKey;
    }

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
}

export function usePayroll() {
    const [wallet, setWallet] = useState<LocalWallet | null>(null);
    const [program, setProgram] = useState<anchor.Program | null>(null);
    const [connection, setConnection] = useState<Connection | null>(null);
    const [identities, setIdentities] = useState<Identity[]>([]);

    const switchIdentity = useCallback((secretKeyBase64: string) => {
        const secretKey = Buffer.from(secretKeyBase64, 'base64');
        const keypair = Keypair.fromSecretKey(secretKey);
        const newWallet = new LocalWallet(keypair);
        setWallet(newWallet);
        localStorage.setItem('payroll_active_identity', secretKeyBase64);
        
        // Re-initialize program with new wallet provider
        if (connection) {
            const provider = new anchor.AnchorProvider(
                connection,
                newWallet as anchor.Wallet,
                { commitment: 'confirmed' }
            );
            anchor.setProvider(provider);
            const newProgram = new anchor.Program(idl as any, provider);
            setProgram(newProgram);
        }
    }, [connection]);

    const saveIdentity = useCallback((keypair: Keypair, label: string) => {
        const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
        const newIdentity: Identity = {
            label,
            secretKeyBase64,
            publicKeyBase58: keypair.publicKey.toBase58()
        };
        setIdentities(prev => {
            const exists = prev.some(id => id.publicKeyBase58 === newIdentity.publicKeyBase58);
            if (exists) return prev;
            const updated = [...prev, newIdentity];
            localStorage.setItem('payroll_identities', JSON.stringify(updated));
            return updated;
        });
    }, []);

    useEffect(() => {
        const setup = async () => {
            const conn = new Connection(NETWORK, "confirmed");
            setConnection(conn);

            // Load keychain
            const savedIdentitiesStr = localStorage.getItem('payroll_identities');
            let loadedIdentities: Identity[] = [];
            
            if (savedIdentitiesStr) {
                try {
                    loadedIdentities = JSON.parse(savedIdentitiesStr);
                } catch (e) {}
            }

            // Create Employer identity if it doesn't exist
            if (loadedIdentities.length === 0) {
                const employerKeypair = Keypair.generate();
                const secretKeyBase64 = Buffer.from(employerKeypair.secretKey).toString('base64');
                loadedIdentities = [{
                    label: "Employer",
                    secretKeyBase64,
                    publicKeyBase58: employerKeypair.publicKey.toBase58()
                }];
                localStorage.setItem('payroll_identities', JSON.stringify(loadedIdentities));
                localStorage.setItem('payroll_active_identity', secretKeyBase64);
            }
            setIdentities(loadedIdentities);

            // Get active identity
            let activeSecretKeyBase64 = localStorage.getItem('payroll_active_identity');
            if (!activeSecretKeyBase64 || !loadedIdentities.find(id => id.secretKeyBase64 === activeSecretKeyBase64)) {
                activeSecretKeyBase64 = loadedIdentities[0].secretKeyBase64;
                localStorage.setItem('payroll_active_identity', activeSecretKeyBase64);
            }

            const secretKey = Buffer.from(activeSecretKeyBase64, 'base64');
            const localKeypair = Keypair.fromSecretKey(secretKey);
            const localWallet = new LocalWallet(localKeypair);
            setWallet(localWallet);

            // Airdrop only if balance is low (to save time)
            try {
                const balance = await conn.getBalance(localKeypair.publicKey);
                if (balance < LAMPORTS_PER_SOL * 5) {
                    console.log("Airdropping 10 SOL to", localKeypair.publicKey.toBase58());
                    const sig = await conn.requestAirdrop(localKeypair.publicKey, 10 * LAMPORTS_PER_SOL);
                    await conn.confirmTransaction(sig);
                }
            } catch (err) {
                console.error("Airdrop failed:", err);
            }

            const provider = new anchor.AnchorProvider(
                conn,
                localWallet as anchor.Wallet,
                { commitment: 'confirmed' }
            );
            anchor.setProvider(provider);

            const program = new anchor.Program(idl as any, provider);
            setProgram(program);
        };

        setup();
    }, []);

    const getPayrollPda = useCallback((employerPubKey: PublicKey) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("payroll_config"), employerPubKey.toBuffer()],
            PROGRAM_ID
        )[0];
    }, []);

    const getVaultPda = useCallback((employerPubKey: PublicKey) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), employerPubKey.toBuffer()],
            PROGRAM_ID
        )[0];
    }, []);

    const getEmployeePda = useCallback((employerPubKey: PublicKey, employeePubKey: PublicKey) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("employee"), employerPubKey.toBuffer(), employeePubKey.toBuffer()],
            PROGRAM_ID
        )[0];
    }, []);

    return { 
        wallet, 
        program, 
        connection,
        identities,
        switchIdentity,
        saveIdentity,
        getVaultPda,
        getPayrollPda,
        getEmployeePda,
    };
};
