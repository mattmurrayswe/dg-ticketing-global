import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizerDashboard, fetchEvents, CarMeetEvent } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { Navbar } from '../components/Navbar';
import { GateScanner } from '../components/GateScanner';
import { CortesiaModal } from '../components/CortesiaModal';
import { OrganizerLoginModal } from '../components/OrganizerLoginModal';
import { EventConfigModal } from '../components/EventConfigModal';
import {
  DollarSign,
  Ticket,
  Car,
  CheckCircle2,
  Gift,
  Download,
  LogOut,
  Users,
  Scan,
  Copy,
  Check,
  Calendar,
  MapPin,
} from 'lucide-react';

interface OrganizerDashboardV2Props {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const RotationalGlobe: React.FC<{ size?: number }> = ({ size = 96 }) => (
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

export const OrganizerDashboardV2: React.FC<OrganizerDashboardV2Props> = ({
  currentLang,
  onLanguageChange,
}) => {
  const t = translations[currentLang];
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('dg_organizer_token')
  );
  const [organizerInfo, setOrganizerInfo] = useState<any | null>(() => {
    const raw = localStorage.getItem('dg_organizer_info');
    return raw ? JSON.parse(raw) : null;
  });

  const [data, setData] = useState<any | null>(null);
  const [events, setEvents] = useState<CarMeetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modals & Tabs
  const [showCortesiaModal, setShowCortesiaModal] = useState(false);
  const [showEventConfigModal, setShowEventConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'roster'>('scanner');

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [dash, evs] = await Promise.all([
        getOrganizerDashboard(),
        fetchEvents(),
      ]);
      setData(dash);
      setEvents(evs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleLoginSuccess = (newToken: string, organizer: any) => {
    localStorage.setItem('dg_organizer_token', newToken);
    localStorage.setItem('dg_organizer_info', JSON.stringify(organizer));
    setToken(newToken);
    setOrganizerInfo(organizer);
  };

  const handleLogout = () => {
    localStorage.removeItem('dg_organizer_token');
    localStorage.removeItem('dg_organizer_info');
    setToken(null);
    setOrganizerInfo(null);
  };

  const handleCopyEventLink = (slug: string) => {
    const link = `${window.location.origin}/checkout?slug=${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const exportRosterCSV = () => {
    if (!data || !data.recent_orders) return;
    const headers = [
      'Order Code',
      'Buyer Name',
      'Buyer Email',
      'Car Model',
      'License Plate',
      'Amount BRL',
      'Status',
      'Checked-in',
    ];
    const rows = data.recent_orders.map((o: any) => [
      o.order_code,
      `"${o.buyer_name}"`,
      o.buyer_email,
      `"${o.car_model}"`,
      o.license_plate,
      o.amount_brl,
      o.payment_status,
      o.checked_in ? 'SIM' : 'NÃO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `digital_garage_roster_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!token) {
    return (
      <OrganizerLoginModal
        currentLang={currentLang}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08090b] text-white flex flex-col font-sans">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      {/* Editorial Hero Section matching LandingPage.tsx */}
      <section className="relative pt-14 pb-12 px-4 sm:px-8 border-b border-[#1e222e] bg-gradient-to-b from-[#0d0e14] to-[#08090b]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-1">
              <p className="font-markazi text-[1.6rem] text-zinc-400 leading-tight">
                {(organizerInfo?.name === 'Digital Garage Master Admin' ? 'Master Admin' : organizerInfo?.name) || 'De GearHead para GearHead'}
              </p>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                ONLINE
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-medium font-markazi text-white tracking-wide mb-2 leading-tight">
              {t.organizerPortalTitle}
            </h1>

            <p className="font-markazi text-xl text-zinc-400 max-w-2xl leading-snug mb-6">
              Gestão financeira de bilheteria, repasse antecipado, check-in no
              portão e criação de novos eventos automotivos.
            </p>

            {/* Landing-style Editorial CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/criar-evento"
                className="underline underline-offset-4 decoration-zinc-700 border-2 border-[#1e222e] hover:border-white/40 rounded-md px-6 py-2 font-markazi text-xl bg-gradient-to-tr from-black to-[#0f1117] text-white transition inline-flex items-center"
              >
                + Criar Novo Evento
              </Link>

              <button
                type="button"
                onClick={() => setShowCortesiaModal(true)}
                className="px-4 py-2.5 bg-[#151720] hover:bg-zinc-800 text-white border border-[#1e222e] font-bold rounded-md text-xs uppercase tracking-wider transition inline-flex items-center gap-2"
              >
                <Gift className="w-4 h-4 text-white" aria-hidden="true" />
                {t.cortesiaTitle}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2.5 bg-[#151720] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-[#1e222e] rounded-md transition inline-flex items-center gap-1.5 text-xs font-bold"
                title="Sair da Conta"
                aria-label="Sair da Conta"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end gap-5 shrink-0">
            <RotationalGlobe size={96} />
            <div className="flex items-center gap-4 opacity-80">
              <img
                src="/pagarme-logo.svg"
                alt="Pagar.me V5 PIX"
                className="h-6 object-contain"
              />
              <img
                src="/stripe-logo.png"
                alt="Stripe Payments"
                className="h-6 object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 space-y-10">
        {/* Metrics Overview */}
        {loading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-32 rounded-xl bg-[#0f1117] border border-[#1e222e] animate-pulse"
              />
            ))}
          </div>
        ) : (
          data && (
            <>
              <section aria-label="Métricas da Plataforma">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Revenue */}
                  <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400 uppercase">
                        {t.totalRevenue}
                      </span>
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <DollarSign className="w-5 h-5" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-black text-white font-mono block">
                        R${' '}
                        {data.total_platform_revenue_brl.toLocaleString(
                          'pt-BR',
                          { minimumFractionDigits: 2 }
                        )}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Histórico: R${' '}
                        {data.historical_baseline_brl.toLocaleString('pt-BR')}{' '}
                        (7 eventos)
                      </span>
                    </div>
                  </div>

                  {/* Tickets Sold */}
                  <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400 uppercase">
                        {t.ticketsSold}
                      </span>
                      <div className="p-2 rounded-lg bg-white/10 text-white">
                        <Ticket className="w-5 h-5" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-black text-white font-mono block">
                        {data.total_tickets_sold}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Ingressos confirmados
                      </span>
                    </div>
                  </div>

                  {/* Cars Registered */}
                  <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400 uppercase">
                        {t.carsRegistered}
                      </span>
                      <div className="p-2 rounded-lg bg-white/10 text-white">
                        <Car className="w-5 h-5" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-black text-white font-mono block">
                        {data.total_cars_registered}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Expositores Paddock
                      </span>
                    </div>
                  </div>

                  {/* Check-ins */}
                  <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400 uppercase">
                        {t.checkedIn}
                      </span>
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-2xl font-black text-white font-mono block">
                        {data.total_checked_in}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Portão validado
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Operations: Gate Scanner & Roster */}
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e222e] pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('scanner')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === 'scanner'
                          ? 'bg-white text-black font-extrabold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Scan className="w-4 h-4" aria-hidden="true" /> Leitor de
                      Portão (Check-in)
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('roster')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === 'roster'
                          ? 'bg-white text-black font-extrabold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4" aria-hidden="true" /> Lista de
                      Ingressos & Veículos
                    </button>
                  </div>

                  <Link
                    to="/organizer"
                    className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
                  >
                    Acessar Painel Clássico (v1)
                  </Link>
                </div>

                {activeTab === 'scanner' && (
                  <div className="rounded-2xl bg-[#0f1117] border border-[#1e222e] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
                    <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
                      <GateScanner currentLang={currentLang} />
                    </div>
                    <div className="lg:col-span-5 relative min-h-[260px] bg-[#151720] border-t lg:border-t-0 lg:border-l border-[#1e222e]">
                      <img
                        src="/dg-photo-scanning.png"
                        alt="Digital Garage Gate Scanning"
                        className="w-full h-full object-cover block"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'roster' && (
                  <div className="bg-[#0f1117] p-6 rounded-2xl border border-[#1e222e] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-lg text-white">
                        Relação Recente de Compradores
                      </h2>
                      <button
                        type="button"
                        onClick={exportRosterCSV}
                        className="px-4 py-2 bg-[#151720] hover:bg-zinc-800 text-white border border-[#1e222e] font-bold rounded-lg text-xs transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />{' '}
                        {t.exportRoster}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-[#1e222e] text-zinc-400 uppercase text-[10px]">
                            <th scope="col" className="py-3 px-3">
                              Código
                            </th>
                            <th scope="col" className="py-3 px-3">
                              Comprador
                            </th>
                            <th scope="col" className="py-3 px-3">
                              Veículo
                            </th>
                            <th scope="col" className="py-3 px-3">
                              Placa
                            </th>
                            <th scope="col" className="py-3 px-3">
                              Valor
                            </th>
                            <th scope="col" className="py-3 px-3">
                              Status
                            </th>
                            <th scope="col" className="py-3 px-3">
                              Portão
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e222e] text-zinc-200">
                          {data.recent_orders.map((o: any) => (
                            <tr
                              key={o.order_code}
                              className="hover:bg-[#151720]"
                            >
                              <td className="py-3 px-3 font-bold text-white">
                                {o.order_code}
                              </td>
                              <td className="py-3 px-3 font-sans font-semibold text-white">
                                {o.buyer_name}
                              </td>
                              <td className="py-3 px-3">{o.car_model}</td>
                              <td className="py-3 px-3 font-bold text-white">
                                {o.license_plate}
                              </td>
                              <td className="py-3 px-3">
                                R$ {o.amount_brl.toFixed(2)}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    o.payment_status === 'paid'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {o.payment_status}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {o.checked_in ? (
                                  <span className="text-emerald-400 font-bold">
                                    CHECKED-IN
                                  </span>
                                ) : (
                                  <span className="text-zinc-500">
                                    Pendente
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* Active Events Strip with Quick Share */}
              {events.length > 0 && (
                <section className="rounded-2xl bg-[#0f1117] border border-[#1e222e] p-6 sm:p-8 space-y-5">
                  <div>
                    <h2 className="text-2xl text-white">
                      Eventos Ativos & Links de Venda
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      Copie o link direto de checkout para divulgar nos seus
                      canais.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 rounded-xl bg-[#151720]/70 border border-[#1e222e] flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={ev.banner_url}
                            alt={ev.title}
                            className="w-16 h-16 rounded-lg object-cover border border-[#1e222e] shrink-0"
                          />
                          <div className="min-w-0">
                            <h3 className="text-sm text-white truncate">
                              {ev.title}
                            </h3>
                            <p className="text-xs font-mono text-zinc-400 flex items-center gap-1 mt-1 truncate">
                              <Calendar
                                className="w-3 h-3 shrink-0"
                                aria-hidden="true"
                              />
                              {ev.date}
                            </p>
                            <p className="text-xs font-mono text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin
                                className="w-3 h-3 shrink-0"
                                aria-hidden="true"
                              />
                              {ev.city}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyEventLink(ev.slug)}
                          className="px-3 py-2 rounded-lg bg-[#0f1117] border border-[#1e222e] hover:border-zinc-600 text-xs font-mono text-zinc-300 hover:text-white inline-flex items-center gap-1.5 shrink-0 transition"
                        >
                          {copiedSlug === ev.slug ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Link
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )
        )}
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
                Organizador (v1)
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Cortesia Modal */}
      {showCortesiaModal && (
        <CortesiaModal
          currentLang={currentLang}
          events={events}
          onClose={() => setShowCortesiaModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Event Config Wizard Modal */}
      {showEventConfigModal && (
        <EventConfigModal
          currentLang={currentLang}
          onClose={() => setShowEventConfigModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
