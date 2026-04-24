'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePayroll } from '@/hooks/usePayroll';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Clock, Loader2, DollarSign } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

import { AlertModal } from './AlertModal';

export const EmployeeDashboard = () => {
    const { program, wallet, connection } = usePayroll();
    const [employeeRecords, setEmployeeRecords] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loggedHours, setLoggedHours] = useState<number>(0);
    const [isLogging, setIsLogging] = useState(false);
    
    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });

    const refreshData = useCallback(async () => {
        if (!program || !wallet || !connection) return;

        try {
            const balance = await connection.getBalance(wallet.publicKey);
            setWalletBalance(balance / LAMPORTS_PER_SOL);

            const accounts = await program.account.employee.all([
                {
                    dataSize: 97 
                },
                {
                    memcmp: {
                        offset: 40,
                        bytes: wallet.publicKey.toBase58(),
                    }
                }
            ]);
            
            setEmployeeRecords(accounts.map(acc => ({
                publicKey: acc.publicKey,
                ...acc.account
            })));

            // Load logged hours from local storage
            const savedHours = localStorage.getItem(`payroll_hours_${wallet.publicKey.toBase58()}`);
            if (savedHours) setLoggedHours(parseFloat(savedHours));

        } catch (err) {
            console.error("Error fetching employee data:", err);
        } finally {
            setLoading(false);
        }
    }, [program, wallet, connection]);

    useEffect(() => {
        refreshData();
    }, [refreshData, wallet?.publicKey]);

    const logHours = () => {
        setIsLogging(true);
        setTimeout(() => {
            const newHours = loggedHours + 1;
            setLoggedHours(newHours);
            localStorage.setItem(`payroll_hours_${wallet?.publicKey.toBase58()}`, newHours.toString());
            setIsLogging(false);
        }, 800);
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64 w-full">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-6 w-full">
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">My Balance</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{walletBalance !== null ? walletBalance.toFixed(2) : '--'}</span>
                        <span className="text-secondary font-bold mb-1 text-sm">SOL</span>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm"
                >
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Hours Logged</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">{loggedHours}</span>
                        <span className="text-primary font-bold mb-1 text-sm">HRS</span>
                    </div>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex items-center gap-4"
                >
                    <div className="w-10 h-10 bg-black border border-gray-800 rounded-full flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">Connected Address</h3>
                        <p className="font-mono text-xs text-white truncate max-w-[150px]">{wallet?.publicKey.toBase58()}</p>
                    </div>
                </motion.div>
            </div>

            {employeeRecords.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center py-24 text-center w-full">
                    <div className="w-20 h-20 bg-black border border-gray-800 rounded-full flex items-center justify-center mb-6">
                        <Wallet className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">No Employment Records</h3>
                    <p className="text-gray-400 max-w-md text-sm">Your connected wallet is not registered as an employee.</p>
                </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {employeeRecords.map((record, idx) => {
                        const salary = record.salary.toNumber() / LAMPORTS_PER_SOL;
                        const interval = record.interval.toNumber();
                        const lastPaid = record.lastPaid.toNumber();
                        
                        const now = Math.floor(Date.now() / 1000);
                        const timeElapsed = Math.max(0, now - lastPaid);
                        const progressPercent = Math.min(100, (timeElapsed / interval) * 100);
                        const isDue = timeElapsed >= interval;

                        return (
                            <div key={record.publicKey.toBase58()} className="space-y-6">
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col lg:flex-row justify-between items-stretch gap-8 shadow-xl"
                                >
                                    <div className="flex-1 space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                                <DollarSign className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Active Contract</p>
                                                <p className="font-mono text-sm text-gray-300">Employer: {record.employer.toBase58().slice(0, 12)}...</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Salary</p>
                                                <p className="text-2xl font-bold text-white">{salary} SOL</p>
                                            </div>
                                            <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Cycle</p>
                                                <p className="text-2xl font-bold text-white">{interval}s</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full lg:w-1/3 bg-black/40 p-6 rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-center">
                                        <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Payout Progress</h4>
                                        <div className="relative w-32 h-32 mb-4">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                                                <motion.circle 
                                                    cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                                    strokeDasharray="364.4"
                                                    initial={{ strokeDashoffset: 364.4 }}
                                                    animate={{ strokeDashoffset: 364.4 - (364.4 * progressPercent) / 100 }}
                                                    className={isDue ? "text-green-500" : "text-primary"}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                <span className="text-2xl font-bold text-white">{Math.floor(progressPercent)}%</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                            {isDue ? "Funds ready for disbursement" : "Accruing rewards..."}
                                        </p>
                                    </div>
                                </motion.div>

                                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                    <div className="p-6 border-b border-gray-800 bg-black/20 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-secondary" /> Activity Feed
                                        </h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            <div>
                                                <p className="text-sm text-gray-200">System generated progress snapshot</p>
                                                <p className="text-[10px] text-gray-500 font-mono">Just Now</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-start">
                                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                                            <div>
                                                <p className="text-sm text-gray-200">Last payment of {salary} SOL settled on-chain</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{new Date(lastPaid * 1000).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-2">Work Tracker</h3>
                        <p className="text-gray-400 text-xs mb-6 leading-relaxed">Log your contributions here to keep a record of your hours. This helps your employer verify your active status.</p>
                        <button 
                            onClick={logHours}
                            disabled={isLogging}
                            className="w-full py-4 bg-white text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Clock className="w-5 h-5" />}
                            LOG 1 HOUR
                        </button>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Quick Stats</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                                <span className="text-xs text-gray-400">Total Payouts</span>
                                <span className="text-sm font-bold text-white">14.00 SOL</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                                <span className="text-xs text-gray-400">Performance</span>
                                <span className="text-sm font-bold text-green-400">+12%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">Next Payment</span>
                                <span className="text-sm font-bold text-primary">In 4 days</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            <AlertModal 
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
            />
        </div>
    );
};
