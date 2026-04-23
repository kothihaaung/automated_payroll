'use client';

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { EmployerDashboard } from "@/components/EmployerDashboard";
import { EmployeeDashboard } from "@/components/EmployeeDashboard";
import { usePayroll } from "@/hooks/usePayroll";
import { motion } from "framer-motion";
import { Briefcase, UserCircle, LogOut, Loader2 } from "lucide-react";

export default function Home() {
  const { wallet, generateNewIdentity, clearIdentity } = usePayroll();
  const [viewMode, setViewMode] = useState<'employer' | 'employee'>('employer');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
      // Auto-generate on mount if no wallet is present
      const initWallet = async () => {
          if (!wallet && !isGenerating) {
              setIsGenerating(true);
              await generateNewIdentity();
              setIsGenerating(false);
          }
          setIsInitializing(false);
      };
      
      // We give a small delay to check if localStorage already populated the wallet
      const timer = setTimeout(() => {
          initWallet();
      }, 500);
      
      return () => clearTimeout(timer);
  }, [wallet, generateNewIdentity, isGenerating]);

  if (isInitializing || (isGenerating && !wallet)) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white">
              <div className="bg-mesh" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center max-w-md p-8 border border-gray-800 rounded-2xl bg-black/40 backdrop-blur-xl"
              >
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Initializing Environment</h2>
                  <p className="text-gray-400 text-sm">Provisioning local testnet identity and requesting SOL airdrop...</p>
              </motion.div>
          </div>
      );
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <Header />
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8">
        {wallet && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-6 gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                  System Dashboard
                </h1>
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <span className="font-mono bg-gray-900 px-3 py-1.5 rounded-md border border-gray-800 text-gray-300">
                    ID: {wallet.publicKey.toBase58().slice(0, 8)}...{wallet.publicKey.toBase58().slice(-8)}
                  </span>
                  <button onClick={clearIdentity} className="flex items-center gap-1.5 hover:text-red-400 transition-colors text-xs font-medium uppercase tracking-wider">
                      <LogOut className="w-3.5 h-3.5" /> Reset Session
                  </button>
                </div>
              </div>
              
              <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-800 backdrop-blur-sm">
                <button
                  onClick={() => setViewMode('employer')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'employer' ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <Briefcase className="w-4 h-4" /> Employer View
                </button>
                <button
                  onClick={() => setViewMode('employee')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'employee' ? 'bg-secondary/20 text-secondary border border-secondary/30 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <UserCircle className="w-4 h-4" /> Employee View
                </button>
              </div>
            </div>
            
            <div className="w-full">
                {viewMode === 'employer' ? <EmployerDashboard /> : <EmployeeDashboard />}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
