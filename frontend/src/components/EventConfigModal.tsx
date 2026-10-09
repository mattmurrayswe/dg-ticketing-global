import React, { useState } from 'react';
import { createNewEvent } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { X, Plus, Trash2, Sparkles, Loader2, CheckCircle2, Copy, Check, Share2, ExternalLink } from 'lucide-react';

interface EventConfigModalProps {
  currentLang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export const EventConfigModal: React.FC<EventConfigModalProps> = ({ currentLang, onClose, onSuccess }) => {
  const t = translations[currentLang];
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');

  // Configured Ticket Tiers
  const [tiers, setTiers] = useState<any[]>([
    {
      name: 'Ingresso Expositor Paddock VIP',
      badge: 'legendary',
      price_brl: 140.0,
      price_usd: 28.0,
      price_eur: 26.0,
      quantity_total: 100,
      requires_car_specs: true,
      perks: ['Vaga Paddock VIP', 'Adesivo Exclusivo', 'Foto Profissional']
    },
    {
      name: 'Ingresso Pedestre / Espectador',
      badge: 'uncommon',
      price_brl: 50.0,
      price_usd: 10.0,
      price_eur: 9.0,
      quantity_total: 500,
      requires_car_specs: false,
      perks: ['Acesso ao Evento', 'Área de Alimentação']
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleAddTier = () => {
    setTiers([
      ...tiers,
      {
        name: 'Novo Lote de Ingresso',
        badge: 'rare',
        price_brl: 80.0,
        price_usd: 16.0,
        price_eur: 15.0,
        quantity_total: 150,
        requires_car_specs: false,
        perks: ['Acesso Livre']
      }
    ]);
  };

  const handleRemoveTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: string, value: any) => {
    const updated = [...tiers];
    updated[index][field] = value;
    setTiers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !location || !city || tiers.length === 0) return;

    setLoading(true);
    setSuccessMsg(null);
    setCreatedSlug(null);

    try {
      const res = await createNewEvent({
        title,
        subtitle: subtitle || undefined,
        date,
        location,
        city,
        banner_url: bannerUrl || undefined,
        description: description || undefined,
        tiers
      });

      setSuccessMsg(res.message);
      setCreatedSlug(res.slug);
      onSuccess();
    } catch (err: any) {
      alert('Erro ao criar evento: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const generatedCheckoutUrl = createdSlug ? `${window.location.origin}/checkout?slug=${createdSlug}` : '';

  const handleCopyLink = () => {
    if (!generatedCheckoutUrl) return;
    navigator.clipboard.writeText(generatedCheckoutUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0f1117] border border-[#1e222e] rounded-2xl shadow-2xl overflow-hidden animate-fadeIn my-8">
        
        {/* Header */}
        <div className="bg-[#151720] border-b border-[#1e222e] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-dg-cyan" />
            <h3 className="font-black text-sm uppercase tracking-wider">Criar & Configurar Novo Car Meet</h3>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {successMsg ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-4 animate-fadeIn">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h4 className="text-lg font-black text-white">{successMsg}</h4>
                <p className="text-xs text-emerald-300 mt-1">O novo evento já está no ar e pronto para receber compras.</p>
              </div>

              {/* Dedicated Sales Link Box */}
              <div className="bg-[#08090b] p-4 rounded-xl border border-dg-cyan/40 text-left space-y-2">
                <span className="text-[10px] font-mono font-bold text-dg-cyan uppercase tracking-widest block">
                  LINK DEDICADO DE VENDAS / INSTAGRAM BIO
                </span>
                <input
                  type="text"
                  readOnly
                  value={generatedCheckoutUrl}
                  className="w-full bg-[#151720] border border-[#1e222e] rounded-lg px-3 py-2 text-xs font-mono text-white select-all"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 bg-dg-cyan hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Link Copiado!' : 'Copiar Link de Vendas'}
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Garanta seu ingresso para o ${title}! Acesse: ${generatedCheckoutUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                }}
                className="px-6 py-3 bg-[#151720] hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-[#1e222e] transition"
              >
                Concluir & Ir ao Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Event Basic Specs */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-dg-cyan uppercase tracking-widest border-b border-[#1e222e] pb-1">
                  1. Informações Principais do Evento
                </h4>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Título do Evento *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Hoodster Vale Sul Meet 2026"
                    className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Subtítulo / Edição</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="ex: 1st Annual Edition"
                      className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Data & Horário *</label>
                    <input
                      type="text"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="2026-12-05 14:00 BRT"
                      className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Local do Evento *</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="ex: Vale Sul Shopping Paddock"
                      className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Cidade / Estado *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="ex: São José dos Campos / SP"
                      className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">URL da Imagem de Banner</label>
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Descrição do Evento</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes da programação, atrações e regulamento..."
                    className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Dynamic Ticket Tiers Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[#1e222e] pb-1">
                  <h4 className="text-xs font-mono font-bold text-dg-cyan uppercase tracking-widest">
                    2. Configuração de Lotes & Ingressos ({tiers.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="px-3 py-1 bg-[#151720] text-dg-cyan border border-dg-cyan/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Lote
                  </button>
                </div>

                <div className="space-y-4">
                  {tiers.map((tier, idx) => (
                    <div key={idx} className="bg-[#151720] p-4 rounded-xl border border-[#1e222e] relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                          Lote #{idx + 1}
                        </span>
                        {tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTier(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-1">Nome da Categoria</label>
                          <input
                            type="text"
                            required
                            value={tier.name}
                            onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                            className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-1">Badge de Raridade</label>
                          <select
                            value={tier.badge}
                            onChange={(e) => handleTierChange(idx, 'badge', e.target.value)}
                            className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="uncommon">Uncommon (Comum)</option>
                            <option value="rare">Rare (Raro)</option>
                            <option value="epic">Epic (Épico)</option>
                            <option value="legendary">Legendary (Lendário)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Preço R$</label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.price_brl}
                            onChange={(e) => handleTierChange(idx, 'price_brl', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Preço $</label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.price_usd}
                            onChange={(e) => handleTierChange(idx, 'price_usd', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Preço €</label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.price_eur}
                            onChange={(e) => handleTierChange(idx, 'price_eur', parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Vagas Disp.</label>
                          <input
                            type="number"
                            value={tier.quantity_total}
                            onChange={(e) => handleTierChange(idx, 'quantity_total', parseInt(e.target.value) || 0)}
                            className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id={`specs-${idx}`}
                          checked={tier.requires_car_specs}
                          onChange={(e) => handleTierChange(idx, 'requires_car_specs', e.target.checked)}
                          className="rounded bg-[#08090b] border-[#1e222e] text-dg-cyan focus:ring-0"
                        />
                        <label htmlFor={`specs-${idx}`} className="text-xs text-zinc-300 font-semibold cursor-pointer">
                          Exige cadastro do veículo pelo comprador (Ingresso Expositor)
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-dg-cyan hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 mt-6"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar & Publicar Novo Evento'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
