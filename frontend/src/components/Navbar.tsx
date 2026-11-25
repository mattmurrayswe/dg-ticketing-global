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
  const isCreateEventPage =
    location.pathname.startsWith('/criar-evento') ||
    location.pathname.startsWith('/create-event') ||
    location.pathname.startsWith('/organizer/signup');

  return (
    <header className="sticky top-0 z-50 bg-[#08090b]/95 backdrop-blur-md border-b border-[#1e222e] px-4 lg:px-8 py-4">
      <div className="relative max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* High-Resolution Ultra-HD Brand Logo (1915x1105) */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/dg-com-br.png"
            alt="Digital Garage"
            className="h-7 sm:h-9 md:h-11 w-auto object-contain"
          />
        </Link>

        {/* Central Create Event Button */}
        {!isCreateEventPage && (
          <Link
            to="/criar-evento"
            className="hidden md:inline-flex md:absolute md:left-[46%] md:-translate-x-1/2 items-center px-6 py-2.5 rounded text-xs font-bold transition-all border bg-gradient-to-tr from-black to-[#0f1117] text-white border-white/30 hover:from-[#0f1117] hover:to-[#181b24] hover:border-white/50"
          >
            <span>{t.navCreateEvent}</span>
          </Link>
        )}

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-0.5 min-w-0">
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
            className={`px-1.5 sm:px-2 py-2 rounded text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
              location.pathname.startsWith('/eventos-v2') ||
              location.pathname.startsWith('/events-v2') ||
              location.pathname.startsWith('/checkout')
                ? 'bg-[#15171e] text-white border border-white/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Eventos</span>
            <span className="hidden sm:inline">{t.navCarMeets}</span>
          </Link>

          {!isCreateEventPage && (
            <Link
              to="/criar-evento"
              className="md:hidden px-1.5 sm:px-2 py-2 rounded text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap text-zinc-400 hover:text-white"
            >
              <span className="sm:hidden">Criar</span>
              <span className="hidden sm:inline">{t.navCreateEvent}</span>
            </Link>
          )}

          <Link
            to="/organizer"
            className={`px-1.5 sm:px-2 py-2 rounded text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${
              location.pathname.startsWith('/organizer') && !isCreateEventPage
                ? 'bg-[#15171e] text-white border border-white/30' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Painel</span>
            <span className="hidden sm:inline">{t.navOrganizer}</span>
          </Link>

          {/* Language Selector */}
          <div className="ml-0.5 sm:ml-1 shrink-0">
            <LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} />
          </div>
        </nav>

      </div>
    </header>
  );
};
