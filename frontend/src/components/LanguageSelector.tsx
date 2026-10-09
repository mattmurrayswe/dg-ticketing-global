import React from 'react';
import { Language } from '../i18n/translations';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onLanguageChange }) => {
  return (
    <div className="w-28 flex items-center bg-[#12141a] p-1 rounded-lg border border-[#1e222e]">
      <Globe className="w-6 h-3.5 text-zinc-400 ml-1" />
      <button
        type="button"
        onClick={() => onLanguageChange('pt')}
        className={`px-[0.280rem] py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
          currentLang === 'pt' ? 'text-white font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
        }`}
      >
        {/* <span>🇧🇷</span> */}
        PT
      </button>

      <button
        type="button"
        onClick={() => onLanguageChange('en')}
        className={`px-[0.280rem] py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
          currentLang === 'en' ? 'text-white font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
        }`}
      >
        {/* <span>🇺🇸</span> */}
        EN
      </button>

      <button
        type="button"
        onClick={() => onLanguageChange('it')}
        className={`px-[0.280rem] py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
          currentLang === 'it' ? 'text-white font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
        }`}
      >
        {/* <span>🇮🇹</span> */}
        IT
      </button>
    </div>
  );
};
