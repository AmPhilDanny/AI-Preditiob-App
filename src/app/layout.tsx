import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">A</div>
                <span className="text-xl font-bold tracking-tight">Antigravity Predictions</span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a href="#" className="px-3 py-2 rounded-md text-sm font-medium hover:text-blue-400">Dashboard</a>
                  <a href="#" className="px-3 py-2 rounded-md text-sm font-medium hover:text-blue-400">AI Health</a>
                  <a href="#" className="px-3 py-2 rounded-md text-sm font-medium hover:text-blue-400">History</a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  AI HEALTH: 98%
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="pt-20 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
