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
    
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
    const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

    // Timer to update progress bars in real-time
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const refreshData = useCallback(async () => {
        if (!program || !wallet || !connection) return;

        try {
            // Fetch personal wallet balance
            const balance = await connection.getBalance(wallet.publicKey);
            setWalletBalance(balance / LAMPORTS_PER_SOL);

            // Fetch all employee accounts matching the connected wallet
            const accounts = await (program.account as any).employee.all([
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
            
            setEmployeeRecords(accounts.map((acc: any) => ({
                publicKey: acc.publicKey,
                ...acc.account
            })));

            const savedHours = localStorage.getItem(`payroll_hours_${wallet.publicKey.toBase58()}`);
            if (savedHours) setLoggedHours(parseInt(savedHours));

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
                        const timeElapsed = Math.max(0, currentTime - lastPaid);
                        const progressPercent = Math.min(100, (timeElapsed / interval) * 100);
                        const isDue = timeElapsed >= interval;

                        return (
                            <div key={record.publicKey.toBase58()} className="space-y-6">
                                <motion.div 
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
                                                <p className="text-3xl font-bold text-white">{Math.floor(interval / 60)} <span className="text-sm font-normal text-gray-400">min</span></p>
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
                                                animate={{ width: `${progressPercent}%` }}
                                                transition={{ duration: 1, ease: "linear" }}
                                                className={`h-full ${isDue ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-primary'}`}
                                            />
                                        </div>
                                        
                                        <p className="text-sm font-semibold">
                                            {isDue ? (
                                                <span className="text-green-400 font-bold">Cycle Complete! Payment Incoming</span>
                                            ) : (
                                                <span className="text-gray-400">{Math.floor(progressPercent)}% cycle completed</span>
                                            )}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Activity & Logs Section */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                                >
                                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-4">
                                            <Clock className="w-5 h-5 text-primary" /> Work Hours & Logs
                                            <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">{loggedHours} Hours Total</span>
                                        </h3>
                                        <button 
                                            onClick={logHours}
                                            disabled={isLogging}
                                            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                        >
                                            {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                            Log Hour
                                        </button>
                                    </div>
                                    <div className="p-0">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-xs uppercase text-gray-500 bg-black/50">
                                                    <th className="px-6 py-4 font-semibold">Activity</th>
                                                    <th className="px-6 py-4 font-semibold">Timestamp</th>
                                                    <th className="px-6 py-4 font-semibold">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                <tr className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-gray-300 font-medium">Auto-Payroll Cycle Progress Update</td>
                                                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">Just Now</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Active</span>
                                                    </td>
                                                </tr>
                                                {loggedHours > 0 && (
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">Manual Work Hour Logged</td>
                                                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">Session Verified</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">Logged</span>
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-gray-300 font-medium">Last On-Chain Payment Confirmed</td>
                                                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{new Date(lastPaid * 1000).toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-green-500/10 text-green-400 border border-green-500/20">Settled</span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}
                </AnimatePresence>
            </div>
            )}
            <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} title={alertConfig.title} message={alertConfig.message} />
        </div>
    );
};
