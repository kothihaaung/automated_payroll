'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePayroll } from '@/hooks/usePayroll';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Clock, Loader2, DollarSign } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const EmployeeDashboard = () => {
    const { program, wallet, connection } = usePayroll();
    const [employeeRecords, setEmployeeRecords] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshData = useCallback(async () => {
        if (!program || !wallet || !connection) return;

        try {
            // Fetch personal wallet balance
            const balance = await connection.getBalance(wallet.publicKey);
            setWalletBalance(balance / LAMPORTS_PER_SOL);

            // Fetch all employee accounts matching the connected wallet
            const accounts = await program.account.employee.all([
                {
                    dataSize: 97 // 8 + 32 + 32 + 8 + 8 + 8 + 1
                },
                {
                    memcmp: {
                        offset: 40, // 8 (discriminator) + 32 (employer pubkey)
                        bytes: wallet.publicKey.toBase58(),
                    }
                }
            ]);
            
            setEmployeeRecords(accounts.map(acc => ({
                publicKey: acc.publicKey,
                ...acc.account
            })));
        } catch (err) {
            console.error("Error fetching employee data:", err);
        } finally {
            setLoading(false);
        }
    }, [program, wallet, connection]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    if (loading) return (
        <div className="flex justify-center items-center h-64 w-full">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-6 w-full">
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">My Personal Wallet Balance</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{walletBalance !== null ? walletBalance.toFixed(2) : '--'}</span>
                        <span className="text-secondary font-bold mb-1">SOL</span>
                    </div>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-black border border-gray-800 rounded-full flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-1">Connected Address</h3>
                        <p className="font-mono text-sm text-white">{wallet?.publicKey.toBase58()}</p>
                    </div>
                </motion.div>
            </div>

            {employeeRecords.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center py-24 text-center w-full">
                    <div className="w-20 h-20 bg-black border border-gray-800 rounded-full flex items-center justify-center mb-6">
                        <Wallet className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">No Employment Records</h3>
                    <p className="text-gray-400 max-w-md text-sm">Your connected wallet is not registered as an employee in any active payroll on this testnet.</p>
                </div>
            ) : (
            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence>
                    {employeeRecords.map((record, idx) => {
                        const salary = record.salary.toNumber() / LAMPORTS_PER_SOL;
                        const interval = record.interval.toNumber();
                        const lastPaid = record.lastPaid.toNumber();
                        
                        // Calculate time elapsed
                        const now = Math.floor(Date.now() / 1000);
                        const timeElapsed = Math.max(0, now - lastPaid);
                        const progressPercent = Math.min(100, (timeElapsed / interval) * 100);
                        const isDue = timeElapsed >= interval;

                        return (
                            <motion.div 
                                key={record.publicKey.toBase58()}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-gray-900 border border-gray-800 rounded-xl p-6 lg:p-8 flex flex-col lg:flex-row justify-between items-stretch gap-8 shadow-sm"
                            >
                                <div className="flex-1 space-y-8 w-full">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
                                            <DollarSign className="w-8 h-8 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employer Address</p>
                                            <p className="font-mono text-sm text-gray-300 bg-black px-3 py-1.5 rounded-lg border border-gray-800 inline-block">{record.employer.toBase58()}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-black p-5 rounded-xl border border-gray-800">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Salary / Cycle</p>
                                            <p className="text-3xl font-bold text-white">{salary} <span className="text-sm font-normal text-gray-400">SOL</span></p>
                                        </div>
                                        <div className="bg-black p-5 rounded-xl border border-gray-800">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pay Interval</p>
                                            <p className="text-3xl font-bold text-white">{interval} <span className="text-sm font-normal text-gray-400">sec</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full lg:w-1/3 bg-black p-8 rounded-xl border border-gray-800 flex flex-col justify-center items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-6">
                                        <Clock className="w-8 h-8 text-secondary" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-6">Payment Status</h4>
                                    
                                    <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden mb-4 border border-gray-800">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercent}%` }}
                                            className={`h-full ${isDue ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-primary'}`}
                                        />
                                    </div>
                                    
                                    <p className="text-sm font-semibold">
                                        {isDue ? (
                                            <span className="text-green-400">Payment Due! Awaiting Employer</span>
                                        ) : (
                                            <span className="text-gray-400">{Math.floor(progressPercent)}% cycle completed</span>
                                        )}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
            )}
        </div>
    );
};
