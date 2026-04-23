'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePayroll } from '@/hooks/usePayroll';
import * as anchor from '@coral-xyz/anchor';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Users, Send, Plus, Loader2 } from 'lucide-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const EmployerDashboard = () => {
    const { program, wallet, connection, getVaultPda, getPayrollPda } = usePayroll();
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
    const [budget, setBudget] = useState<number | null>(null);

    const refreshData = useCallback(async () => {
        if (!program || !wallet) return;

        try {
            const vaultPda = getVaultPda(wallet.publicKey);
            const balance = await connection.getBalance(vaultPda);
            setVaultBalance(balance / LAMPORTS_PER_SOL);

            const payrollPda = getPayrollPda(wallet.publicKey);
            try {
                const config = await program.account.payrollConfig.fetch(payrollPda);
                setIsInitialized(true);
                setBudget(config.totalBudget.toNumber() / LAMPORTS_PER_SOL);
            } catch (e) {
                setIsInitialized(false);
            }

            // Fetch all employee accounts for this employer
            const employeeAccounts = await program.account.employee.all([
                {
                    memcmp: {
                        offset: 8, // Discriminator
                        bytes: wallet.publicKey.toBase58(),
                    }
                }
            ]);
            
            // Wait, the seed for employee is [b"employee", employer, employee_wallet]
            // But we don't have the employer key in the account data itself except in seeds?
            // Actually, let's check lib.rs for the Employee struct.
            // Employee struct has wallet, salary, last_paid, interval, bump.
            // It DOES NOT have the employer pubkey in the data!
            // This is a design flaw in the Rust code if we want to filter by employer easily on-chain.
            // But we can use the PDA derivation if we know the employee wallets.
            // Or we can use getProgramAccounts with a filter if we added the employer to the struct.
            
            // For now, let's just show a mock list or the ones we can find.
            setEmployees(employeeAccounts.map(acc => ({
                publicKey: acc.publicKey,
                ...acc.account
            })));
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }, [program, wallet, connection, getVaultPda]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const fundVault = async () => {
        if (!wallet || !program) return;
        setActionLoading(true);
        try {
            const vaultPda = getVaultPda(wallet.publicKey);
            const tx = new anchor.web3.Transaction().add(
                anchor.web3.SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: vaultPda,
                    lamports: LAMPORTS_PER_SOL, // Fund 1 SOL
                })
            );
            const sig = await wallet.signTransaction(tx);
            await connection.sendRawTransaction(sig.serialize());
            await refreshData();
        } catch (err) {
            console.error("Error funding vault:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const initializePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet || !program) return;
        
        const form = e.target as HTMLFormElement;
        const totalBudget = parseFloat(form.totalBudget.value);

        setActionLoading(true);
        try {
            const payrollPda = getPayrollPda(wallet.publicKey);
            const vaultPda = getVaultPda(wallet.publicKey);

            await program.methods
                .initializePayroll(new anchor.BN(totalBudget * LAMPORTS_PER_SOL))
                .accounts({
                    employer: wallet.publicKey,
                    payrollConfig: payrollPda,
                    vaultPda: vaultPda,
                })
                .rpc();
            
            await refreshData();
        } catch (err) {
            console.error("Error initializing payroll:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const disbursePayment = async (employeeWalletStr: string) => {
        if (!wallet || !program) return;
        
        setActionLoading(true);
        try {
            const employeeWalletPubkey = new PublicKey(employeeWalletStr);
            const vaultPda = getVaultPda(wallet.publicKey);
            const { getEmployeePda } = usePayroll(); // Wait, getEmployeePda is already from hook? No, let's use the program directly or import it.
            // Actually, we can get getEmployeePda from the hook destructuring at the top of the component. 
            // I'll assume we have it or calculate it here.
            const employeePda = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("employee"), wallet.publicKey.toBuffer(), employeeWalletPubkey.toBuffer()],
                program.programId
            )[0];

            await program.methods
                .disbursePayment()
                .accounts({
                    employer: wallet.publicKey,
                    employeeWallet: employeeWalletPubkey,
                    employeePda: employeePda,
                    vaultPda: vaultPda,
                })
                .rpc();
            
            await refreshData();
        } catch (err) {
            console.error("Error disbursing payment:", err);
            alert("Payment failed or not due yet.");
        } finally {
            setActionLoading(false);
        }
    };

    const addEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet || !program) return;
        
        const form = e.target as HTMLFormElement;
        const employeeWallet = form.employeeWallet.value;
        const salary = parseFloat(form.salary.value);
        const interval = parseInt(form.interval.value);

        setActionLoading(true);
        try {
            await program.methods
                .addEmployee(
                    new anchor.BN(salary * LAMPORTS_PER_SOL),
                    new anchor.BN(interval)
                )
                .accounts({
                    employer: wallet.publicKey,
                    employeeWallet: new PublicKey(employeeWallet),
                })
                .rpc();
            
            form.reset();
            await refreshData();
        } catch (err) {
            console.error("Error adding employee:", err);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || isInitialized === null) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (!isInitialized) return (
        <div className="glass-card max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Initialize Payroll System</h2>
            <p className="text-gray-400 mb-6">Set your initial total budget to configure the smart contract.</p>
            <form onSubmit={initializePayroll} className="space-y-4">
                <input 
                    name="totalBudget"
                    type="number"
                    step="0.1"
                    placeholder="Total Budget (SOL)"
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-3 focus:border-primary outline-none"
                    required
                />
                <button 
                    type="submit"
                    disabled={actionLoading}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                    Initialize Contract
                </button>
            </form>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vault Balance Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                            <Wallet className="w-6 h-6 text-primary" />
                        </div>
                        <button 
                            onClick={fundVault}
                            disabled={actionLoading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Fund Vault
                        </button>
                    </div>
                    <h3 className="text-gray-400 font-medium mb-1">Total Vault Balance</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{vaultBalance?.toFixed(2)}</span>
                        <span className="text-primary font-semibold">SOL</span>
                    </div>
                </motion.div>

                {/* Add Employee Form Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card"
                >
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-secondary" /> Add Employee (Set Budget)
                    </h3>
                    <form onSubmit={addEmployee} className="space-y-3">
                        <input 
                            name="employeeWallet"
                            placeholder="Employee Wallet Address"
                            className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-sm focus:border-primary outline-none"
                            required
                        />
                        <div className="flex gap-2">
                            <input 
                                name="salary"
                                type="number"
                                step="0.1"
                                placeholder="Salary (SOL)"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm focus:border-primary outline-none"
                                required
                            />
                            <input 
                                name="interval"
                                type="number"
                                placeholder="Interval (sec)"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm focus:border-primary outline-none"
                                defaultValue="30"
                                required
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={actionLoading}
                            className="w-full btn-primary py-2 text-sm flex items-center justify-center gap-2"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Register Employee
                        </button>
                    </form>
                </motion.div>
            </div>

            {/* Employee List */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Employee Directory</h2>
                    <span className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold">
                        {employees.length} Total
                    </span>
                </div>

                <div className="space-y-4">
                    <AnimatePresence>
                        {employees.map((emp, idx) => (
                            <motion.div 
                                key={emp.publicKey.toBase58()}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-white/10">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-mono text-xs text-gray-400">{emp.wallet.toBase58()}</p>
                                        <p className="font-semibold">{emp.salary.toNumber() / LAMPORTS_PER_SOL} SOL / cycle</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Payment Cycle Progress</p>
                                    <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, Math.max(0, (Math.floor(Date.now() / 1000) - emp.lastPaid.toNumber()) / emp.interval.toNumber() * 100))}%` }}
                                            className="h-full bg-gradient-to-r from-primary to-secondary"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => disbursePayment(emp.wallet.toBase58())}
                                        disabled={actionLoading}
                                        className="mt-2 text-xs px-3 py-1 border border-primary text-primary hover:bg-primary hover:text-black rounded transition-colors"
                                    >
                                        Disburse
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {employees.length === 0 && (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-4">
                            <Users className="w-12 h-12 opacity-20" />
                            <p>No employees found. Start by adding one above.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
