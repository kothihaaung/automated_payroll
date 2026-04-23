'use client';

import { useEffect, useMemo, useState } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/automated_payroll.json';
import { AutomatedPayroll } from '../idl/automated_payroll';

export const usePayroll = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [program, setProgram] = useState<anchor.Program<AutomatedPayroll> | null>(null);

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
        getVaultPda,
        getPayrollPda,
        getEmployeePda,
    };
};
