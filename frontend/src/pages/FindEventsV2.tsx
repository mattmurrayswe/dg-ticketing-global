import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Language } from '../i18n/translations';
import { ExternalLink, MapPin } from 'lucide-react';

interface FindEventsV2Props {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const copyByLang: Record<
  Language,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    organizersTitle: string;
    organizersSubtitle: string;
    visitInstagram: string;
    organizerTitle: string;
    organizerDesc: string;
    createEvent: string;
    legacyCheckout: string;
  }
> = {
  pt: {
    eyebrow: 'De GearHead para GearHead',
    title: 'Encontre Eventos',
    subtitle:
      'Descubra encontros automotivos, track days e exposições, car meets no Brasil e no mundo.',
    organizersTitle: 'Organizadores de Eventos',
    organizersSubtitle:
      'Encontros automotivos impulsionados pela Digital Garage.',
    visitInstagram: 'Instagram',
    organizerTitle: 'Organizando um Car Meet?',
    organizerDesc:
      'Emita ingressos com repasse antecipado e alcance o público GearHead da Digital Garage.',
    createEvent: 'Criar Novo Evento',
    legacyCheckout: 'Acessar Checkout Clássico (v1)',
  },
  en: {
    eyebrow: 'From GearHead to GearHead',
    title: 'Find Upcoming Car Meets & Automotive Events.',
    subtitle:
      'Discover car meets, track days, and paddock showcases with Exhibitor or Spectator passes via instant PIX and Credit Card.',
    organizersTitle: 'Featured Organizers & Partners',
    organizersSubtitle:
      'Automotive collectives and car meets powered by Digital Garage.',
    visitInstagram: 'Instagram',
    organizerTitle: 'Hosting a Car Meet?',
    organizerDesc:
      'Issue tickets with early payouts and reach the Digital Garage GearHead audience.',
    createEvent: 'Create New Event',
    legacyCheckout: 'Open Classic Checkout (v1)',
  },
  it: {
    eyebrow: 'Da GearHead a GearHead',
    title: 'Trova i Prossimi Raduni & Eventi Auto.',
    subtitle:
      'Scopri car meet, track day ed esposizioni con pass Espositore o Spettatore tramite PIX e Carta di Credito.',
    organizersTitle: 'Organizzatori & Partner in Evidenza',
    organizersSubtitle:
      'Collettivi e raduni automobilistici supportati da Digital Garage.',
    visitInstagram: 'Instagram',
    organizerTitle: 'Organizzi un Car Meet?',
    organizerDesc:
      'Emetti biglietti con incasso anticipato e raggiungi il pubblico GearHead.',
    createEvent: 'Crea Nuovo Evento',
    legacyCheckout: 'Vai al Checkout Classico (v1)',
  },
};

interface LandingOrganizer {
  name: string;
  logo: string;
  lettering: string | null;
  logoClass?: string;
  location: string;
  url: string | null;
}

const LANDING_ORGANIZERS: LandingOrganizer[] = [
  {
    name: 'IDOLZ',
    logo: '/idolz-logo.svg',
    lettering: null,
    location: 'Budapest, Hungary',
    url: 'https://www.instagram.com/idolz_official/',
  },
  {
    name: 'FuoriConcorso',
    logo: '/logo-fuoriconcorso.svg',
    lettering: '/lettering-fuoriconcorso.svg',
    location: 'Lake Como, Italy',
    url: 'https://www.instagram.com/fuoriconcorso/',
  },
  {
    name: 'Players Shows',
    logo: '/players-logo.webp',
    lettering: null,
    logoClass: 'max-h-14',
    location: 'Goodwood, United Kingdom',
    url: 'https://www.instagram.com/players_shows',
  },
  {
    name: 'Capital Race',
    logo: '/capital-race-logo.webp',
    lettering: null,
    logoClass: 'max-h-12',
    location: 'Curitiba, Brazil',
    url: 'https://www.instagram.com/capitalrace',
  },
];

const RotationalGlobe: React.FC<{ size?: number }> = ({ size = 88 }) => (
  <div
    className="relative flex items-center justify-center overflow-hidden rounded-full bg-zinc-950 border border-zinc-800/80 shrink-0"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <div
      className="absolute inset-0 w-full h-full animate-globe-spin"
      style={{
        backgroundImage:
          "url('https://unpkg.com/three-globe/example/img/earth-dark.jpg')",
        backgroundSize: 'auto 100%',
        backgroundRepeat: 'repeat-x',
        filter: 'brightness(2.1) contrast(1.2) grayscale(1)',
      }}
    />
    <div className="absolute inset-0 rounded-full shadow-[inset_-19px_-19px_30px_rgba(0,0,0,0.9),inset_9px_9px_19px_rgba(255,255,255,0.2)] pointer-events-none" />
  </div>
);

