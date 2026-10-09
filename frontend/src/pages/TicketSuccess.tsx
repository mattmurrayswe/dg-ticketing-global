import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getOrderDetails } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { TicketPassModal } from '../components/TicketPassModal';
import { Navbar } from '../components/Navbar';
import { Loader2, ArrowLeft } from 'lucide-react';

interface TicketSuccessProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const TicketSuccess: React.FC<TicketSuccessProps> = ({ currentLang, onLanguageChange }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderCode = searchParams.get('order_code');

  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderCode) {
      getOrderDetails(orderCode)
        .then((res) => setOrderData(res))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderCode]);

  return (
    <div className="min-h-screen bg-dg-dark text-white">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-12">
            <Loader2 className="w-8 h-8 text-dg-cyan animate-spin" />
            <p className="text-xs text-zinc-400 font-mono">Buscando seu ingresso no banco de dados...</p>
          </div>
        ) : orderData ? (
          <TicketPassModal
            currentLang={currentLang}
            orderData={orderData}
            onClose={() => navigate('/')}
          />
        ) : (
          <div className="bg-dg-card p-8 rounded-2xl border border-dg-border space-y-4">
            <h2 className="text-lg font-black text-white">Ingresso Não Encontrado</h2>
            <p className="text-xs text-zinc-400">Não encontramos nenhum pedido com o código fornecido.</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-dg-red text-white font-bold text-xs uppercase tracking-wider rounded-xl transition inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para o Início
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
