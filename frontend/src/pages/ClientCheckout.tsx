import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchEvents, createCheckout, CarMeetEvent, TicketTier } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { CouponInput } from '../components/CouponInput';
import { TicketPassModal } from '../components/TicketPassModal';
import { Navbar } from '../components/Navbar';
import { Car, Ticket, Calendar, MapPin, QrCode, CreditCard, Check, Copy, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

interface ClientCheckoutProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const ClientCheckout: React.FC<ClientCheckoutProps> = ({ currentLang, onLanguageChange }) => {
  const [searchParams] = useSearchParams();
  const slugParam = searchParams.get('slug');
  const eventIdParam = searchParams.get('event_id');
  const isDedicatedView = Boolean(slugParam || eventIdParam);

  const t = translations[currentLang];
  const [events, setEvents] = useState<CarMeetEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CarMeetEvent | null>(null);
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);

  // Currency
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');

  // Buyer Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');

  // Vehicle Info
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountBrl, setDiscountBrl] = useState<number>(0);
  const [finalAmountBrl, setFinalAmountBrl] = useState<number>(0);

  // Checkout process
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    fetchEvents().then((data) => {
      setEvents(data);
      if (data.length > 0) {
        const target = data.find((e) => e.slug === slugParam || String(e.id) === eventIdParam) || data[0];
        setSelectedEvent(target);
        if (target.tiers.length > 0) {
          setSelectedTier(target.tiers[0]);
          setFinalAmountBrl(target.tiers[0].price_brl);
        }
      }
    });
  }, [slugParam, eventIdParam]);

  const handleTierSelect = (tier: TicketTier) => {
    setSelectedTier(tier);
    setAppliedCoupon(null);
    setDiscountBrl(0);
    setFinalAmountBrl(tier.price_brl);
  };

  const handleCouponApplied = (code: string, discBrl: number, finalBrl: number) => {
    setAppliedCoupon(code);
    setDiscountBrl(discBrl);
    setFinalAmountBrl(finalBrl);
  };

  const getDisplayedPrice = (tier: TicketTier) => {
    let p = currency === 'USD' ? tier.price_usd : currency === 'EUR' ? tier.price_eur : tier.price_brl;
    let symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'R$';
    return `${symbol} ${p.toFixed(2)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedTier || !name || !email || !phone) return;

    if (selectedTier.requires_car_specs && (!make || !model || !plate)) {
      alert('Por favor preencha os dados do veículo (Marca, Modelo e Placa).');
      return;
    }

    setLoading(true);
    try {
      const res = await createCheckout({
        event_id: selectedEvent.id,
        ticket_tier_id: selectedTier.id,
        buyer_name: name,
        buyer_email: email,
        buyer_phone: phone,
        cpf_cnpj: cpf || undefined,
        car_make: make || undefined,
        car_model: model || undefined,
        car_year: year || undefined,
        car_color: color || undefined,
        license_plate: plate ? plate.toUpperCase() : undefined,
        coupon_code: appliedCoupon || undefined,
        payment_method: paymentMethod,
        currency: currency
      });

      setOrderResult({
        ...res,
        event_title: selectedEvent.title,
        event_date: selectedEvent.date,
        event_location: selectedEvent.location,
        tier_name: selectedTier.name,
        car_make: make,
        car_model: model,
        license_plate: plate
      });
    } catch (err: any) {
      alert('Erro no checkout: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const copyPixToClipboard = () => {
    if (orderResult?.payment_details?.pix_copy_paste) {
      navigator.clipboard.writeText(orderResult.payment_details.pix_copy_paste);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090b] text-white pb-20">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      {/* Dedicated Event Header or Multi-Event Selector */}
      <section className="bg-[#0f1117] border-b border-[#1e222e] py-6 px-4">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Dedicated Event View vs Multi-Event Catalog View */}
          {isDedicatedView && selectedEvent ? (
            <div className="p-4 rounded-xl bg-[#151720] border border-dg-cyan/40 max-w-2xl mx-auto flex items-center gap-4 text-left shadow-neonCyan animate-fadeIn">
              <img
                src={selectedEvent.banner_url}
                alt={selectedEvent.title}
                className="w-20 h-20 rounded-xl object-cover border border-[#1e222e]"
              />
              <div className="overflow-hidden">
                <span className="px-2.5 py-0.5 rounded-full bg-dg-cyan/10 text-dg-cyan text-[10px] font-mono font-bold uppercase border border-dg-cyan/30">
                  Ingressos Oficiais do Evento
                </span>
                <h2 className="text-lg font-bold text-white mt-1 truncate">{selectedEvent.title}</h2>
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-dg-cyan" /> {selectedEvent.date} &bull; <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {selectedEvent.city}
                </p>
              </div>
            </div>
          ) : (
            /* Event Selector Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mt-8 text-left">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    if (ev.tiers.length > 0) handleTierSelect(ev.tiers[0]);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-3.5 items-center ${
                    selectedEvent?.id === ev.id
                      ? 'bg-[#151720] border-dg-cyan shadow-neonCyan scale-[1.01]'
                      : 'bg-[#111218] border-[#1e222e] hover:border-zinc-700'
                  }`}
                >
                  <img
                    src={ev.banner_url}
                    alt={ev.title}
                    className="w-16 h-16 rounded-lg object-cover border border-[#1e222e]"
                  />
                  <div className="overflow-hidden">
                    <h3 className="text-xs font-bold text-white truncate">{ev.title}</h3>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1 truncate">
                      <Calendar className="w-3 h-3 text-dg-cyan" /> {ev.date}
                    </p>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-zinc-400" /> {ev.city}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Checkout Section */}
      {selectedEvent && (
        <main className="max-w-5xl mx-auto px-4 mt-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column - Tiers & Specs */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Currency Selector Header */}
              <div className="flex items-center justify-between bg-[#0f1117] p-3.5 rounded-xl border border-[#1e222e]">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Moeda de Exibição</span>
                <div className="flex gap-1">
                  {(['BRL', 'USD', 'EUR'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        currency === c ? 'bg-dg-cyan text-black' : 'bg-[#151720] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {c === 'BRL' ? 'R$ BRL' : c === 'USD' ? '$ USD' : '€ EUR'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Selection */}
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-dg-cyan" />
                  1. Categoria do Ingresso
                </h3>

                <div className="space-y-3">
                  {selectedEvent.tiers.map((tItem) => (
                    <div
                      key={tItem.id}
                      onClick={() => handleTierSelect(tItem)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedTier?.id === tItem.id
                          ? 'bg-[#151720] border-dg-cyan shadow-neonCyan'
                          : 'bg-[#0f1117] border-[#1e222e] hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{tItem.name}</h4>
                            {tItem.requires_car_specs && (
                              <span className="px-2 py-0.5 rounded bg-dg-cyan/10 text-dg-cyan text-[10px] font-mono uppercase font-bold border border-dg-cyan/30">
                                Expositor
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">
                            {tItem.requires_car_specs ? t.requiresSpecs : 'Entrada livre para pedestres'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-dg-cyan font-mono block">
                            {getDisplayedPrice(tItem)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {tItem.quantity_total - tItem.quantity_sold} vagas restantes
                          </span>
                        </div>
                      </div>

                      {/* Perks */}
                      {tItem.perks && tItem.perks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#1e222e] flex flex-wrap gap-2">
                          {tItem.perks.map((p, idx) => (
                            <span key={idx} className="text-[11px] text-zinc-300 bg-[#08090b] px-2.5 py-1 rounded-md border border-[#1e222e] flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" /> {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vehicle Registration Form */}
              {selectedTier?.requires_car_specs && (
                <div className="bg-[#0f1117] p-5 rounded-xl border border-dg-cyan/40 shadow-neonCyan animate-fadeIn space-y-4">
                  <h3 className="text-xs font-black text-dg-cyan uppercase tracking-wider flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    2. {t.vehicleFormTitle}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t.make} *</label>
                      <input
                        type="text"
                        required
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder="ex: Nissan, Porsche"
                        className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t.model} *</label>
                      <input
                        type="text"
                        required
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="ex: Skyline R34, 911 GT3"
                        className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t.year}</label>
                      <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="ex: 1999"
                        className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t.color}</label>
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="ex: Azul Bayside"
                        className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t.plate} *</label>
                      <input
                        type="text"
                        required
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        placeholder="ABC-1D23"
                        className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3 py-2 text-xs font-mono uppercase text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Buyer Info */}
              <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] space-y-3">
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2">
                  3. {t.buyerDetailsTitle}
                </h3>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">{t.name} *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu Nome Completo"
                    className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">{t.email} *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@dominio.com"
                      className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">{t.phone} *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(41) 99999-9999"
                      className="w-full bg-[#08090b] border border-[#1e222e] rounded-lg px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Summary & Payment */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Coupon Component */}
              {selectedTier && (
                <CouponInput
                  currentLang={currentLang}
                  amountBrl={selectedTier.price_brl}
                  onCouponApplied={handleCouponApplied}
                />
              )}

              {/* Payment Method Selector */}
              <div className="bg-[#0f1117] p-5 rounded-xl border border-[#1e222e] space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  4. {t.paymentMethodTitle}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between gap-3 ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                        : 'bg-[#08090b] border-[#1e222e] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <img src="/pagarme-logo.svg" alt="Pagar.me PIX" className="h-5 w-auto object-contain" />
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold uppercase">
                        PIX V5
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white">PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between gap-3 ${
                      paymentMethod === 'credit_card'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-lg shadow-purple-500/10'
                        : 'bg-[#08090b] border-[#1e222e] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <img src="/stripe-logo.svg" alt="Stripe Payments" className="h-4.5 w-auto object-contain" />
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-mono font-bold uppercase">
                        Cartão
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white">Cartão de Crédito</span>
                  </button>
                </div>

                {/* Price Breakdown */}
                {selectedTier && (
                  <div className="pt-4 border-t border-[#1e222e] space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Subtotal</span>
                      <span className="font-mono">R$ {selectedTier.price_brl.toFixed(2)}</span>
                    </div>

                    {discountBrl > 0 && (
                      <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                        <span>Desconto Cupom ({appliedCoupon})</span>
                        <span className="font-mono">-R$ {discountBrl.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-black text-white pt-2 border-t border-[#1e222e]">
                      <span>{t.totalPrice}</span>
                      <span className="text-dg-cyan font-mono">
                        R$ {finalAmountBrl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-dg-cyan hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      {t.finishCheckout} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Payment Gateway Trust Footer */}
                <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#1e222e]/60">
                  <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Processamento Seguro
                  </span>
                  <img src="/pagarme-logo.svg" alt="Pagar.me" className="h-4 w-auto object-contain" />
                  <span className="text-zinc-600 text-[10px]">&bull;</span>
                  <img src="/stripe-logo.svg" alt="Stripe" className="h-3.5 w-auto object-contain opacity-80" />
                </div>

              </div>

              {/* PIX Result Display Modal/Box */}
              {orderResult && orderResult.payment_method === 'pix' && (
                <div className="bg-[#0f1117] p-6 rounded-2xl border-2 border-emerald-500 shadow-2xl space-y-4 animate-fadeIn">
                  <div className="text-center">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase rounded-full border border-emerald-500/30">
                      Aguardando Pagamento PIX
                    </span>
                    <h4 className="text-lg font-black text-white mt-2">Escaneie o QR Code</h4>
                    <p className="text-xs text-zinc-400">{t.pixInstruction}</p>
                  </div>

                  {orderResult.payment_details?.pix_qr_code_base64 && (
                    <div className="flex justify-center my-2">
                      <img
                        src={orderResult.payment_details.pix_qr_code_base64}
                        alt="PIX QR Code"
                        className="w-48 h-48 rounded-xl border-4 border-white shadow-lg"
                      />
                    </div>
                  )}

                  {orderResult.payment_details?.pix_copy_paste && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        readOnly
                        value={orderResult.payment_details.pix_copy_paste}
                        className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-400 overflow-ellipsis"
                      />
                      <button
                        type="button"
                        onClick={copyPixToClipboard}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Copy className="w-4 h-4" />
                        {copiedPix ? t.pixCopied : t.copyPix}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

          </form>
        </main>
      )}

      {/* Ticket Confirmation Modal */}
      {orderResult && orderResult.payment_method === 'credit_card' && (
        <TicketPassModal
          currentLang={currentLang}
          orderData={orderResult}
          onClose={() => setOrderResult(null)}
        />
      )}

    </div>
  );
};
