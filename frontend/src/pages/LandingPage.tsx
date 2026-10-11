import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Language, translations } from '../i18n/translations';
import { fetchEvents, CarMeetEvent } from '../services/api';
import { 
  Car, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Zap, 
  DollarSign, 
  Ticket, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  QrCode,
  Users
} from 'lucide-react';

interface LandingPageProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ currentLang, onLanguageChange }) => {
  const t = translations[currentLang];
  const navigate = useNavigate();
  const [events, setEvents] = useState<CarMeetEvent[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents().then((data) => setEvents(data));
  }, []);

  const handleCopyEventLink = (slug: string) => {
    const link = `${window.location.origin}/checkout?slug=${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-white flex flex-col font-sans">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      {/* Hero Section */}
      <section className="relative pt-[9.8rem] pb-[9.1rem] px-4 text-center overflow-hidden border-b border-[#1e222e] bg-gradient-to-b from-[#0d0e14] to-[#08090b]">
        {/* Neon Ambient Lighting */}
        {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-dg-cyan/5 rounded-full blur-3xl pointer-events-none" /> */}

          <p className='font-markazi text-[1.7rem] text-zinc-400'>
            De GearHead para GearHead
          </p>
          <h1 className="text-4xl lg:text-5xl font-medium font-markazi text-white tracking-wide mb-2 max-w-4xl mx-auto leading-tight">
            O Emissor de Ingressos dos Eventos Automotivos.
          </h1>
          <p className='font-markazi text-xl max-w-2xl mx-auto text-zinc-400 mb-2'>
            Repasses antecipados de pagamentos, encontre o publico que está procurando pelo seu evento, maior alcance para seu evento automotivo.
          </p>
          <Link
            className='font-markazi text-2xl underline underline-offset-4'
            to={"/organizer"}
          >
              Criar Novo Evento
          </Link>

          <div className="flex flex-wrap items-center justify-center mt-8 pl-[450px]">
            {/* Pagar.me Logo Card */}
            <div className="opacity-100 px-4 py-3.5 rounded-xl flex items-center justify-center cursor-pointer">
              <a className='cursor-pointer' href="http://pagar.me" target="_blank" rel="noopener noreferrer">
                <img
                  src="/pagarme-logo.svg"
                  alt="Pagar.me V5 PIX"
                  className="h-10 object-contain"
                />
              </a>
            </div>

            {/* Stripe Logo Card */}
            <div className="opacity-100 px-4 py-3.5 rounded-xl flex items-center justify-center cursor-pointer">
              <a className='cursor-pointer' href="http://stripe.com" target="_blank" rel="noopener noreferrer">
                <img
                  src="/stripe-logo.png"
                  alt="Stripe Payments"
                  className="h-10 object-contain"
                />
              </a>
            </div>

          </div>
      </section>

      {/* Vantagens Section */}
      <section className="pb-12 pt-14 px-32 space-y-16 bg-[#0f1117] border-b border-[#1e222e]">
        <div className='flex flex-col'>
          <h2 className='text-2xl'>
            Repasses Antecipados
          </h2>
          <p className='max-w-[600px] text-zinc-400'>
            Diversas Plataformas seguram sua arrecadação até após o dia do evento. Nosso Emissor conta com repasses antecipados. Assim você tem maior fluxo de caixa para investir em atrações, publicidade, divulgação e aumentar o valor dos seus ingressos e lotes.
          </p>
        </div>
        <div className='flex flex-col w-full text-end'>
          <h2 className='text-2xl -mb-3'>
            Público GearHead
          </h2>
          <div className='w-full flex justify-end'>
            <p className='max-w-[650px] text-zinc-400'>
              A <img src="/dg-com-br.png" alt="digitalgarage.com.br" className="inline-block h-10 align-bottom pr-2 pl-1" /> é uma plataforma focada no mercado automotivo, temos classificados, aplicativo FIPE, ferramentas para intermediadores e lojistas automotivos, importação veicular. Ao emitir conosco você acessa um público altamente segmentado e interessado em Car Meets, expandido seu evento.
            </p>
          </div>
        </div>
        <div className='flex flex-col'>
          <h2 className='text-2xl'>
            Maior Alcance
          </h2>
          <p className='max-w-[650px] text-zinc-400'>
            Você receberá divulgação em nossos canais digitais. Nossos sites, plataformas, aplicativos, grupos de whatsapp, redes sociais apoiarão na divulgação do seu evento, aumentando seu alcance.
          </p>
        </div>
        <div className='text-center pt-6'>
          <Link className='underline underline-offset-4 decoration-zinc-700 border-2 border-[#1e222e] rounded-md px-6 py-2 font-markazi text-xl bg-gradient-to-tr from-black to-[#0f1117]' to="/organizer">
              Criar Novo Evento
          </Link>
        </div>
      </section>

      {/* Powered by Digital Garage Gallery */}
      <section className="border-b bg-[#0f1117] border-[#1e222e] flex justify-end">
          <img className="w-[41%]" src="/dg-photo-scanning.png" alt="" />
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#050608] border-t border-[#1e222e] py-8 px-4 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-5xl mx-56 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 pt-8  ">
            <img src="/dg-com-br.png" alt="Digital Garage" className="h-12 w-auto object-contain" />
            <span className='text-zinc-400 text-5xl font-[100] pb-1'>|</span>
            <h3 className='font-markazi text-white text-[1.6rem] pt-5'>A Plataforma do GearHead</h3>
          </div>
          <div className="font-sans px-24 pt-4">
            <h3 className='mb-2 text-start text-white text-xl'>+ Produtos</h3>
            <div className='pl-7 flex flex-col text-start text-base font-bold underline underline-offset-1'>
              <Link to="/privacy" className="w-full text-zinc-400 hover:text-white">Index</Link>
              <Link to="/terms" className="w-full text-zinc-400 hover:text-white">Classificados</Link>
              <Link to="/terms" className="w-full text-zinc-400 hover:text-white">Wanted</Link>
              <Link to="/terms" className="w-full text-zinc-400 hover:text-white">Intermediação</Link>
              <Link to="/terms" className="w-full text-zinc-400 hover:text-white">Landing Pages Autos</Link>
              <Link to="/terms" className="w-full text-zinc-400 hover:text-white">Classificados</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
