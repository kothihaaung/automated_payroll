'use client';

import { useState } from "react";
import { Header } from "@/components/Header";
import { EmployerDashboard } from "@/components/EmployerDashboard";
import { EmployeeDashboard } from "@/components/EmployeeDashboard";
import { usePayroll } from "@/hooks/usePayroll";
import { motion } from "framer-motion";
import { Rocket, Shield, Zap, Briefcase, UserCircle, LogOut, Key } from "lucide-react";

export default function Home() {
  const { wallet, generateNewIdentity, clearIdentity } = usePayroll();
  const [viewMode, setViewMode] = useState<'employer' | 'employee'>('employer');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
      setIsGenerating(true);
      await generateNewIdentity();
      setIsGenerating(false);
  };

  return (
    <main className="min-height-screen flex flex-col items-center">
      <Header />
      
      <div className="max-w-7xl mx-auto w-full px-8 py-12">
        {wallet ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4">
              <div>
                <h1 className="text-5xl font-bold mb-2 tracking-tight">
                  <span className="text-gradient">Dashboard</span>
                </h1>
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <span className="font-mono bg-white/5 px-2 py-1 rounded border border-white/10">
                    ID: {wallet.publicKey.toBase58().slice(0, 8)}...{wallet.publicKey.toBase58().slice(-8)}
                  </span>
                  <button onClick={clearIdentity} className="flex items-center gap-1 hover:text-red-400 transition-colors">
                      <LogOut className="w-3 h-3" /> Clear Session
                  </button>
                </div>
              </div>
              
              <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => setViewMode('employer')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'employer' ? 'bg-primary/20 text-primary font-bold border border-primary/50' : 'text-gray-400 hover:text-white'}`}
                >
                  <Briefcase className="w-4 h-4" /> Employer
                </button>
                <button
                  onClick={() => setViewMode('employee')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'employee' ? 'bg-secondary/20 text-secondary font-bold border border-secondary/50' : 'text-gray-400 hover:text-white'}`}
                >
                  <UserCircle className="w-4 h-4" /> Employee
                </button>
              </div>
            </div>
            
            {viewMode === 'employer' ? <EmployerDashboard /> : <EmployeeDashboard />}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <h2 className="text-7xl font-bold mb-6 tracking-tighter leading-none">
                The Future of <br />
                <span className="text-gradient">Automated Payroll</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Secure, transparent, and instant. Built on Solana for the next generation of global businesses.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-16">
              {[
                { icon: <Shield className="w-6 h-6" />, title: "Secure PDAs", desc: "Your funds are locked in program-derived addresses, only accessible via smart contract logic." },
                { icon: <Zap className="w-6 h-6" />, title: "Instant Settled", desc: "No more waiting days for bank transfers. Payments settle in sub-second Solana blocks." },
                { icon: <Rocket className="w-6 h-6" />, title: "Fully Automated", desc: "Set salary intervals and let the blockchain handle the rest 24/7/365." }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.5 }}
                  className="glass-card flex flex-col items-center p-8 text-center"
                >
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
                <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto"
                >
                    {isGenerating ? (
                        <span className="animate-pulse">Generating & Funding via Airdrop...</span>
                    ) : (
                        <>
                            <Key className="w-5 h-5" /> Generate Test Identity
                        </>
                    )}
                </button>
                <p className="mt-4 text-sm text-gray-500 max-w-md mx-auto">
                    This will create a local Keypair and airdrop 10 SOL from your local validator so you can test the smart contract immediately.
                </p>
            </motion.div>
          </div>
        )}
      </div>
      
      <footer className="mt-auto py-12 text-gray-600 text-sm border-t border-white/5 w-full text-center">
        &copy; 2026 Automated Payroll DApp. Built with Antigravity.
      </footer>
    </main>
  );
}
