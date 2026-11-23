import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LanguageSelector } from './LanguageSelector';
import { Language, translations } from '../i18n/translations';
import { LayoutDashboard, Ticket, Home, Zap, BarChart2 } from 'lucide-react';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentLang, onLanguageChange }) => {
  const t = translations[currentLang];
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-[#08090b]/95 backdrop-blur-md border-b border-[#1e222e] px-4 lg:px-8 lg:pl-14 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* High-Resolution Ultra-HD Brand Logo (1915x1105) */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/dg-com-br.png"
            alt="Digital Garage"
            className="h-9 md:h-11 w-auto object-contain"
          />
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-0.5">
          {/* <Link
            to="/"
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              location.pathname === '/' 
                ? 'bg-[#15171e] text-dg-cyan border border-dg-cyan/40 shadow-neonCyan' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.navLanding}</span>
          </Link> */}

          <Link
            to="/eventos-v2"
            className={`px-2 py-2 rounded text-xs font-bold transition-all flex items-end gap-1.5 ${
              location.pathname.startsWith('/eventos-v2') ||
              location.pathname.startsWith('/events-v2') ||
              location.pathname.startsWith('/checkout')
                ? 'bg-[#15171e] text-white border border-white/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>{t.navCarMeets}</span>
          </Link>

          <Link
            to="/organizer"
            className={`px-2 py-2 rounded text-xs font-bold transition-all flex items-end gap-1.5 ${
              location.pathname.startsWith('/organizer')
                ? 'bg-[#15171e] text-white border border-white/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>{t.navOrganizer}</span>
          </Link>

          {/* Language Selector */}
          <div className="ml-1">
            <LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} />
          </div>
        </nav>

      </div>
    </header>
  );
};
