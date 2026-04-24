'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePayroll } from '@/hooks/usePayroll';
import * as anchor from '@coral-xyz/anchor';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Users, Send, Plus, Loader2, RotateCcw, Trash2, DollarSign } from 'lucide-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { AlertModal } from './AlertModal';

export const EmployerDashboard = () => {
    const { program, wallet, connection, getVaultPda, getPayrollPda, getEmployeePda, saveIdentity, resetSession } = usePayroll();
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
    const [budget, setBudget] = useState<number | null>(null);
    const [pendingRandomEmployee, setPendingRandomEmployee] = useState<anchor.web3.Keypair | null>(null);
    
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });

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

            const employeeAccounts = await program.account.employee.all([
                { dataSize: 97 },
                {
                    memcmp: {
                        offset: 8,
                        bytes: wallet.publicKey.toBase58(),
                    }
                }
            ]);
            
            setEmployees(employeeAccounts.map(acc => ({
                publicKey: acc.publicKey,
                ...acc.account
            })));
        } catch (err) {
            console.error("Error fetching employer data:", err);
        } finally {
            setLoading(false);
        }
    }, [program, wallet, connection, getVaultPda, getPayrollPda]);

    useEffect(() => {
        refreshData();
    }, [refreshData, wallet?.publicKey]);

    const initializePayroll = async () => {
        if (!wallet || !program) return;
        setActionLoading(true);
        try {
            const payrollPda = getPayrollPda(wallet.publicKey);
            const vaultPda = getVaultPda(wallet.publicKey);

            await program.methods
                .initializePayroll(new anchor.BN(100 * LAMPORTS_PER_SOL))
                .accounts({
                    employer: wallet.publicKey,
                    payrollConfig: payrollPda,
                    vaultPda: vaultPda,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();
            
            await refreshData();
        } catch (err: any) {
            setAlertConfig({ isOpen: true, title: "Initialization Failed", message: err.message || err.toString() });
        } finally {
            setActionLoading(false);
        }
    };

    const fundVault = async (amount: number = 1) => {
        if (!wallet || !program) return;
        setActionLoading(true);
        try {
            const vaultPda = getVaultPda(wallet.publicKey);
            const tx = new anchor.web3.Transaction().add(
                anchor.web3.SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: vaultPda,
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            const sig = await wallet.signTransaction(tx);
            await connection.sendRawTransaction(sig.serialize());
            await refreshData();
        } catch (err: any) {
            setAlertConfig({ isOpen: true, title: "Deposit Failed", message: err.message || err.toString() });
        } finally {
            setActionLoading(false);
        }
    };

    const addEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!wallet || !program) return;
        
        const form = e.currentTarget;
        const employeeWallet = form.employeeWallet.value;
        const salary = parseFloat(form.salary.value);
        const interval = parseInt(form.interval.value);

        setActionLoading(true);
        try {
            const employeeWalletPubkey = new PublicKey(employeeWallet);
            const employeePda = getEmployeePda(wallet.publicKey, employeeWalletPubkey);

            await program.methods
                .addEmployee(
                    new anchor.BN(salary * LAMPORTS_PER_SOL),
                    new anchor.BN(interval)
                )
                .accounts({
                    employer: wallet.publicKey,
                    employeeWallet: employeeWalletPubkey,
                    employeePda: employeePda,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .rpc();

            if (pendingRandomEmployee && pendingRandomEmployee.publicKey.toBase58() === employeeWallet) {
                saveIdentity(pendingRandomEmployee, `Employee ${employees.length + 1}`);
                setPendingRandomEmployee(null);
            }
            
            form.reset();
            await refreshData();
        } catch (err: any) {
            setAlertConfig({ isOpen: true, title: "Registration Failed", message: err.message || err.toString() });
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
            const employeePda = getEmployeePda(wallet.publicKey, employeeWalletPubkey);

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
        } catch (err: any) {
            const msg = err.message || err.toString();
            if (msg.includes("PaymentNotDue")) {
                setAlertConfig({
                    isOpen: true,
                    title: "Payment Not Due",
                    message: "The smart contract rejected this payment because the time interval has not passed yet. Please wait for the progress bar to reach 100%."
                });
            } else {
                setAlertConfig({ isOpen: true, title: "Payment Failed", message: msg });
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64 w-full">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-8 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Vault Treasury</h3>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-bold text-white">{vaultBalance?.toFixed(2)}</span>
                                    <span className="text-primary font-bold mb-1">SOL</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={resetSession}
                            className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all group"
                            title="Reset Session"
                        >
                            <RotateCcw className="w-5 h-5 group-hover:rotate-[-180deg] transition-transform duration-500" />
                        </button>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-secondary/10 border border-secondary/20 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Active Employees</h3>
                            <p className="text-4xl font-bold text-white">{employees.length}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {isInitialized === false ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                    <h2 className="text-2xl font-bold mb-4">Initialize Payroll System</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">Create your on-chain contract to start managing employees.</p>
                    <button onClick={initializePayroll} className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-all">
                        Initialize System
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" /> Team Management
                        </h2>
                        {employees.length === 0 ? (
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
                                No employees found. Use the form to register your first team member.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {employees.map((emp) => (
                                    <EmployeeCard key={emp.publicKey.toBase58()} employee={emp} onDisburse={disbursePayment} isLoading={actionLoading} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold mb-6">Register New</h3>
                            <form onSubmit={addEmployee} className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Employee Wallet</label>
                                        <button 
                                            type="button" 
                                            onClick={() => setPendingRandomEmployee(anchor.web3.Keypair.generate())}
                                            className="text-[10px] text-primary hover:underline font-bold"
                                        >
                                            Generate Random
                                        </button>
                                    </div>
                                    <input name="employeeWallet" className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all font-mono" placeholder="Address..." defaultValue={pendingRandomEmployee?.publicKey.toBase58() || ''} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Salary (SOL)</label>
                                        <input name="salary" type="number" step="0.1" className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" placeholder="1.0" required />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Cycle (sec)</label>
                                        <input name="interval" type="number" className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none" placeholder="30" required />
                                    </div>
                                </div>
                                <button type="submit" disabled={actionLoading} className="w-full py-4 bg-secondary text-black font-black rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50">
                                    {actionLoading ? <Loader2 className="animate-spin mx-auto" /> : "ADD TO PAYROLL"}
                                </button>
                            </form>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Treasury Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => fundVault(1)} className="py-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl border border-gray-700 transition-all">DEPOSIT 1 SOL</button>
                                <button onClick={() => fundVault(5)} className="py-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl border border-gray-700 transition-all">DEPOSIT 5 SOL</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} title={alertConfig.title} message={alertConfig.message} />
        </div>
    );
};

const EmployeeCard = ({ employee, onDisburse, isLoading }: any) => {
    const salary = employee.salary.toNumber() / LAMPORTS_PER_SOL;
    const interval = employee.interval.toNumber();
    const lastPaid = employee.lastPaid.toNumber();
    const now = Math.floor(Date.now() / 1000);
    const timeElapsed = Math.max(0, now - lastPaid);
    const progressPercent = Math.min(100, (timeElapsed / interval) * 100);
    const isDue = timeElapsed >= interval;

    return (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg hover:border-gray-700 transition-all">
            <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-black border border-gray-800 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                    <p className="font-mono text-sm text-gray-300 mb-1">{employee.wallet.toBase58().slice(0, 8)}...{employee.wallet.toBase58().slice(-8)}</p>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-primary">{salary} SOL</span>
                        <span className="text-[10px] text-gray-500">Every {interval}s</span>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-48">
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-2">
                    <span>Progress</span>
                    <span>{Math.floor(progressPercent)}%</span>
                </div>
                <div className="h-2 bg-black rounded-full overflow-hidden border border-gray-800">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className={`h-full ${isDue ? 'bg-green-500' : 'bg-primary'}`} />
                </div>
            </div>

            <button 
                onClick={() => onDisburse(employee.wallet.toBase58())} 
                disabled={isLoading}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${isDue ? 'bg-green-500 text-black hover:scale-105 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}`}
            >
                {isDue ? 'DISBURSE' : 'WAITING'}
            </button>
        </motion.div>
    );
};
