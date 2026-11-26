import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getOrderDetails, verifyOrderPayment } from '../services/api';
import { Language } from '../i18n/translations';
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
  const orderCode = searchParams.get('order_code') || searchParams.get('order_nsu');
  const provider = searchParams.get('provider');
  const sessionId = searchParams.get('session_id');
  const slug = searchParams.get('slug') || searchParams.get('invoice_slug');
  const transactionNsu = searchParams.get('transaction_nsu');
  const demo = searchParams.get('demo');

  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderCode) {
      setLoading(false);
      return;
    }

    const shouldVerify = Boolean(sessionId || slug || transactionNsu || demo || provider);
    const request = shouldVerify
      ? verifyOrderPayment(orderCode, {
          provider,
          session_id: sessionId,
          slug,
          transaction_nsu: transactionNsu,
          demo,
        }).catch(() => getOrderDetails(orderCode))
      : getOrderDetails(orderCode);

    request
      .then((res) => setOrderData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [orderCode, provider, sessionId, slug, transactionNsu, demo]);

  return (
    <div className="min-h-screen bg-[#08090b] text-white flex flex-col font-sans">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-16 text-center flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" aria-hidden="true" />
            <p className="text-xs text-zinc-400 font-mono">
              Validando pagamento e emitindo seu ingresso oficial...
            </p>
          </div>
        ) : orderData ? (
          <TicketPassModal
            currentLang={currentLang}
            orderData={orderData}
            onClose={() =>
              navigate(orderData.event_slug ? `/eventos/${orderData.event_slug}` : '/eventos-v2')
            }
          />
        ) : (
          <div className="bg-gradient-to-b from-[#0b0c11] to-[#08090b] p-8 rounded-2xl border border-[#1e222e] space-y-4">
            <p className="font-markazi text-xl text-zinc-400 leading-none">
              • Bilheteria Digital Garage
            </p>
            <h1 className="text-3xl font-medium font-markazi text-white tracking-wide">
              Ingresso Não Encontrado
            </h1>
            <p className="text-xs text-zinc-400">
              Não encontramos nenhum pedido correspondente ao código informado.
            </p>
            <div className="pt-2">
              <Link
                to="/eventos-v2"
                className="underline underline-offset-4 decoration-zinc-700 border-2 border-[#1e222e] hover:border-white/40 rounded-md px-6 py-2 font-markazi text-xl bg-gradient-to-tr from-black to-[#0f1117] text-white transition inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Voltar para Encontre Eventos</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
