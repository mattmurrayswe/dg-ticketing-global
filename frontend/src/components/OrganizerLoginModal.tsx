import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { organizerLogin } from '../services/api';
import { Language } from '../i18n/translations';
import { Navbar } from './Navbar';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

interface OrganizerLoginModalProps {
  currentLang: Language;
  onLanguageChange?: (lang: Language) => void;
  onLoginSuccess: (token: string, organizer: any) => void;
}

const copyByLang: Record<
  Language,
  {
    heading: string;
    signupPrompt: string;
    signupAction: string;
    emailLabel: string;
    passwordLabel: string;
    showPassword: string;
    hidePassword: string;
    submit: string;
    fallbackError: string;
  }
> = {
  pt: {
    heading: 'Entrar na sua conta',
    signupPrompt: 'Ainda não tem conta?',
    signupAction: 'Criar conta e evento',
    emailLabel: 'E-mail',
    passwordLabel: 'Senha',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    submit: 'Entrar',
    fallbackError: 'Falha na autenticação do organizador.',
  },
  en: {
    heading: 'Sign in to your account',
    signupPrompt: "Don't have an account yet?",
    signupAction: 'Create account & event',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign in',
    fallbackError: 'Organizer authentication failed.',
  },
  it: {
    heading: 'Accedi al tuo account',
    signupPrompt: 'Non hai ancora un account?',
    signupAction: 'Crea account ed evento',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    showPassword: 'Mostra password',
    hidePassword: 'Nascondi password',
    submit: 'Accedi',
    fallbackError: 'Autenticazione organizzatore non riuscita.',
  },
};

export const OrganizerLoginModal: React.FC<OrganizerLoginModalProps> = ({
  currentLang,
  onLanguageChange,
  onLoginSuccess,
}) => {
  const c = copyByLang[currentLang];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'dg-control w-full bg-[#0b0d12]/90 border border-[#262a36] rounded-md px-3.5 py-2.5 text-white placeholder:text-zinc-500 transition';
  const landingPrimaryButtonClass =
    'underline underline-offset-4 decoration-zinc-700 border-2 border-[#1e222e] hover:border-white/40 rounded-md px-6 py-2 font-markazi text-xl bg-gradient-to-tr from-black to-[#0f1117] text-white transition inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-h-[48px]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await organizerLogin(email, password);
      onLoginSuccess(res.token, res.organizer);
    } catch (err: any) {
      setError(err?.response?.data?.detail || c.fallbackError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#08090b] text-white flex flex-col font-sans">
      {onLanguageChange && (
        <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />
      )}

      <main className="flex-1 flex items-center justify-center px-6 py-12 bg-[#0a0c10]">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-medium font-markazi text-white tracking-wide">
              {c.heading}
            </h1>
            <p className="text-sm text-zinc-400">
              {c.signupPrompt}{' '}
              <Link
                to="/criar-evento"
                className="font-markazi text-lg text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition"
              >
                {c.signupAction}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="organizer-email"
                className="block text-xs font-bold text-zinc-200"
              >
                {c.emailLabel}
              </label>
              <input
                id="organizer-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@organizacao.com.br"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="organizer-password"
                className="block text-xs font-bold text-zinc-200"
              >
                {c.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="organizer-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? c.hidePassword : c.showPassword}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-white rounded-md transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`${landingPrimaryButtonClass} w-full sm:w-auto`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <span>{c.submit}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