export const FindEventsV2: React.FC<FindEventsV2Props> = ({
  currentLang,
  onLanguageChange,
}) => {
  const c = copyByLang[currentLang];

  return (
    <div className="min-h-screen bg-[#08090b] text-white flex flex-col font-sans">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      {/* Editorial Hero (styled after LandingPage.tsx) */}
      <section className="relative pt-14 pb-12 px-4 sm:px-8 border-b border-[#1e222e] bg-gradient-to-b from-[#0d0e14] to-[#08090b]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="font-markazi text-[1.6rem] text-zinc-400 leading-tight">
                {c.eyebrow}
              </p>
              <h1 className="text-4xl lg:text-4xl font-medium font-markazi text-white tracking-wide leading-tight">
                {c.title}
              </h1>
              <p className="font-markazi text-lg text-zinc-400 max-w-xl leading-snug">
                {c.subtitle}
              </p>
            </div>

            <div className="hidden md:flex items-center gap-5 shrink-0">
              <RotationalGlobe size={88} />
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 space-y-10">
        {/* Featured Organizers from Landing Page */}
        <section
          aria-labelledby="partner-organizers-heading"
          className="rounded-2xl bg-[#0f1117] border border-[#1e222e] p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2
              id="partner-organizers-heading"
              className="text-2xl text-white"
            >
              {c.organizersTitle}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">{c.organizersSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LANDING_ORGANIZERS.map((org) => (
              <div
                key={org.name}
                className="rounded-xl border border-[#1e222e] hover:border-zinc-700 bg-[#151720]/60 p-5 flex flex-col items-center justify-between gap-4 transition-all"
              >
                <div className="h-16 flex flex-col items-center justify-center gap-2">
                  {org.lettering ? (
                    <>
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="h-10 w-auto object-contain"
                      />
                      <img
                        src={org.lettering}
                        alt={`${org.name} lettering`}
                        className="h-3 w-auto object-contain"
                      />
                    </>
                  ) : (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className={`${org.logoClass || 'max-h-11'} w-auto object-contain`}
                    />
                  )}
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-mono text-zinc-400 flex items-center justify-center gap-1">
                    <MapPin
                      className="w-3 h-3 text-dg-cyan"
                      aria-hidden="true"
                    />
                    {org.location}
                  </p>
                </div>

                {org.url && (
                  <div className="w-full pt-2 border-t border-[#1e222e] flex justify-center">
                    <a
                      href={org.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${org.name} ${c.visitInstagram}`}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#0f1117] border border-[#1e222e] text-xs font-mono text-zinc-300 hover:text-white transition"
                    >
                      <span>{c.visitInstagram}</span>
                      <ExternalLink
                        className="w-3.5 h-3.5"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Organizer & Payment Trust Strip matching LandingPage.tsx */}
        <section className="rounded-2xl bg-[#0f1117] border border-[#1e222e] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-2xl text-white">{c.organizerTitle}</h2>
            <p className="text-sm text-zinc-400">{c.organizerDesc}</p>
            <div className="pt-1">
              <Link
                to="/checkout"
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
              >
                {c.legacyCheckout}
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <img
              src="/pagarme-logo.svg"
              alt="Pagar.me V5 PIX"
              className="h-7 object-contain opacity-80"
            />
            <img
              src="/stripe-logo.png"
              alt="Stripe Payments"
              className="h-7 object-contain opacity-80"
            />
            <Link
              to="/organizer"
              className="underline underline-offset-4 decoration-zinc-700 border-2 border-[#1e222e] hover:border-dg-cyan/50 rounded-md px-5 py-2 font-markazi text-xl bg-gradient-to-tr from-black to-[#0f1117] text-white transition"
            >
              {c.createEvent}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer matching LandingPage.tsx */}
      <footer className="mt-auto bg-[#050608] border-t border-[#1e222e] py-8 px-4 sm:px-8 text-xs text-zinc-500 font-mono">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/dg-com-br.png"
              alt="Digital Garage"
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <span className="text-zinc-400 text-4xl font-[100] pb-1">|</span>
            <h3 className="font-markazi text-white text-[1.4rem] sm:text-[1.6rem] pt-2">
              A Plataforma do GearHead
            </h3>
          </div>
          <div className="font-sans">
            <h3 className="mb-2 text-start text-white text-lg">+ Produtos</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold underline underline-offset-1">
              <Link to="/" className="text-zinc-400 hover:text-white">
                Início
              </Link>
              <Link to="/eventos-v2" className="text-zinc-400 hover:text-white">
                Encontre Eventos
              </Link>
              <Link to="/checkout" className="text-zinc-400 hover:text-white">
                Checkout (v1)
              </Link>
              <Link to="/organizer" className="text-zinc-400 hover:text-white">
                Área do Organizador
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
