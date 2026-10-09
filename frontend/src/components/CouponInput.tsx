import React, { useState } from 'react';
import { validateCoupon } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { Tag, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface CouponInputProps {
  currentLang: Language;
  amountBrl: number;
  onCouponApplied: (couponCode: string, discountBrl: number, finalAmountBrl: number) => void;
}

export const CouponInput: React.FC<CouponInputProps> = ({ currentLang, amountBrl, onCouponApplied }) => {
  const t = translations[currentLang];
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; discountBrl: number } | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await validateCoupon(code, amountBrl);
      setApplied({ code: res.code, discountBrl: res.discount_brl });
      onCouponApplied(res.code, res.discount_brl, res.final_price_brl);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Cupom inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dg-card p-4 rounded-xl border border-dg-border">
      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        <Tag className="w-3.5 h-3.5 text-dg-gold" />
        {t.couponCode}
      </label>

      {applied ? (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg text-emerald-400 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {t.discountApplied} <strong>{applied.code}</strong> (-R$ {applied.discountBrl.toFixed(2)})
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ex: DG2026, SPEED10"
            className="flex-1 bg-dg-dark border border-dg-border rounded-lg px-3 py-2 text-xs font-mono text-white uppercase focus:outline-none focus:border-dg-cyan"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="px-4 py-2 bg-dg-card hover:bg-dg-panel border border-dg-cyan/50 text-dg-cyan rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t.applyCoupon}
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1 font-mono">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};
