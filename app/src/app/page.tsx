'use client';

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { EmployerDashboard } from "@/components/EmployerDashboard";
import { EmployeeDashboard } from "@/components/EmployeeDashboard";
import { usePayroll } from "@/hooks/usePayroll";
import { motion } from "framer-motion";
import { Briefcase, UserCircle, LogOut, Loader2 } from "lucide-react";

export default function Home() {
  const { wallet, identities, activeIdentity, connection } = usePayroll();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (wallet && connection) {
      setIsInitializing(false);
    }
  }, [wallet, connection]);

  if (isInitializing || !wallet) {
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
                  <p className="text-gray-400 text-sm">Connecting to local testnet identity...</p>
              </motion.div>
          </div>
      );
  }

  const isEmployer = activeIdentity?.label === "Employer";

  return (
    <main className="min-h-screen flex flex-col items-center">
      <Header />
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div className="mb-8 border-b border-gray-800 pb-6">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
              {isEmployer ? "Employer Dashboard" : "Employee Dashboard"}
            </h1>
            <div className="flex items-center gap-3 text-gray-400 text-sm">
              <span className="font-mono bg-gray-900 px-3 py-1.5 rounded-md border border-gray-800 text-gray-300">
                Connected as: {activeIdentity?.label} ({wallet.publicKey.toBase58().slice(0, 4)}...{wallet.publicKey.toBase58().slice(-4)})
              </span>
            </div>
          </div>
          
          <div className="w-full">
              {isEmployer ? <EmployerDashboard /> : <EmployeeDashboard />}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
