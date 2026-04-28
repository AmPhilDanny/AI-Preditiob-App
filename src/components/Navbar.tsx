'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  Activity, 
  Sun, 
  Moon, 
  Shield, 
  LayoutDashboard, 
  Settings,
  Menu,
  X,
  Zap,
  Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Admin Control', href: '/admin', icon: Command },
  ];

  if (!mounted) return null;

  return (
    <div className="fixed top-0 w-full z-50 px-4 py-6 transition-all duration-500">
      <nav className={`max-w-5xl mx-auto px-6 h-16 flex items-center justify-between rounded-full transition-all duration-500 ${
        scrolled 
          ? 'bg-background/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]' 
          : 'bg-transparent border border-transparent'
      }`}>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-[15deg] transition-all duration-500">
              <Zap className="text-white fill-white" size={20} />
            </div>
            <span className="text-lg font-black tracking-tighter font-outfit hidden sm:block">
              NEURAL<span className="text-primary">BET</span>
            </span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`nav-link flex items-center gap-2 rounded-full ${
                pathname === link.href ? 'active' : ''
              }`}
            >
              <link.icon size={16} />
              {link.name}
            </Link>
          ))}
          
          <div className="w-px h-6 bg-border/50 mx-2" />
          
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-all duration-300 group"
          >
            {theme === 'dark' ? (
              <Sun size={20} className="group-hover:rotate-90 transition-transform duration-500" />
            ) : (
              <Moon size={20} className="group-hover:-rotate-12 transition-transform duration-500" />
            )}
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="absolute top-24 left-4 right-4 p-4 rounded-[2.5rem] bg-background/80 backdrop-blur-3xl border border-white/10 md:hidden shadow-2xl"
          >
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 p-5 rounded-3xl transition-all ${
                    pathname === link.href ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-white/5'
                  }`}
                >
                  <link.icon size={22} />
                  <span className="font-black font-outfit uppercase tracking-widest text-xs">{link.name}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
