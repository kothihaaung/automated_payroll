'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

export const AlertModal = ({ isOpen, onClose, title, message }: AlertModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                        
                        <div className="flex flex-col items-center text-center gap-6 mb-8">
                            <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white text-black font-bold rounded-lg transition-all hover:bg-gray-200 active:scale-95"
                        >
                            Acknowledge
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
