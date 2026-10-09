import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { X, QrCode, CheckCircle2, Mail, MessageSquare, Printer, Car, Calendar, MapPin } from 'lucide-react';

interface TicketPassModalProps {
  currentLang: Language;
  orderData: any;
  onClose: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({ currentLang, orderData, onClose }) => {
  const t = translations[currentLang];
  const [emailSent, setEmailSent] = useState(false);
  const [waSent, setWaSent] = useState(false);

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const handleSendWhatsApp = () => {
    setWaSent(true);
    if (orderData?.whatsapp_link) {
      window.open(orderData.whatsapp_link, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0f1117] border border-[#1e222e] rounded-2xl shadow-2xl overflow-hidden animate-fadeIn my-8">
        
        {/* Top Header */}
        <div className="bg-[#151720] border-b border-[#1e222e] p-6 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-black/40 p-1.5 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Official Logo */}
          <img src="/dg-com-br.png" alt="Digital Garage" className="h-10 mx-auto mb-3 object-contain" />

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-bold uppercase mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Ingresso Confirmado
          </div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase">{orderData.event_title || 'Digital Garage Car Meet'}</h2>
          <p className="text-xs text-zinc-400 font-mono tracking-wider mt-0.5">PASS #{orderData.order_code}</p>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-5">
          
          {/* QR Code Container */}
          <div className="bg-[#08090b] p-6 rounded-2xl border border-[#1e222e] text-center flex flex-col items-center justify-center shadow-inner">
            {orderData.pix_qr_code_base64 ? (
              <img
                src={orderData.pix_qr_code_base64}
                alt="QR Code Ticket"
                className="w-48 h-48 rounded-xl border-4 border-white shadow-lg mb-3"
              />
            ) : (
              <div className="w-48 h-48 bg-white p-2 rounded-xl flex items-center justify-center mb-3">
                <QrCode className="w-36 h-36 text-black" />
              </div>
            )}
            <span className="text-xs font-mono font-bold text-dg-cyan uppercase tracking-widest">
              ENTRADA: {orderData.order_code}
            </span>
          </div>

          {/* Ticket Tier Badge */}
          <div className="flex items-center justify-between bg-[#151720] p-3.5 rounded-xl border border-[#1e222e]">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">Categoria</span>
              <span className="text-sm font-bold text-white">{orderData.tier_name || 'Expositor Paddock'}</span>
            </div>
            <span className="px-3 py-1 rounded-lg bg-dg-cyan/10 border border-dg-cyan/30 text-dg-cyan text-xs font-mono font-bold uppercase">
              {orderData.payment_status === 'paid' ? 'PAGO' : 'CONFIRMADO'}
            </span>
          </div>

          {/* Vehicle Info Card */}
          {orderData.car_make && (
            <div className="bg-[#08090b] p-4 rounded-xl border border-dg-cyan/30">
              <div className="flex items-center gap-2 text-dg-cyan text-xs font-bold uppercase tracking-wider mb-1.5">
                <Car className="w-4 h-4" />
                Veículo Expositor Registrado
              </div>
              <p className="text-base font-black text-white">
                {orderData.car_make} {orderData.car_model} ({orderData.car_year || '2026'})
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                <span>Placa: <strong className="text-white font-mono">{orderData.license_plate || 'N/A'}</strong></span>
                <span>•</span>
                <span>Cor: <strong className="text-white">{orderData.car_color || 'N/A'}</strong></span>
              </div>
            </div>
          )}

          {/* Date & Venue */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#151720] p-3 rounded-xl border border-[#1e222e] flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-dg-cyan mt-0.5" />
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-mono">Data</span>
                <span className="font-bold text-white">{orderData.event_date || '24/10/2026 18:00'}</span>
              </div>
            </div>

            <div className="bg-[#151720] p-3 rounded-xl border border-[#1e222e] flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-zinc-300 mt-0.5" />
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-mono">Local</span>
                <span className="font-bold text-white">{orderData.event_location || 'Curitiba - PR'}</span>
              </div>
            </div>
          </div>

          {/* Action Dispatch Buttons */}
          <div className="space-y-2 pt-2 border-t border-[#1e222e]">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              {waSent ? 'Abrindo WhatsApp...' : t.sendWhatsApp}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSendEmail}
                className="py-2.5 bg-[#151720] hover:bg-zinc-800 text-zinc-200 border border-[#1e222e] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Mail className="w-4 h-4 text-dg-cyan" />
                {emailSent ? 'Enviado!' : t.sendEmail}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="py-2.5 bg-[#151720] hover:bg-zinc-800 text-zinc-200 border border-[#1e222e] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-zinc-300" />
                {t.printPdf}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
