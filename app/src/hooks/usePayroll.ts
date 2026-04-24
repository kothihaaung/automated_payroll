'use client';

import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import idl from '../idl/automated_payroll.json';

const PROGRAM_ID = new PublicKey("FhyRNpsvvtY3HB1jtubTAJnWwkPrhWysHAcKS3SekXZs");
const NETWORK = "http://127.0.0.1:8899";

export class LocalWallet {
    constructor(public payer: Keypair) {}
    async signTransaction(tx: anchor.web3.Transaction): Promise<anchor.web3.Transaction> {
        tx.partialSign(this.payer);
        return tx;
    }
    async signAllTransactions(txs: anchor.web3.Transaction[]): Promise<anchor.web3.Transaction[]> {
        return txs.map((t) => {
            t.partialSign(this.payer);
            return t;
        });
    }
    get publicKey(): PublicKey {
        return this.payer.publicKey;
    }
}

export interface Identity {
    publicKeyBase58: string;
    secretKeyBase64: string;
    label: string;
}

export function usePayroll() {
    const [wallet, setWallet] = useState<LocalWallet | null>(null);
    const [program, setProgram] = useState<anchor.Program | null>(null);
    const [connection, setConnection] = useState<Connection | null>(null);
    const [identities, setIdentities] = useState<Identity[]>([]);

    const switchIdentity = useCallback((secretKeyBase64: string) => {
        try {
            if (!secretKeyBase64) return;
            const secretKey = Buffer.from(secretKeyBase64, 'base64');
            
            if (secretKey.length !== 64) {
                console.error("Invalid secret key size:", secretKey.length);
                localStorage.removeItem('payroll_active_identity');
                return;
            }

            const keypair = Keypair.fromSecretKey(secretKey);
            const newWallet = new LocalWallet(keypair);
            setWallet(newWallet);
            localStorage.setItem('payroll_active_identity', secretKeyBase64);

            if (connection) {
                const provider = new anchor.AnchorProvider(
                    connection,
                    newWallet as any,
                    { commitment: 'confirmed' }
                );
                anchor.setProvider(provider);
                const newProgram = new anchor.Program(idl as any, provider);
                setProgram(newProgram);
            }
        } catch (err) {
            console.error("Failed to switch identity:", err);
            localStorage.removeItem('payroll_active_identity');
        }
    }, [connection]);

    const saveIdentity = useCallback((keypair: Keypair, label: string) => {
        const secretBase64 = Buffer.from(keypair.secretKey).toString('base64');
        const newIdentity: Identity = {
            publicKeyBase58: keypair.publicKey.toBase58(),
            secretKeyBase64: secretBase64,
            label
        };

        setIdentities(prev => {
            const exists = prev.find(id => id.publicKeyBase58 === newIdentity.publicKeyBase58);
            if (exists) return prev;
            const updated = [...prev, newIdentity];
            localStorage.setItem('payroll_identities', JSON.stringify(updated));
            return updated;
        });
    }, []);

    useEffect(() => {
        const conn = new Connection(NETWORK, "confirmed");
        setConnection(conn);

        const savedIdentitiesStr = localStorage.getItem('payroll_identities');
        let currentIdentities: Identity[] = [];
        
        if (savedIdentitiesStr) {
            try {
                currentIdentities = JSON.parse(savedIdentitiesStr);
                setIdentities(currentIdentities);
            } catch (e) {
                console.error("Failed to parse identities", e);
            }
        }

        const activeId = localStorage.getItem('payroll_active_identity');
        
        if (activeId) {
            const secretKey = Buffer.from(activeId, 'base64');
            if (secretKey.length === 64) {
                const keypair = Keypair.fromSecretKey(secretKey);
                const newWallet = new LocalWallet(keypair);
                setWallet(newWallet);
                
                const provider = new anchor.AnchorProvider(conn, newWallet as any, { commitment: 'confirmed' });
                anchor.setProvider(provider);
                setProgram(new anchor.Program(idl as any, provider));
            } else {
                localStorage.removeItem('payroll_active_identity');
            }
        } else if (currentIdentities.length > 0) {
            switchIdentity(currentIdentities[0].secretKeyBase64);
        } else {
            const employerKp = Keypair.generate();
            const secretBase64 = Buffer.from(employerKp.secretKey).toString('base64');
            const newIdentity: Identity = {
                publicKeyBase58: employerKp.publicKey.toBase58(),
                secretKeyBase64: secretBase64,
                label: 'Employer'
            };
            setIdentities([newIdentity]);
            localStorage.setItem('payroll_identities', JSON.stringify([newIdentity]));
            localStorage.setItem('payroll_active_identity', secretBase64);

            const newWallet = new LocalWallet(employerKp);
            setWallet(newWallet);
            const provider = new anchor.AnchorProvider(conn, newWallet as any, { commitment: 'confirmed' });
            anchor.setProvider(provider);
            setProgram(new anchor.Program(idl as any, provider));
        }
    }, []);

    const resetSession = useCallback(() => {
        localStorage.clear();
        window.location.reload();
    }, []);

    const getVaultPda = (employer: PublicKey) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), employer.toBuffer()],
            PROGRAM_ID
        )[0];
    };

    const getPayrollPda = (employer: PublicKey) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("payroll_config"), employer.toBuffer()],
            PROGRAM_ID
        )[0];
    };

    const getEmployeePda = (employer: PublicKey, employee: PublicKey) => {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("employee"), employer.toBuffer(), employee.toBuffer()],
            PROGRAM_ID
        )[0];
    };

    return { 
        wallet, 
        program, 
        connection,
        identities,
        activeIdentity: identities.find(id => id.publicKeyBase58 === wallet?.publicKey.toBase58()),
        switchIdentity,
        saveIdentity,
        resetSession,
        getVaultPda,
        getPayrollPda,
        getEmployeePda,
    };
}
