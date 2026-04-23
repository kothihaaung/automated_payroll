'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePayroll } from '@/hooks/usePayroll';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Clock, Loader2, DollarSign } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const EmployeeDashboard = () => {
    const { program, wallet, connection } = usePayroll();
    const [employeeRecords, setEmployeeRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshData = useCallback(async () => {
        if (!program || !wallet) return;

        try {
            // Fetch all employee accounts matching the connected wallet
            const accounts = await program.account.employee.all([
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
    }, [program, wallet]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    if (employeeRecords.length === 0) {
        return (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
                <Wallet className="w-16 h-16 text-gray-500 mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No Employment Records Found</h3>
                <p className="text-gray-400">Your connected wallet is not registered as an employee in any active payroll.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">Employee Dashboard</h2>
            
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
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-card flex flex-col md:flex-row justify-between items-center gap-6"
                        >
                            <div className="flex-1 space-y-4 w-full">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <DollarSign className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Employer Address</p>
                                        <p className="font-mono text-sm">{record.employer.toBase58()}</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                        <p className="text-sm text-gray-400 mb-1">Salary</p>
                                        <p className="text-xl font-bold">{salary} SOL</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                        <p className="text-sm text-gray-400 mb-1">Pay Interval</p>
                                        <p className="text-xl font-bold">{interval} seconds</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-1/3 bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                                <Clock className="w-8 h-8 text-secondary mx-auto mb-3" />
                                <h4 className="font-semibold mb-2">Payment Status</h4>
                                
                                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercent}%` }}
                                        className={`h-full ${isDue ? 'bg-green-500' : 'bg-gradient-to-r from-primary to-secondary'}`}
                                    />
                                </div>
                                
                                <p className="text-sm font-medium">
                                    {isDue ? (
                                        <span className="text-green-400">Payment Due! Employer can now disburse.</span>
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
    );
};
