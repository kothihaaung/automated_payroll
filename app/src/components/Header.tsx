'use client';

import { motion } from 'framer-motion';
import { usePayroll } from '@/hooks/usePayroll';
import { RefreshCw } from 'lucide-react';

export const Header = () => {
    const { identities, switchIdentity, wallet } = usePayroll();

    const activeIdentityBase64 = identities.find(id => id.publicKeyBase58 === wallet?.publicKey.toBase58())?.secretKeyBase64 
        || (typeof localStorage !== 'undefined' ? localStorage.getItem('payroll_active_identity') : null);

    const handleSwitch = (val: string) => {
        switchIdentity(val);
        window.location.reload();
    };

    return (
        <header className="w-full border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex justify-between items-center px-4 sm:px-8 py-4 max-w-7xl mx-auto w-full">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                        <span className="text-black font-extrabold text-xl">P</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
                        Payroll<span className="text-primary">DApp</span>
                    </h1>
                </motion.div>

                {identities.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">
                            Simulate Identity:
                        </div>
                        <div className="relative">
                            <select
                                value={activeIdentityBase64 || ''}
                                onChange={(e) => handleSwitch(e.target.value)}
                                className="appearance-none bg-gray-900 border border-gray-700 text-white text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                            >
                                {identities.map((id, index) => (
                                    <option key={index} value={id.secretKeyBase64}>
                                        {id.label} ({id.publicKeyBase58.slice(0, 4)}...{id.publicKeyBase58.slice(-4)})
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                <RefreshCw className="w-4 h-4" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </header>
    );
};
