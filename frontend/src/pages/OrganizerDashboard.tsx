import React, { useEffect, useState } from 'react';
import { BarChart2 } from 'lucide-react';
import { getOrganizerDashboard, fetchEvents, CarMeetEvent } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { Navbar } from '../components/Navbar';
import { GateScanner } from '../components/GateScanner';
import { CortesiaModal } from '../components/CortesiaModal';
import { OrganizerLoginModal } from '../components/OrganizerLoginModal';
import { EventConfigModal } from '../components/EventConfigModal';

interface OrganizerDashboardProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

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

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({ currentLang, onLanguageChange }) => {
  const t = translations[currentLang];
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dg_organizer_token'));
  const [organizerInfo, setOrganizerInfo] = useState<any | null>(() => {
    const raw = localStorage.getItem('dg_organizer_info');
    return raw ? JSON.parse(raw) : null;
  });

  const [data, setData] = useState<any | null>(null);
  const [events, setEvents] = useState<CarMeetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCortesiaModal, setShowCortesiaModal] = useState(false);
  const [showEventConfigModal, setShowEventConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'scanner' | 'roster'>('roster');

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const dash = await getOrganizerDashboard();
      const evs = await fetchEvents();
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

  const exportRosterCSV = () => {
    if (!data || !data.recent_orders) return;
    const headers = ["Order Code", "Buyer Name", "Buyer Email", "Car Model", "License Plate", "Amount BRL", "Status", "Checked-in"];
    const rows = data.recent_orders.map((o: any) => [
      o.order_code,
      `"${o.buyer_name}"`,
      o.buyer_email,
      `"${o.car_model}"`,
      o.license_plate,
      o.amount_brl,
      o.payment_status,
      o.checked_in ? "SIM" : "NÃO"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `digital_garage_roster_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!token) {
    return <OrganizerLoginModal currentLang={currentLang} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#08090b] text-white pb-20">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      {/* Editorial Hero (matching FindEventsV2.tsx) */}
      <section className="relative pt-14 pb-12 px-4 sm:px-8 border-b border-[#1e222e] bg-gradient-to-b from-[#0d0e14] to-[#08090b]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="font-markazi text-[1.6rem] text-zinc-400 leading-tight">
                {(organizerInfo?.name === 'Digital Garage Master Admin' ? 'Master Admin' : organizerInfo?.name) || 'De GearHead para GearHead'}
              </p>
              <h1 className="text-4xl lg:text-4xl font-medium font-markazi text-white tracking-wide leading-tight flex items-center gap-3">
                <BarChart2 className="w-7 h-7 shrink-0" aria-hidden="true" />
                <span>{t.organizerPortalTitle}</span>
              </h1>
              <p className="font-markazi text-lg text-zinc-400 max-w-xl leading-snug">
                Gestão financeira da sua bilheteria, criação de novos eventos e ingressos cortesia.
              </p>
            </div>

            <div className="relative hidden md:flex items-center justify-center w-[88px] h-[88px] shrink-0">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <RotationalGlobe size={120} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <section className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowEventConfigModal(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-bold transition-all bg-[#15171e] text-white border border-white/30 hover:border-white/50"
          >
            Criar Novo Evento
          </button>

          <button
            type="button"
            onClick={() => setShowCortesiaModal(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-bold transition-all bg-[#0f1117] text-zinc-300 hover:text-white border border-[#1e222e] hover:border-white/30"
          >
            {t.cortesiaTitle}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-lg text-xs font-bold transition-all bg-[#0f1117] text-zinc-400 hover:text-white border border-[#1e222e] hover:border-white/30"
          >
            Sair
          </button>
        </div>
      </section>

      {/* Metrics Cards */}
      {data && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Revenue */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <span className="text-sm text-zinc-400">{t.totalRevenue}</span>
              <div className="mt-1">
                <span className="text-2xl font-black text-white block">
                  R$ {data.total_platform_revenue_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400">
                  Histórico: R$ {data.historical_baseline_brl.toLocaleString('pt-BR')} (7 eventos)
                </span>
              </div>
            </div>

            {/* Tickets Sold */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <span className="text-sm text-zinc-400">{t.ticketsSold}</span>
              <div className="mt-1">
                <span className="text-2xl font-black text-white block">
                  {data.total_tickets_sold}
                </span>
                <span className="text-[10px] text-zinc-400">Ingressos confirmados</span>
              </div>
            </div>

            {/* Cars Registered */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <span className="text-sm text-zinc-400">{t.carsRegistered}</span>
              <div className="mt-1">
                <span className="text-2xl font-black text-white block">
                  {data.total_cars_registered}
                </span>
                <span className="text-[10px] text-zinc-400">Expositores Paddock</span>
              </div>
            </div>

            {/* Check-ins */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <span className="text-sm text-zinc-400">{t.checkedIn}</span>
              <div className="mt-1">
                <span className="text-2xl font-black text-white block">
                  {data.total_checked_in}
                </span>
                <span className="text-[10px] text-zinc-400">Portão validado</span>
              </div>
            </div>

          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-8 mb-6 border-b border-[#1e222e] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'roster'
                  ? 'bg-[#15171e] text-white border border-white/30'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Lista de Ingressos & Veículos
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-[#15171e] text-white border border-white/30'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              Leitor de Portão (Check-in)
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === 'scanner' && (
            <div className="max-w-2xl mx-auto">
              <GateScanner currentLang={currentLang} />
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="bg-[#0f1117] p-6 rounded-xl border border-[#1e222e] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Compradores Recentes</h3>
                <button
                  type="button"
                  onClick={exportRosterCSV}
                  className="px-3 py-2 rounded-lg text-xs font-bold transition-all bg-[#15171e] text-white border border-white/30 hover:border-white/50"
                >
                  {t.exportRoster}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1e222e] text-zinc-400 uppercase text-[10px]">
                      <th className="py-3 px-3">Código</th>
                      <th className="py-3 px-3">Comprador</th>
                      <th className="py-3 px-3">Veículo</th>
                      <th className="py-3 px-3">Placa</th>
                      <th className="py-3 px-3">Valor</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Portão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e222e] text-zinc-200">
                    {data.recent_orders.map((o: any) => (
                      <tr key={o.order_code} className="hover:bg-[#151720]">
                        <td className="py-3 px-3 font-bold text-white">{o.order_code}</td>
                        <td className="py-3 px-3 font-sans font-semibold text-white">{o.buyer_name}</td>
                        <td className="py-3 px-3">{o.car_model}</td>
                        <td className="py-3 px-3 font-bold text-white">{o.license_plate}</td>
                        <td className="py-3 px-3">R$ {o.amount_brl.toFixed(2)}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#151720] text-zinc-300 border border-[#1e222e]">
                            {o.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {o.checked_in ? (
                            <span className="text-white font-bold">CHECKED-IN</span>
                          ) : (
                            <span className="text-zinc-500">Pendente</span>
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
      )}

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
