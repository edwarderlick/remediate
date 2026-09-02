import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "Remediate | Deterministic Vulnerability Escrow",
  description: "A narrow, fail-closed vulnerability-fix escrow primitive on GenLayer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrains.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        <Providers>
          <Header />
          <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
