import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: "AI Football Prediction | Premium Odds Analysis",
  description: "Advanced AI-powered football predictions using Gemini, Grok, and Mistral.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased relative overflow-x-hidden`}>
        <div className="mesh-bg">
          <div className="mesh-circle-1" />
          <div className="mesh-circle-2" />
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="pt-24 min-h-screen relative z-10">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
