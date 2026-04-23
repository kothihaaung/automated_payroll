'use client';

import { motion } from 'framer-motion';

export const Header = () => {
    return (
        <header className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
            >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <span className="text-black font-bold text-xl">P</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Payroll<span className="text-primary">DApp</span>
                </h1>
            </motion.div>
        </header>
    );
};
