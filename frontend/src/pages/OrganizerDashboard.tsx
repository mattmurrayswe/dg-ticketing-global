import React, { useEffect, useState } from 'react';
import { getOrganizerDashboard, fetchEvents, CarMeetEvent } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { Navbar } from '../components/Navbar';
import { GateScanner } from '../components/GateScanner';
import { CortesiaModal } from '../components/CortesiaModal';
import { OrganizerLoginModal } from '../components/OrganizerLoginModal';
import { EventConfigModal } from '../components/EventConfigModal';
import { DollarSign, Ticket, Car, CheckCircle2, Gift, Download, RefreshCw, Plus, LogOut, Users, Scan } from 'lucide-react';

interface OrganizerDashboardProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

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
  const [activeTab, setActiveTab] = useState<'scanner' | 'roster'>('scanner');

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

      {/* Sober Header Title */}
      <section className="bg-[#0f1117] border-b border-[#1e222e] py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <img src="/dg-com-br.png" alt="Digital Garage" className="h-7 w-auto object-contain" />
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                {organizerInfo?.name || 'ADMINISTRADOR'}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
              {t.organizerPortalTitle}
            </h1>
            <p className="text-xs text-zinc-400">Gestão financeira de bilheteria, check-in no portão e criação de novos eventos.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEventConfigModal(true)}
              className="px-4 py-2.5 bg-dg-cyan hover:bg-cyan-400 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Evento
            </button>

            <button
              type="button"
              onClick={() => setShowCortesiaModal(true)}
              className="px-4 py-2.5 bg-[#151720] hover:bg-zinc-800 text-white border border-[#1e222e] font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              <Gift className="w-4 h-4 text-dg-cyan" />
              {t.cortesiaTitle}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2.5 bg-[#151720] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-[#1e222e] rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Metrics Cards */}
      {data && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Revenue */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase">{t.totalRevenue}</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white font-mono block">
                  R$ {data.total_platform_revenue_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Histórico: R$ {data.historical_baseline_brl.toLocaleString('pt-BR')} (7 eventos)
                </span>
              </div>
            </div>

            {/* Tickets Sold */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase">{t.ticketsSold}</span>
                <div className="p-2 rounded-lg bg-dg-cyan/10 text-dg-cyan">
                  <Ticket className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white font-mono block">
                  {data.total_tickets_sold}
                </span>
                <span className="text-[10px] text-dg-cyan font-mono">Ingressos confirmados</span>
              </div>
            </div>

            {/* Cars Registered */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase">{t.carsRegistered}</span>
                <div className="p-2 rounded-lg bg-zinc-800 text-white">
                  <Car className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white font-mono block">
                  {data.total_cars_registered}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Expositores Paddock</span>
              </div>
            </div>

            {/* Check-ins */}
            <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 uppercase">{t.checkedIn}</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-white font-mono block">
                  {data.total_checked_in}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Portão validado</span>
              </div>
            </div>

          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-8 mb-6 border-b border-[#1e222e] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'scanner' ? 'bg-dg-cyan text-black font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Scan className="w-4 h-4" /> Leitor de Portão (Check-in)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'roster' ? 'bg-dg-cyan text-black font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> Lista de Ingressos & Veículos
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
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Relação Recente de Compradores</h3>
                <button
                  type="button"
                  onClick={exportRosterCSV}
                  className="px-4 py-2 bg-[#151720] hover:bg-zinc-800 text-dg-cyan border border-[#1e222e] font-bold rounded-lg text-xs transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> {t.exportRoster}
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
                        <td className="py-3 px-3 font-bold text-dg-cyan">{o.order_code}</td>
                        <td className="py-3 px-3 font-sans font-semibold text-white">{o.buyer_name}</td>
                        <td className="py-3 px-3">{o.car_model}</td>
                        <td className="py-3 px-3 font-bold text-white">{o.license_plate}</td>
                        <td className="py-3 px-3">R$ {o.amount_brl.toFixed(2)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {o.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {o.checked_in ? (
                            <span className="text-emerald-400 font-bold">CHECKED-IN</span>
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
