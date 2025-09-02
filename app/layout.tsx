import type { Metadata } from "next";
import "./globals.css";
import { Orbitron, Poppins } from "next/font/google";
import HydrationFix from "./src/components/HydrationFix";
import { Toaster } from "react-hot-toast";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-orbitron",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // normal, medium, semibold, bold
  variable: "--font-poppins",
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
    <html lang="en" className={`${poppins.variable} `}>
      <HydrationFix />
      <body className="bg-black text-white min-h-screen font-sans">
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 2000 }} />
      </body>
    </html>
  );
}
