import React, { useState } from 'react';
import { issueCortesia } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { X, Gift, CheckCircle2, Loader2, Car, User, Mail, Phone } from 'lucide-react';

interface CortesiaModalProps {
  currentLang: Language;
  events: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CortesiaModal: React.FC<CortesiaModalProps> = ({ currentLang, events, onClose, onSuccess }) => {
  const t = translations[currentLang];
  const [selectedEventId, setSelectedEventId] = useState<number>(events[0]?.id || 1);
  const [selectedTierId, setSelectedTierId] = useState<number>(events[0]?.tiers[0]?.id || 1);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeEvent = events.find(e => e.id === selectedEventId) || events[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;
    setLoading(true);
    setSuccessMsg(null);

    try {
      const res = await issueCortesia({
        event_id: selectedEventId,
        ticket_tier_id: selectedTierId,
        recipient_name: name,
        recipient_email: email,
        recipient_phone: phone,
        car_make: carMake || undefined,
        car_model: carModel || undefined,
        license_plate: licensePlate || undefined,
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      alert('Erro ao emitir cortesia: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-dg-card border border-dg-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-dg-purple to-dg-red p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Gift className="w-5 h-5" />
            <h3 className="font-black text-base uppercase tracking-wider">{t.cortesiaTitle}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMsg ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl text-center text-emerald-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-sm">{successMsg}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Evento Target</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedEventId(id);
                    const ev = events.find(x => x.id === id);
                    if (ev && ev.tiers.length > 0) setSelectedTierId(ev.tiers[0].id);
                  }}
                  className="w-full bg-dg-dark border border-dg-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Categoria do Pass</label>
                <select
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(Number(e.target.value))}
                  className="w-full bg-dg-dark border border-dg-border rounded-lg px-3 py-2 text-xs text-white"
                >
                  {activeEvent?.tiers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">{t.recipientName} *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome Completo"
                  className="w-full bg-dg-dark border border-dg-border rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">{t.recipientEmail} *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@dominio.com"
                    className="w-full bg-dg-dark border border-dg-border rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">{t.recipientPhone} *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(41) 99999-9999"
                    className="w-full bg-dg-dark border border-dg-border rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-dg-border">
                <span className="text-[11px] font-bold text-dg-cyan uppercase tracking-wider block mb-2">Dados do Veículo (Opcional)</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={carMake}
                    onChange={(e) => setCarMake(e.target.value)}
                    placeholder="Marca"
                    className="bg-dg-dark border border-dg-border rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    placeholder="Modelo"
                    className="bg-dg-dark border border-dg-border rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    placeholder="Placa"
                    className="bg-dg-dark border border-dg-border rounded-lg px-2 py-1.5 text-xs text-white uppercase font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-dg-purple hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.issueCortesia}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
