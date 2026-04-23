import type { Metadata } from "next";
import { SolanaWalletProvider } from "@/components/SolanaWalletProvider";
import "@solana/wallet-adapter-react-ui/styles.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Automated Payroll | Solana",
  description: "Secure, decentralized payroll management on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="bg-mesh" />
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
