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
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                            Payroll<span className="text-primary">DApp</span>
                        </h1>
                        <a 
                            href="https://www.linkedin.com/in/kothihaaung/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-gray-400 hover:text-secondary transition-colors flex items-center gap-1.5 mt-1.5 group"
                        >
                            Developed by Thiha Aung
                            <svg 
                                className="w-3.5 h-3.5 fill-current opacity-80 group-hover:opacity-100" 
                                viewBox="0 0 24 24" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
                        </a>
                    </div>
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
