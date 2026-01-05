import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Poppins } from "next/font/google";
import "./globals.css";
import { TranslationProvider } from "@/components/translation/TranslationProvider";


const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Broker - Rwanda's Premier Broker Platform",
  description:
    "Trade smarter with Rwanda's leading digital broker platform. Secure trading, real-time market access, and professional investment tools.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable}`}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TranslationProvider originalLang="en">
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
