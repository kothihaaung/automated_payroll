'use client';

import { motion } from 'framer-motion';

export const Header = () => {
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
                    <h1 className="text-xl font-bold tracking-tight text-white">
                        Payroll<span className="text-primary">DApp</span>
                    </h1>
                </motion.div>
            </div>
        </header>
    );
};
