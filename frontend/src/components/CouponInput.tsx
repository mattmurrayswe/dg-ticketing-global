import React, { useId, useState } from 'react';
import { validateCoupon } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { Tag, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

interface CouponInputProps {
  currentLang: Language;
  amountBrl: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  displayAmount?: number;
  onCouponApplied: (couponCode: string, discountBrl: number, finalAmountBrl: number) => void;
  onCouponCleared?: () => void;
}

export const CouponInput: React.FC<CouponInputProps> = ({
  currentLang,
  amountBrl,
  currency = 'BRL',
  displayAmount,
  onCouponApplied,
  onCouponCleared,
}) => {
  const t = translations[currentLang];
  const uid = useId();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; discountBrl: number } | null>(null);

  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'R$';
  const ratio =
    displayAmount && amountBrl > 0
      ? displayAmount / amountBrl
      : currency === 'USD'
        ? 1 / 5
        : currency === 'EUR'
          ? 1 / 5.5
          : 1;

  const formatDiscount = (discBrl: number) => {
    const val = discBrl * ratio;
    return `${symbol} ${val.toFixed(2)}`;
  };

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await validateCoupon(code.trim(), amountBrl);
      setApplied({ code: res.code, discountBrl: res.discount_brl });
      onCouponApplied(res.code, res.discount_brl, res.final_price_brl);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Cupom inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setApplied(null);
    setCode('');
    setError(null);
    if (onCouponCleared) {
      onCouponCleared();
    } else {
      onCouponApplied('', 0, amountBrl);
    }
  };

  return (
    <div className="bg-[#0b0d12] p-3.5 rounded-xl border border-[#1e222e]">
      <label
        htmlFor={`${uid}-coupon`}
        className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2"
      >
        <Tag className="w-3.5 h-3.5 text-zinc-300" aria-hidden="true" />
        <span>{t.couponCode}</span>
      </label>

      {applied ? (
        <div className="flex items-center justify-between gap-2 bg-[#151720] border border-white/30 px-3 py-2.5 rounded-md text-zinc-200 text-xs font-semibold">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
            <span className="truncate">
              <strong className="font-mono text-white">{applied.code}</strong> (-{formatDiscount(applied.discountBrl)})
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Remover cupom"
            className="p-1 text-zinc-400 hover:text-white rounded transition cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            id={`${uid}-coupon`}
            name="coupon_code"
            type="text"
            value={code}
            spellCheck={false}
            autoCapitalize="characters"
            autoCorrect="off"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleApply();
              }
            }}
            placeholder="EX: DG2026"
            className="flex-1 min-w-0 min-h-[44px] bg-[#08090b] border border-[#262a36] rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-500 uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="min-h-[44px] px-4 py-2 bg-[#15171e] hover:bg-[#1b1e28] border border-white/30 hover:border-white/50 text-white rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : t.applyCoupon}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-zinc-300 mt-2 flex items-center gap-1.5 font-mono">
          <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
