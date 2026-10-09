import React, { useState } from 'react';
import { scanGateCheckin } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { QrCode, Scan, CheckCircle2, AlertTriangle, XCircle, Search, Loader2 } from 'lucide-react';

interface GateScannerProps {
  currentLang: Language;
}

export const GateScanner: React.FC<GateScannerProps> = ({ currentLang }) => {
  const t = translations[currentLang];
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const data = await scanGateCheckin(code.trim());
      setResult(data);
      if (data.status === 'success') {
        setCode('');
      }
    } catch (err) {
      setResult({ status: 'invalid', message: 'Erro ao conectar ao servidor de validação.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dg-card p-6 rounded-2xl border border-dg-border shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-dg-red/20 border border-dg-red/40 text-dg-red">
          <Scan className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">{t.scannerTitle}</h3>
          <p className="text-xs text-zinc-400">{t.scanInstruction}</p>
        </div>
      </div>

      <form onSubmit={handleScan} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO (ex: DG-89F3) ou PLACA (ex: ABC-1D23)"
            className="w-full bg-dg-dark border border-dg-border rounded-xl pl-9 pr-4 py-3 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-dg-cyan"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-6 py-3 bg-dg-red hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-600/30 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.validateTicket}
        </button>
      </form>

      {/* Result Card */}
      {result && (
        <div className="mt-5 animate-fadeIn">
          {result.status === 'success' && (
            <div className="bg-emerald-500/10 border-2 border-emerald-500 p-5 rounded-xl text-emerald-400">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wider">{result.message}</h4>
                  <p className="text-xs text-emerald-300">Portão Central • Check-in realizado às {result.checked_in_at}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-500/30 grid grid-cols-2 gap-2 text-xs font-mono text-zinc-200">
                <div>Comprador: <strong className="text-white">{result.buyer_name}</strong></div>
                <div>Ingresso: <strong className="text-dg-cyan">{result.tier_name}</strong></div>
                {result.car_info && <div className="col-span-2">Veículo: <strong className="text-dg-gold">{result.car_info}</strong></div>}
              </div>
            </div>
          )}

          {result.status === 'already_checked_in' && (
            <div className="bg-amber-500/10 border-2 border-amber-500 p-5 rounded-xl text-amber-400">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wider">{result.message}</h4>
                  <p className="text-xs text-amber-300">Verifique a identidade do portador ({result.buyer_name}).</p>
                </div>
              </div>
            </div>
          )}

          {result.status === 'invalid' && (
            <div className="bg-red-500/10 border-2 border-red-500 p-5 rounded-xl text-red-400">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wider">{result.message}</h4>
                  <p className="text-xs text-red-300">Código #{result.order_code || 'N/A'} não consta na lista oficial de ingressos.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
