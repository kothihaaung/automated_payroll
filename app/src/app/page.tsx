'use client';

import { Header } from "@/components/Header";
import { EmployerDashboard } from "@/components/EmployerDashboard";
import { usePayroll } from "@/hooks/usePayroll";
import { motion } from "framer-motion";
import { Rocket, Shield, Zap } from "lucide-react";

export default function Home() {
  const { wallet } = usePayroll();

  return (
    <main className="min-height-screen flex flex-col items-center">
      <Header />
      
      <div className="max-w-7xl mx-auto w-full px-8 py-12">
        {wallet ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-12">
              <h1 className="text-5xl font-bold mb-4 tracking-tight">
                Welcome back, <span className="text-gradient">Admin</span>
              </h1>
              <p className="text-gray-400 text-lg">Manage your payroll with cryptographic precision.</p>
            </div>
            
            <EmployerDashboard />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
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
              className="mt-16 p-4 px-8 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium animate-pulse"
            >
              Please connect your wallet to access the dashboard
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
