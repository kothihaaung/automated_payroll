import type { Metadata } from "next";
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
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
