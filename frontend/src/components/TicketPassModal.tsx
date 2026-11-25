import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { downloadTicketPdf, resendTicketEmail } from '../services/api';
import {
  X,
  QrCode,
  CheckCircle2,
  Mail,
  MessageSquare,
  Printer,
  Car,
  Calendar,
  MapPin,
  Download,
  Loader2,
} from 'lucide-react';

interface TicketPassModalProps {
  currentLang: Language;
  orderData: any;
  onClose: () => void;
}

export const TicketPassModal: React.FC<TicketPassModalProps> = ({ currentLang, orderData, onClose }) => {
  const t = translations[currentLang];
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [waSent, setWaSent] = useState(false);

  const handleDownloadPdf = async () => {
    if (!orderData?.order_code || pdfLoading) return;
    setPdfLoading(true);
    try {
      await downloadTicketPdf(orderData.order_code);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!orderData?.order_code || emailStatus === 'sending') return;
    setEmailStatus('sending');
    try {
      await resendTicketEmail(orderData.order_code, orderData.buyer_email);
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 3500);
    } catch (err) {
      console.error('Failed to send email:', err);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 3500);
    }
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

  const qrImageSrc = orderData?.ticket_qr_base64 || orderData?.pix_qr_code_base64;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto font-figtree">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0b0c11] to-[#08090b] border border-[#1e222e] rounded-2xl shadow-2xl overflow-hidden animate-fadeIn my-8">

        {/* Top Header (Landing & Criar Evento Typography + .dg-parede-queimada gradient) */}
        <div className="dg-parede-queimada border-b border-[#1e222e] p-6 text-center relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-black/40 p-1.5 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          <img src="/dg-com-br.png" alt="Digital Garage" className="h-9 mx-auto mb-2.5 object-contain" />

          <p className="font-markazi text-base text-zinc-400 leading-none mb-2">
            De GearHead para GearHead
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#08090b] border border-[#262a36] text-[11px] font-exo text-zinc-200 font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
            {orderData.payment_status === 'paid' ? 'Ingresso Pago' : 'Ingresso Confirmado'}
          </div>

          <h2 className="!font-markazi text-3xl font-semibold text-white tracking-wide leading-tight">
            {orderData.event_title || 'Digital Garage Car Meet'}
          </h2>
          <p className="text-xs text-zinc-400 font-mono tracking-wider mt-1">
            PASS #{orderData.order_code}
          </p>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-4">
          {/* Date & Venue */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#151720] p-3 rounded-xl border border-[#1e222e] flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-mono">Data</span>
                <span className="font-bold text-white">{orderData.event_date || 'A definir'}</span>
              </div>
            </div>

            <div className="bg-[#151720] p-3 rounded-xl border border-[#1e222e] flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-mono">Local</span>
                <span className="font-bold text-white">{orderData.event_location || 'Local a confirmar'}</span>
              </div>
            </div>
          </div>

          {/* Ticket Tier & Holder */}
          <div className="flex items-center justify-between bg-[#151720] p-3.5 rounded-xl border border-[#1e222e]">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">Categoria</span>
              <span className="text-sm font-bold text-white">{orderData.tier_name || 'Ingresso Oficial'}</span>
              {orderData.buyer_name && (
                <span className="text-xs text-zinc-400 block mt-0.5">{orderData.buyer_name}</span>
              )}
            </div>
            <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-[#262a36] text-zinc-200 text-xs font-mono font-bold uppercase">
              {orderData.payment_status === 'paid' ? 'PAGO' : 'CONFIRMADO'}
            </span>
          </div>

          {/* Vehicle Info Card */}
          {orderData.car_make && (
            <div className="bg-[#08090b] p-4 rounded-xl border border-[#262a36]">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                <Car className="w-4 h-4 text-zinc-300" />
                Veículo Expositor Registrado
              </div>
              <p className="text-base font-bold text-white">
                {orderData.car_make} {orderData.car_model} ({orderData.car_year || '2026'})
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                <span>
                  Placa: <strong className="text-white font-mono">{orderData.license_plate || 'N/A'}</strong>
                </span>
                <span>•</span>
                <span>
                  Cor: <strong className="text-white">{orderData.car_color || 'N/A'}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Perforated Boarding-Pass Divider */}
          <div className="relative py-2 flex items-center">
            <div className="w-5 h-5 rounded-full bg-[#08090b] border border-[#1e222e] -ml-9 shrink-0" />
            <div className="w-full border-t border-dashed border-[#1e222e]" />
            <div className="w-5 h-5 rounded-full bg-[#08090b] border border-[#1e222e] -mr-9 shrink-0" />
          </div>

          {/* QR Code Container */}
          <div className="bg-[#08090b] p-5 rounded-2xl border border-[#1e222e] text-center flex flex-col items-center justify-center shadow-inner">
            {qrImageSrc ? (
              <img
                src={qrImageSrc}
                alt="QR Code Ticket"
                className="w-44 h-44 rounded-xl border-4 border-white shadow-lg mb-3 bg-white"
              />
            ) : (
              <div className="w-44 h-44 bg-white p-2 rounded-xl flex items-center justify-center mb-3">
                <QrCode className="w-32 h-32 text-black" />
              </div>
            )}
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-widest">
              ENTRADA: {orderData.order_code}
            </span>
          </div>

          {/* Action Dispatch Buttons */}
          <div className="space-y-2 pt-2 border-t border-[#1e222e]">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="w-full py-3 bg-white hover:bg-zinc-200 disabled:opacity-60 text-[#08090b] font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {pdfLoading ? 'Gerando PDF...' : t.downloadPdf}
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={emailStatus === 'sending'}
                className="py-2.5 px-2 bg-[#151720] hover:bg-zinc-800 text-zinc-200 border border-[#1e222e] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                {emailStatus === 'sending' ? (
                  <Loader2 className="w-4 h-4 text-zinc-300 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 text-zinc-300" />
                )}
                <span className="truncate">
                  {emailStatus === 'sent'
                    ? 'Enviado!'
                    : emailStatus === 'error'
                      ? 'Erro'
                      : t.sendEmail}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="py-2.5 px-2 bg-[#0b0d12] hover:bg-zinc-900 text-zinc-200 border border-[#1e222e] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-zinc-300 shrink-0" />
                <span className="truncate">{waSent ? 'Abrindo...' : 'WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="py-2.5 px-2 bg-[#151720] hover:bg-zinc-800 text-zinc-200 border border-[#1e222e] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-zinc-300 shrink-0" />
                <span className="truncate">Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
