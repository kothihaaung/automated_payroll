'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePayroll } from '@/hooks/usePayroll';
import * as anchor from '@coral-xyz/anchor';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Users, Send, Plus, Loader2, RotateCcw } from 'lucide-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { AlertModal } from './AlertModal';

export const EmployerDashboard = () => {
    const { program, wallet, connection, getVaultPda, getPayrollPda, getEmployeePda, saveIdentity, resetSession } = usePayroll();
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [personalBalance, setPersonalBalance] = useState<number | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
    const [budget, setBudget] = useState<number | null>(null);
    const [pendingRandomEmployee, setPendingRandomEmployee] = useState<anchor.web3.Keypair | null>(null);

    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
    const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
    const [timeOffset, setTimeOffset] = useState(0);

    // Sync with Cluster Time
    useEffect(() => {
        const syncTime = async () => {
            if (!connection) return;
            try {
                const slot = await connection.getSlot();
                const clusterTime = await connection.getBlockTime(slot);
                if (clusterTime) {
                    const localTime = Math.floor(Date.now() / 1000);
                    setTimeOffset(clusterTime - localTime);
                    console.log("Cluster Time Sync Offset:", clusterTime - localTime);
                }
            } catch (e) {
                console.error("Time sync failed:", e);
            }
        };
        syncTime();
        const interval = setInterval(syncTime, 30000); // Sync every 30s
        return () => clearInterval(interval);
    }, [connection]);

    // Timer to update progress bars in real-time
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000) + timeOffset);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeOffset]);

    const refreshData = useCallback(async () => {
        if (!program || !wallet || !connection) return;

        try {
            const vaultPda = getVaultPda(wallet.publicKey);
            const vBalance = await connection.getBalance(vaultPda);
            setVaultBalance(vBalance / LAMPORTS_PER_SOL);

            const pBalance = await connection.getBalance(wallet.publicKey);
            setPersonalBalance(pBalance / LAMPORTS_PER_SOL);

            const payrollPda = getPayrollPda(wallet.publicKey);
            try {
                const config = await (program.account as any).payrollConfig.fetch(payrollPda);
                setIsInitialized(true);
                setBudget(config.totalBudget.toNumber() / LAMPORTS_PER_SOL);
            } catch (e) {
                setIsInitialized(false);
            }

            // Fetch all employee accounts for this employer
            const employeeAccounts = await (program.account as any).employee.all([
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
            
            setEmployees(employeeAccounts.map((acc: any) => ({
                publicKey: acc.publicKey,
                ...acc.account
            })));
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
        } finally {
            setLoading(false);
        }
    }, [program, wallet, connection, getVaultPda, getPayrollPda]);

    useEffect(() => {
        refreshData();
    }, [refreshData, wallet?.publicKey]);

    const fundVault = async () => {
        if (!wallet || !program || !connection) return;
        setActionLoading(true);
        try {
            // Check for gas funds
            const balance = await connection.getBalance(wallet.publicKey);
            if (balance < 1.1 * LAMPORTS_PER_SOL) {
                const airdropSig = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
                const latestBlockhash = await connection.getLatestBlockhash();
                await connection.confirmTransaction({
                    signature: airdropSig,
                    ...latestBlockhash
                });
            }

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
        } catch (err: any) {
            setAlertConfig({ isOpen: true, title: "Deposit Failed", message: err.message || err.toString() });
        } finally {
            setActionLoading(false);
        }
    };

    const initializePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet || !program || !connection) return;
        
        const form = e.target as HTMLFormElement;
        const totalBudget = parseFloat(form.totalBudget.value);

        setActionLoading(true);
        try {
            // Check if we need an airdrop first (only on local testnet)
            const balance = await connection.getBalance(wallet.publicKey);
            if (balance < 0.1 * LAMPORTS_PER_SOL) {
                console.log("Requesting airdrop for fresh wallet...");
                const airdropSig = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
                const latestBlockhash = await connection.getLatestBlockhash();
                await connection.confirmTransaction({
                    signature: airdropSig,
                    ...latestBlockhash
                });
            }

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
        } catch (err: any) {
            console.error("Initialization error:", err);
            setAlertConfig({ 
                isOpen: true, 
                title: "Initialization Failed", 
                message: err.message || "Ensure solana-test-validator is running and has enough funds." 
            });
        } finally {
            setActionLoading(false);
        }
    };

    const disbursePayment = async (employeeWalletStr: string) => {
        if (!wallet || !program || !connection) return;
        
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

    const addEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet || !program || !connection) return;
        
        const form = e.target as HTMLFormElement;
        const employeeWallet = form.employeeWallet.value;
        const salary = parseFloat(form.salary.value);
        const interval = parseInt(form.interval.value);

        setActionLoading(true);
        try {
            const employeeWalletPubkey = new PublicKey(employeeWallet);
            const employeePda = getEmployeePda(wallet.publicKey, employeeWalletPubkey);

            await (program.methods as any)
                .addEmployee(
                    new anchor.BN(Math.floor(salary * LAMPORTS_PER_SOL)),
                    new anchor.BN(interval * 60) // Convert minutes to seconds
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
            setAlertConfig({ isOpen: true, title: "Registration Failed", message: err.message || err.toString() });
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
            <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} title={alertConfig.title} message={alertConfig.message} />
        </div>
    );

    return (
        <div className="space-y-8 w-full">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Vault Balance</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{vaultBalance !== null ? vaultBalance.toFixed(2) : '--'}</span>
                        <span className="text-secondary font-bold mb-1">SOL</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex justify-between items-start"
                >
                    <div>
                        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">My Wallet Balance</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-bold text-white">{personalBalance !== null ? personalBalance.toFixed(2) : '--'}</span>
                            <span className="text-secondary font-bold mb-1">SOL</span>
                        </div>
                    </div>
                    <button 
                        onClick={async () => {
                            if (!wallet || !connection) return;
                            setActionLoading(true);
                            try {
                                const sig = await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
                                await connection.confirmTransaction(sig);
                                await refreshData();
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setActionLoading(false);
                            }
                        }}
                        disabled={actionLoading}
                        className="text-[10px] px-2 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded hover:bg-secondary/20 transition-all font-bold uppercase tracking-tighter"
                    >
                        {actionLoading ? '...' : 'Refill SOL'}
                    </button>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Allocated Budget</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{budget !== null ? budget.toFixed(2) : '--'}</span>
                        <span className="text-secondary font-bold mb-1">SOL</span>
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
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Interval (min)</label>
                                    <input 
                                        name="interval"
                                        type="number"
                                        placeholder="5"
                                        className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                                        defaultValue="5"
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
                                {employees.map((emp, idx) => {
                                    const lastPaid = emp.lastPaid.toNumber();
                                    const interval = emp.interval.toNumber();
                                    const timeElapsed = currentTime - lastPaid;
                                    const progress = Math.min(100, Math.max(0, (timeElapsed / interval) * 100));
                                    
                                    // Increased buffer to 20s for local testnet stability
                                    const isDue = timeElapsed >= (interval + 20); 
                                    const isVeryClose = timeElapsed >= interval && !isDue;

                                    return (
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
                                                        {emp.salary.toNumber() / LAMPORTS_PER_SOL} SOL <span className="text-gray-500 font-normal text-sm">/ {Math.floor(interval / 60)} min</span>
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                                <div className="flex justify-between w-full sm:w-32 items-center mb-1">
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                                                        {isDue ? 'Eligible' : isVeryClose ? 'Syncing...' : 'Accruing'}
                                                    </span>
                                                    <span className={`text-[10px] font-mono ${isDue ? 'text-green-400' : isVeryClose ? 'text-yellow-500' : 'text-primary'}`}>
                                                        {Math.floor(progress)}%
                                                    </span>
                                                </div>
                                                <div className="w-full sm:w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1, ease: "linear" }}
                                                        className={`h-full ${isDue ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : isVeryClose ? 'bg-yellow-500' : 'bg-primary'}`}
                                                    />
                                                </div>
                                                {isDue ? (
                                                    <button 
                                                        onClick={() => disbursePayment(emp.wallet.toBase58())}
                                                        disabled={actionLoading}
                                                        className="mt-2 w-full sm:w-auto text-xs px-4 py-1.5 font-semibold bg-white text-black hover:bg-gray-200 rounded shadow-[0_4px_14px_0_rgba(255,255,255,0.1)] transition-all active:scale-95"
                                                    >
                                                        Disburse
                                                    </button>
                                                ) : (
                                                    <div className="mt-2 text-[10px] text-gray-500 font-bold px-4 py-1.5 bg-gray-900 border border-gray-800 rounded uppercase tracking-wider">
                                                        {isVeryClose ? 'Finalizing...' : 'Waiting for cycle'}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
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
            <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} title={alertConfig.title} message={alertConfig.message} />

            {/* Danger Zone */}
            <div className="mt-12 pt-8 border-t border-red-900/30">
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h4 className="text-red-400 font-bold mb-1 flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Danger Zone
                        </h4>
                        <p className="text-red-400/60 text-xs">Resetting the session will clear your local identities and require a fresh payroll initialization.</p>
                    </div>
                    <button 
                        onClick={resetSession}
                        className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm font-bold transition-all active:scale-95 whitespace-nowrap"
                    >
                        Complete Reset
                    </button>
                </div>
            </div>
        </div>
    );
};
