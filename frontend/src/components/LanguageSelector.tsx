import React from 'react';
import { Language } from '../i18n/translations';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onLanguageChange }) => {
  return (
    <div className="flex items-center gap-1 bg-[#12141a] p-1 rounded-lg border border-[#1e222e]">
      <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1" />
      <button
        type="button"
        onClick={() => onLanguageChange('pt')}
        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
          currentLang === 'pt' ? 'bg-dg-cyan text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
        }`}
      >
        <span>🇧🇷</span> PT
      </button>

      <button
        type="button"
        onClick={() => onLanguageChange('en')}
        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
          currentLang === 'en' ? 'bg-dg-cyan text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
        }`}
      >
        <span>🇺🇸</span> EN
      </button>

      <button
        type="button"
        onClick={() => onLanguageChange('it')}
        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
          currentLang === 'it' ? 'bg-dg-cyan text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
        }`}
      >
        <span>🇮🇹</span> IT
      </button>
    </div>
  );
};
