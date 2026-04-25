import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { AuthReduxSync } from "@/components/providers/auth-redux-sync";
import { StoreProvider } from "@/components/providers/store-provider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fixlytics",
  description: "Lead intelligence for underperforming business websites",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen font-sans ${outfit.variable}`}>
        <StoreProvider>
          <AuthProvider>
            <AuthReduxSync />
            {children}
          </AuthProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
