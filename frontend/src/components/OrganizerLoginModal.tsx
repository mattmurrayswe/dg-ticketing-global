import React, { useState } from 'react';
import { organizerLogin } from '../services/api';
import { Language, translations } from '../i18n/translations';
import { Lock, Mail, Key, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

interface OrganizerLoginModalProps {
  currentLang: Language;
  onLoginSuccess: (token: string, organizer: any) => void;
}

export const OrganizerLoginModal: React.FC<OrganizerLoginModalProps> = ({ currentLang, onLoginSuccess }) => {
  const t = translations[currentLang];
  const [email, setEmail] = useState('admin@digitalgarage.com.br');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await organizerLogin(email, password);
      onLoginSuccess(res.token, res.organizer);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha na autenticação do organizador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      <div className="w-full max-w-md bg-[#0f1117] border border-[#1e222e] rounded-2xl shadow-2xl p-6 space-y-5 animate-fadeIn">
        
        <div className="text-center">
          <img src="/dg-com-br.png" alt="Digital Garage" className="h-10 mx-auto mb-4 object-contain" />
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Acesso Restrito Organizador</h2>
          <p className="text-xs text-zinc-400 mt-1">Autenticação obrigatória para acessar o painel de bilheteria e portão.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">E-mail do Organizador</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@digitalgarage.com.br"
                className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-dg-cyan"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">Senha de Acesso</label>
            <div className="relative">
              <Key className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#08090b] border border-[#1e222e] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-dg-cyan"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-[#151720] p-3 rounded-xl border border-[#1e222e] text-[11px] text-zinc-400 font-mono">
            <strong>Credenciais Seed de Teste:</strong><br />
            Email: <span className="text-dg-cyan">admin@digitalgarage.com.br</span><br />
            Senha: <span className="text-white">admin123</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-dg-cyan hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <ShieldCheck className="w-4 h-4" /> Entrar como Organizador
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
