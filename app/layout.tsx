import type { Metadata } from "next";
import "./globals.css";
import { Orbitron } from "next/font/google";
import HydrationFix from "./src/components/HydrationFix";
import { Toaster } from "react-hot-toast";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "Cyber OCR App",
  description: "Optical Character Recognition application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={orbitron.variable}>
      <HydrationFix />
      <body className="bg-black text-white min-h-screen font-sans">
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 2000 }} />
      </body>
    </html>
  );
}
