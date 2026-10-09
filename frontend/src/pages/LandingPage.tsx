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
      <section className="relative pt-12 pb-20 px-4 text-center overflow-hidden border-b border-[#1e222e] bg-gradient-to-b from-[#0d0e14] to-[#08090b]">
        {/* Neon Ambient Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-dg-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          
          {/* Square Rounded Logo Showcase */}
          <div className="relative inline-block mb-6 group cursor-pointer" onClick={() => navigate('/checkout')}>
            <img
              src="/dg-logo-rounded-black.png"
              alt="Digital Garage Car Meet Platform"
              className="w-24 h-24 md:w-36 md:h-36 mx-auto object-contain rounded-2xl shadow-2xl shadow-cyan-500/20 transition-transform group-hover:scale-105 border border-dg-cyan/30"
            />
            <span className="absolute -bottom-2 right-0 bg-dg-cyan text-black text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">
              OFFICIAL HUB
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151720] border border-dg-cyan/30 text-dg-cyan text-xs font-mono font-bold uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            PLATAFORMA OFICIAL PARA ENCONTROS AUTOMOTIVOS
          </div>

          <h1 className="text-4xl lg:text-6xl font-medium font-markazi text-white tracking-wide mb-4 max-w-4xl mx-auto leading-tight">
            O Emissor de Ingressos dos Eventos Automotivos.
          </h1>

          <p className="text-xs lg:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Processamos mais de <strong className="text-emerald-400 font-mono">R$ 84.500</strong> em 7 encontros com leitor de portão QR Code em tempo real, pagamento instantâneo via PIX (Pagar.me), Cartão (Stripe) e <strong className="text-dg-cyan">Repasse Antecipado</strong> para organizadores.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate('/checkout')}
              className="px-6 py-4 bg-dg-cyan hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              {t.findCarMeets} <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/organizer')}
              className="px-6 py-4 bg-[#151720] hover:bg-zinc-800 text-white border border-[#1e222e] font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Car className="w-4 h-4 text-dg-cyan" />
              Criar Novo Evento
            </button>
          </div>

        </div>
      </section>

      {/* Repasse Antecipado Section */}
      <section className="pb-16 pt-8 px-4 bg-[#0f1117] border-b border-[#1e222e]">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-4xl font-figtree font-bold text-white tracking-tight mt-3 mb-2">
              Repasses Antecipados Sem Esperar 30 Dias
            </h2>
            <p className="text-xs lg:text-sm text-zinc-400 max-w-2xl mx-auto">
              Sabemos que organizar um Car Meet exige investimento em pista, segurança, bombeiros, troféus e atrações. Por isso disponibilizamos o saldo de vendas com adiantamento automático.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#151720] p-6 rounded-2xl border border-[#1e222e] space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Liquidez</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Receba os valores das vendas antes do dia do evento para arcar com os custos de infraestrutura e atrações do evento.
              </p>
            </div>

            <div className="bg-[#151720] p-6 rounded-2xl border border-[#1e222e] space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Antifraude</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sistema de cobrança integrado ao Pagar.me V5 e Stripe com validação imediata de PIX e QR Code dinâmico anti-duplicação.
              </p>
            </div>

            <div className="bg-[#151720] p-6 rounded-2xl border border-[#1e222e] space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Encontre seu Público</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Nossa plataforma é focada no mercado automotivo, ao utilizar nossos serviços você terá acesso a um público altamente segmentado e interessado em Car Meets.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Powered by Digital Garage Gallery */}
      <section className="py-16 px-4 border-b border-[#1e222e]">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-mono font-bold text-dg-cyan uppercase tracking-widest">
                PROOF OF WORK
              </span>
              <h2 className="text-2xl lg:text-3xl font-righteous text-white tracking-tight mt-1">
                Car Meets Impulsionados Pela Digital Garage
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400 font-mono block">R$ 84.500+</span>
              <span className="text-xs text-zinc-500 font-mono">Processados em 7 encontros</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-[#1e222e] group">
              <img
                src="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80"
                alt="41Drift Meet"
                className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-3.5 space-y-1">
                <h4 className="text-xs font-bold text-white">41Drift - Noite do Terror</h4>
                <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-dg-cyan" /> Curitiba / PR
                </p>
                <div className="pt-2 border-t border-[#1e222e] flex items-center justify-between text-[10px] font-mono text-zinc-300">
                  <span>350+ Carros</span>
                  <span className="text-emerald-400 font-bold">Paddock VIP</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-[#1e222e] group">
              <img
                src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80"
                alt="JDM Experience"
                className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-3.5 space-y-1">
                <h4 className="text-xs font-bold text-white">JDM Experience Street</h4>
                <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-dg-cyan" /> Balneário Camboriú / SC
                </p>
                <div className="pt-2 border-t border-[#1e222e] flex items-center justify-between text-[10px] font-mono text-zinc-300">
                  <span>250+ Carros</span>
                  <span className="text-dg-cyan font-bold">Japanese Spec</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-[#1e222e] group">
              <img
                src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"
                alt="EuroStance Meet"
                className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-3.5 space-y-1">
                <h4 className="text-xs font-bold text-white">EuroStance Paddock</h4>
                <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-dg-cyan" /> São Paulo / SP
                </p>
                <div className="pt-2 border-t border-[#1e222e] flex items-center justify-between text-[10px] font-mono text-zinc-300">
                  <span>200+ Carros</span>
                  <span className="text-purple-400 font-bold">Stance & Fitment</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-[#1e222e] group">
              <img
                src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80"
                alt="Track Night Battle"
                className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="p-3.5 space-y-1">
                <h4 className="text-xs font-bold text-white">Track Night Battle</h4>
                <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-dg-cyan" /> Interlagos / SP
                </p>
                <div className="pt-2 border-t border-[#1e222e] flex items-center justify-between text-[10px] font-mono text-zinc-300">
                  <span>180+ Carros</span>
                  <span className="text-amber-400 font-bold">Pista & Exposição</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Payment Gateway Logos & Security */}
      <section className="py-12 px-4 bg-[#0f1117] border-b border-[#1e222e]">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-6">
          
          <div className="space-y-1 max-w-md">
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
              TECNOLOGIA DE PAGAMENTOS SEGUROS
            </span>
            <h3 className="text-lg font-bold text-white">PIX Instantâneo & Cartão Internacional</h3>
            <p className="text-xs text-zinc-400">
              Integração via webhooks de baixa latência. Receba confirmação automática e envio de passe via WhatsApp e E-mail em segundos.
            </p>
          </div>

          <div className="flex flex-wrap items-center">
            
            {/* Pagar.me Logo Card */}
            <div className="px-6 py-3.5 rounded-xl flex items-center justify-center">
              <img
                src="/pagarme-logo.svg"
                alt="Pagar.me V5 PIX"
                className="h-12 object-contain"
              />
            </div>

            {/* Stripe Logo Card */}
            <div className="px-6 py-3.5 rounded-xl flex items-center justify-center">
              <img
                src="/stripe-logo.png"
                alt="Stripe Payments"
                className="h-14 object-contain"
              />
            </div>

          </div>

        </div>
      </section>

      {/* Active Car Meets Catalog Section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-10">
            <span className="text-xs font-mono font-bold text-dg-cyan uppercase tracking-widest">
              AGENDA DE EVENTOS
            </span>
            <h2 className="text-2xl lg:text-3xl font-righteous text-white tracking-tight mt-1 mb-2">
              Próximos Car Meets Disponíveis
            </h2>
            <p className="text-xs text-zinc-400">Selecione um evento para garantir seu ingresso ou copie o link direto de vendas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-[#0f1117] rounded-2xl border border-[#1e222e] overflow-hidden flex flex-col justify-between hover:border-dg-cyan/40 transition-all group"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={ev.banner_url}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-[#08090b]/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#1e222e] text-xs font-mono font-bold text-dg-cyan">
                      {ev.city}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold text-white">{ev.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2">{ev.description}</p>

                    <div className="space-y-1.5 pt-2 text-xs text-zinc-300 font-mono">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-dg-cyan" />
                        <span>{ev.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{ev.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 flex gap-2">
                  <button
                    onClick={() => navigate(`/checkout?slug=${ev.slug}`)}
                    className="flex-1 py-3 bg-dg-cyan hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Ticket className="w-4 h-4" /> Comprar Ingresso
                  </button>

                  <button
                    onClick={() => handleCopyEventLink(ev.slug)}
                    className="px-4 py-3 bg-[#151720] hover:bg-zinc-800 text-zinc-300 border border-[#1e222e] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Copiar Link Direto para Divulgação no Instagram/WhatsApp"
                  >
                    {copiedSlug === ev.slug ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-dg-cyan" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedSlug === ev.slug ? 'Copiado!' : 'Link'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#050608] border-t border-[#1e222e] py-8 px-4 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/dg-com-br.png" alt="Digital Garage" className="h-6 w-auto object-contain" />
            <span>Digital Garage Ticketing System &copy; 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Pagar.me & Stripe Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
