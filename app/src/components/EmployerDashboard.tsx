'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePayroll } from '@/hooks/usePayroll';
import * as anchor from '@coral-xyz/anchor';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Users, Send, Plus, Loader2 } from 'lucide-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const EmployerDashboard = () => {
    const { program, wallet, connection, getVaultPda, getPayrollPda, saveIdentity } = usePayroll();
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
    const [budget, setBudget] = useState<number | null>(null);
    const [pendingRandomEmployee, setPendingRandomEmployee] = useState<anchor.web3.Keypair | null>(null);

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
                    dataSize: 97 // 8 + 32 + 32 + 8 + 8 + 8 + 1
                },
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
            
            const latestBlockhash = await connection.getLatestBlockhash();
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.feePayer = wallet.publicKey;

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
            const employeeWalletPubkey = new PublicKey(employeeWallet);
            const employeePda = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("employee"), wallet.publicKey.toBuffer(), employeeWalletPubkey.toBuffer()],
                program.programId
            )[0];

            await program.methods
                .addEmployee(
                    new anchor.BN(Math.floor(salary * LAMPORTS_PER_SOL)),
                    new anchor.BN(interval)
                )
                .accounts({
                    employer: wallet.publicKey,
                    employeeWallet: employeeWalletPubkey,
                    employeePda: employeePda,
                })
                .rpc();
            
            // Save to keychain if it was a generated random keypair
            if (pendingRandomEmployee && pendingRandomEmployee.publicKey.toBase58() === employeeWallet) {
                saveIdentity(pendingRandomEmployee, `Employee ${employees.length + 1}`);
                setPendingRandomEmployee(null);
            }

            form.reset();
            await refreshData();
        } catch (err: any) {
            console.error("Error adding employee:", err);
            alert("Error adding employee: " + (err.message || err.toString()));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || isInitialized === null) return (
        <div className="flex justify-center items-center h-64 w-full">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    if (!isInitialized) return (
        <div className="max-w-md mx-auto mt-12 bg-gray-900 border border-gray-800 rounded-xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3 text-white">Initialize Payroll</h2>
            <p className="text-gray-400 mb-8 text-sm">Deploy your smart contract configuration by setting an initial total budget.</p>
            <form onSubmit={initializePayroll} className="space-y-5">
                <div className="text-left">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Budget (SOL)</label>
                    <input 
                        name="totalBudget"
                        type="number"
                        step="0.1"
                        placeholder="e.g. 100"
                        className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        required
                    />
                </div>
                <button 
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Deploy Contract'}
                </button>
            </form>
        </div>
    );

    return (
        <div className="space-y-8 w-full">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Vault Balance</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{vaultBalance?.toFixed(2)}</span>
                        <span className="text-primary font-bold mb-1">SOL</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Budget</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{budget?.toFixed(2)}</span>
                        <span className="text-secondary font-bold mb-1">SOL</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Active Employees</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{employees.length}</span>
                        <span className="text-gray-500 font-bold mb-1">Users</span>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Actions */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Fund Vault Card */}
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-6"
                    >
                        <h3 className="text-lg font-bold text-white mb-4">Fund Treasury</h3>
                        <p className="text-gray-400 text-sm mb-6">Transfer SOL from your local wallet to the smart contract vault.</p>
                        <button 
                            onClick={fundVault}
                            disabled={actionLoading}
                            className="w-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-black font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Deposit 1 SOL
                        </button>
                    </motion.div>

                    {/* Add Employee Form Card */}
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-6"
                    >
                        <h3 className="text-lg font-bold text-white mb-4">Register Employee</h3>
                        <form id="add-employee-form" onSubmit={addEmployee} className="space-y-4">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Wallet Address</label>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const kp = anchor.web3.Keypair.generate();
                                                setPendingRandomEmployee(kp);
                                                const form = document.getElementById('add-employee-form') as HTMLFormElement;
                                                if (form) form.employeeWallet.value = kp.publicKey.toBase58();
                                            }}
                                            className="text-[10px] bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 px-2 py-0.5 rounded transition-colors"
                                        >
                                            Random
                                        </button>
                                    </div>
                                </div>
                                <input 
                                    id="employeeWallet"
                                    name="employeeWallet"
                                    placeholder="Enter public key..."
                                    className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all font-mono"
                                    required
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Salary (SOL)</label>
                                    <input 
                                        name="salary"
                                        type="number"
                                        step="0.1"
                                        placeholder="0.0"
                                        className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Interval (s)</label>
                                    <input 
                                        name="interval"
                                        type="number"
                                        placeholder="30"
                                        className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                                        defaultValue="30"
                                        required
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={actionLoading}
                                className="w-full bg-white text-black hover:bg-gray-200 font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Add to Payroll
                            </button>
                        </form>
                    </motion.div>
                </div>

                {/* Right Column: Employee List */}
                <div className="lg:col-span-2">
                    <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden h-full flex flex-col"
                    >
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                            <h2 className="text-xl font-bold text-white">Employee Roster</h2>
                        </div>


                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            <AnimatePresence>
                                {employees.map((emp, idx) => (
                                    <motion.div 
                                        key={emp.publicKey.toBase58()}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-black border border-gray-800 hover:border-gray-600 transition-colors gap-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center shrink-0 text-gray-400">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-mono text-xs text-gray-500 mb-1">
                                                    {emp.wallet.toBase58().slice(0, 16)}...
                                                </p>
                                                <p className="font-semibold text-white">
                                                    {emp.salary.toNumber() / LAMPORTS_PER_SOL} SOL <span className="text-gray-500 font-normal text-sm">/ {emp.interval.toNumber()}s</span>
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                            <div className="flex justify-between w-full sm:w-32 items-center mb-1">
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Progress</span>
                                                <span className="text-[10px] font-mono text-white">
                                                    {Math.floor(Math.min(100, Math.max(0, (Math.floor(Date.now() / 1000) - emp.lastPaid.toNumber()) / emp.interval.toNumber() * 100)))}%
                                                </span>
                                            </div>
                                            <div className="w-full sm:w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, Math.max(0, (Math.floor(Date.now() / 1000) - emp.lastPaid.toNumber()) / emp.interval.toNumber() * 100))}%` }}
                                                    className={`h-full ${((Math.floor(Date.now() / 1000) - emp.lastPaid.toNumber()) / emp.interval.toNumber() * 100) >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => disbursePayment(emp.wallet.toBase58())}
                                                disabled={actionLoading || ((Math.floor(Date.now() / 1000) - emp.lastPaid.toNumber()) / emp.interval.toNumber() * 100) < 100}
                                                className="mt-2 w-full sm:w-auto text-xs px-4 py-1.5 font-semibold bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 rounded transition-colors"
                                            >
                                                Disburse
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            
                            {employees.length === 0 && (
                                <div className="text-center py-16 text-gray-500 flex flex-col items-center gap-3">
                                    <Users className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">No employees found. Register one to begin.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
