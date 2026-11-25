import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Language } from '../i18n/translations';
import { createNewEvent, organizerLogin, organizerSignup } from '../services/api';

interface CreateEventFlowProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

interface TierDraft {
  name: string;
  price_brl: string;
  quantity_total: string;
  requires_car_specs: boolean;
}

type FlowStep = 'account' | 'event' | 'success';
type AuthMode = 'signup' | 'login';

interface FlowCopy {
  pageTitleAccount: string;
  pageTitleEvent: string;
  pageTitleSuccess: string;
  eyebrow: string;
  heroTitle: string;
  heroLead: string;
  heroP1: string;
  heroP2: string;
  heroP3: string;
  stepAccountLabel: string;
  stepEventLabel: string;
  stepSuccessLabel: string;
  accountHeadingSignup: string;
  accountHeadingLogin: string;
  switchToLoginPrompt: string;
  switchToLoginAction: string;
  switchToSignupPrompt: string;
  switchToSignupAction: string;
  legendOrganizer: string;
  nameLabel: string;
  nameError: string;
  emailLabel: string;
  emailError: string;
  phoneLabel: string;
  phoneError: string;
  passwordLabel: string;
  passwordHintSignup: string;
  passwordErrorSignup: string;
  passwordErrorLogin: string;
  showPassword: string;
  hidePassword: string;
  signupSubmit: string;
  loginSubmit: string;
  loggedInAs: string;
  switchAccount: string;
  eventHeading: string;
  legendEventInfo: string;
  eventTitleLabel: string;
  eventTitleError: string;
  eventDateLabel: string;
  eventDateError: string;
  eventTimeLabel: string;
  eventTimeError: string;
  eventLocationLabel: string;
  eventLocationError: string;
  eventCityLabel: string;
  eventCityError: string;
  eventBannerLabel: string;
  eventBannerError: string;
  eventDescLabel: string;
  legendTiers: string;
  addTier: string;
  removeTier: string;
  tierNameLabel: string;
  tierNameError: string;
  tierPriceBrl: string;
  tierQty: string;
  tierRequiresCar: string;
  backBtn: string;
  publishBtn: string;
  publishingBtn: string;
  successHeading: string;
  successSub: string;
  salesLinkLabel: string;
  copyLink: string;
  copiedLink: string;
  shareWhatsapp: string;
  viewCheckout: string;
  goDashboard: string;
  createAnother: string;
  errorPrefix: string;
}

const copyByLang: Record<Language, FlowCopy> = {
  pt: {
    pageTitleAccount: 'Criar Evento — Organizador | Digital Garage',
    pageTitleEvent: 'Criar Evento — Informações do Evento | Digital Garage',
    pageTitleSuccess: 'Evento Publicado | Digital Garage',
    eyebrow: 'De GearHead para GearHead',
    heroTitle: 'Configurando seu Evento',
    heroLead: 'Vamos configurar seu evento!',
    heroP1:
      'A partir daqui você contribui para a expansão do Brasil no cenário Global Automotivo! Os GearHeads agradecem!',
    heroP2:
      'A digitalgarage.com.br irá divulgar seu evento em nossos canais: Aplicativos, Sites, Grupos, Classificados.',
    heroP3: 'Encontraremos novos veículos expositores para seu evento.',
    stepAccountLabel: 'Passo 1 de 2 · Organizador',
    stepEventLabel: 'Passo 2 de 2 · Evento',
    stepSuccessLabel: 'Evento Publicado',
    accountHeadingSignup: 'Criar Conta de Organizador',
    accountHeadingLogin: 'Entrar como Organizador',
    switchToLoginPrompt: 'Já organiza eventos conosco?',
    switchToLoginAction: 'Entrar na sua conta',
    switchToSignupPrompt: 'Novo por aqui?',
    switchToSignupAction: 'Criar conta grátis',
    legendOrganizer: 'Dados do Organizador',
    nameLabel: 'Nome Completo *',
    nameError: 'Informe seu nome completo (mínimo 2 caracteres).',
    emailLabel: 'E-mail *',
    emailError: 'Digite um e-mail válido, como voce@exemplo.com.',
    phoneLabel: 'WhatsApp *',
    phoneError: 'Informe um número de WhatsApp válido.',
    passwordLabel: 'Senha *',
    passwordHintSignup: 'Mínimo de 8 caracteres.',
    passwordErrorSignup: 'A senha precisa ter pelo menos 8 caracteres.',
    passwordErrorLogin: 'Digite sua senha para entrar.',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    signupSubmit: 'Continuar para o Evento',
    loginSubmit: 'Entrar e Continuar',
    loggedInAs: 'Conectado como',
    switchAccount: 'Trocar conta',
    eventHeading: 'Informações do Evento',
    legendEventInfo: 'Detalhes do Evento',
    eventTitleLabel: 'Título do Evento *',
    eventTitleError: 'Informe o título do evento (mínimo 3 caracteres).',
    eventDateLabel: 'Data *',
    eventDateError: 'Selecione a data do evento.',
    eventTimeLabel: 'Horário *',
    eventTimeError: 'Informe o horário de início.',
    eventLocationLabel: 'Local *',
    eventLocationError: 'Informe o local do evento.',
    eventCityLabel: 'Cidade / Estado *',
    eventCityError: 'Informe a cidade e o estado.',
    eventBannerLabel: 'URL da Imagem de Banner (opcional)',
    eventBannerError: 'Informe uma URL válida começando com https:// ou http://.',
    eventDescLabel: 'Descrição do Evento (opcional)',
    legendTiers: 'Ingressos & Lotes',
    addTier: 'Adicionar lote',
    removeTier: 'Remover lote',
    tierNameLabel: 'Nome do Ingresso *',
    tierNameError: 'Informe o nome do ingresso.',
    tierPriceBrl: 'Valor (R$) *',
    tierQty: 'Vagas *',
    tierRequiresCar: 'Exige cadastro do veículo (Expositor)',
    backBtn: 'Voltar',
    publishBtn: 'Finalizar',
    publishingBtn: 'Publicando...',
    successHeading: 'Evento Publicado com Sucesso.',
    successSub: 'Seu link de vendas já está pronto para divulgar ao seu público.',
    salesLinkLabel: 'Link de Vendas',
    copyLink: 'Copiar Link',
    copiedLink: 'Copiado!',
    shareWhatsapp: 'WhatsApp',
    viewCheckout: 'Ver Página',
    goDashboard: 'Ir ao Painel do Organizador',
    createAnother: 'Criar outro evento',
    errorPrefix: 'Erro',
  },
  en: {
    pageTitleAccount: 'Create Event — Organizer | Digital Garage',
    pageTitleEvent: 'Create Event — Event Info | Digital Garage',
    pageTitleSuccess: 'Event Published | Digital Garage',
    eyebrow: 'From GearHead to GearHead',
    heroTitle: 'Configure Your Event!',
    heroLead: "Let's configure your event!",
    heroP1:
      'From here you help expand the global automotive scene! GearHeads thank you!',
    heroP2:
      'digitalgarage.com.br will promote your event across our channels: Apps, Websites, Groups, and Classifieds.',
    heroP3: 'We will bring new exhibitor vehicles to your event.',
    stepAccountLabel: 'Step 1 of 2 · Organizer',
    stepEventLabel: 'Step 2 of 2 · Event Info',
    stepSuccessLabel: 'Event Published',
    accountHeadingSignup: 'Organizer Sign Up',
    accountHeadingLogin: 'Organizer Sign In',
    switchToLoginPrompt: 'Already hosting with us?',
    switchToLoginAction: 'Sign in',
    switchToSignupPrompt: 'New organizer?',
    switchToSignupAction: 'Create free account',
    legendOrganizer: 'Organizer Credentials',
    nameLabel: 'Full Name *',
    nameError: 'Enter your full name (at least 2 characters).',
    emailLabel: 'Email *',
    emailError: 'Enter a valid email address such as you@example.com.',
    phoneLabel: 'WhatsApp / Phone *',
    phoneError: 'Enter a valid phone number.',
    passwordLabel: 'Password *',
    passwordHintSignup: 'At least 8 characters.',
    passwordErrorSignup: 'Password must be at least 8 characters.',
    passwordErrorLogin: 'Enter your password.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signupSubmit: 'Continue to Event Info',
    loginSubmit: 'Sign In & Continue',
    loggedInAs: 'Signed in as',
    switchAccount: 'Switch account',
    eventHeading: 'Event Information',
    legendEventInfo: 'Event Details',
    eventTitleLabel: 'Event Title *',
    eventTitleError: 'Enter an event title (at least 3 characters).',
    eventDateLabel: 'Date *',
    eventDateError: 'Select the event date.',
    eventTimeLabel: 'Time *',
    eventTimeError: 'Select the start time.',
    eventLocationLabel: 'Venue *',
    eventLocationError: 'Enter the event venue.',
    eventCityLabel: 'City / State *',
    eventCityError: 'Enter the city and state.',
    eventBannerLabel: 'Banner Image URL (optional)',
    eventBannerError: 'Enter a valid URL starting with https:// or http://.',
    eventDescLabel: 'Event Description (optional)',
    legendTiers: 'Tickets & Tiers',
    addTier: 'Add tier',
    removeTier: 'Remove tier',
    tierNameLabel: 'Ticket Name *',
    tierNameError: 'Enter the ticket name.',
    tierPriceBrl: 'Price (R$) *',
    tierQty: 'Capacity *',
    tierRequiresCar: 'Require vehicle registration (Exhibitor)',
    backBtn: 'Back',
    publishBtn: 'Create New Event',
    publishingBtn: 'Publishing...',
    successHeading: 'Your Event Is Published.',
    successSub: 'Your ticket page is live and ready to share.',
    salesLinkLabel: 'Sales Link',
    copyLink: 'Copy Link',
    copiedLink: 'Copied!',
    shareWhatsapp: 'WhatsApp',
    viewCheckout: 'Open Page',
    goDashboard: 'Go to Organizer Dashboard',
    createAnother: 'Create another event',
    errorPrefix: 'Error',
  },
  it: {
    pageTitleAccount: 'Crea Evento — Organizzatore | Digital Garage',
    pageTitleEvent: 'Crea Evento — Info Evento | Digital Garage',
    pageTitleSuccess: 'Evento Pubblicato | Digital Garage',
    eyebrow: 'Da GearHead a GearHead',
    heroTitle: 'Configura il tuo Evento!',
    heroLead: 'Configuriamo il tuo evento!',
    heroP1:
      'Da qui contribuisci all’espansione della scena automobilistica globale! I GearHead ringraziano!',
    heroP2:
      'digitalgarage.com.br promuoverà il tuo evento sui nostri canali: App, Siti, Gruppi, Annunci.',
    heroP3: 'Troveremo nuovi veicoli espositori per il tuo evento.',
    stepAccountLabel: 'Passo 1 di 2 · Organizzatore',
    stepEventLabel: 'Passo 2 di 2 · Evento',
    stepSuccessLabel: 'Evento Pubblicato',
    accountHeadingSignup: 'Registrazione Organizzatore',
    accountHeadingLogin: 'Accedi come Organizzatore',
    switchToLoginPrompt: 'Organizzi già con noi?',
    switchToLoginAction: 'Accedi',
    switchToSignupPrompt: 'Nuovo organizzatore?',
    switchToSignupAction: 'Crea account',
    legendOrganizer: 'Dati Organizzatore',
    nameLabel: 'Nome Completo *',
    nameError: 'Inserisci il tuo nome completo (minimo 2 caratteri).',
    emailLabel: 'Email *',
    emailError: 'Inserisci un indirizzo email valido.',
    phoneLabel: 'WhatsApp / Telefono *',
    phoneError: 'Inserisci un numero valido.',
    passwordLabel: 'Password *',
    passwordHintSignup: 'Minimo 8 caratteri.',
    passwordErrorSignup: 'La password deve avere almeno 8 caratteri.',
    passwordErrorLogin: 'Inserisci la tua password.',
    showPassword: 'Mostra password',
    hidePassword: 'Nascondi password',
    signupSubmit: 'Continua all’Evento',
    loginSubmit: 'Accedi e Continua',
    loggedInAs: 'Connesso come',
    switchAccount: 'Cambia account',
    eventHeading: 'Informazioni dell’Evento',
    legendEventInfo: 'Dettagli Evento',
    eventTitleLabel: 'Titolo Evento *',
    eventTitleError: 'Inserisci il titolo dell’evento (minimo 3 caratteri).',
    eventDateLabel: 'Data *',
    eventDateError: 'Seleziona la data dell’evento.',
    eventTimeLabel: 'Orario *',
    eventTimeError: 'Inserisci l’orario di inizio.',
    eventLocationLabel: 'Luogo *',
    eventLocationError: 'Inserisci il luogo dell’evento.',
    eventCityLabel: 'Città / Provincia *',
    eventCityError: 'Inserisci città e provincia.',
    eventBannerLabel: 'URL Immagine Banner (opzionale)',
    eventBannerError: 'Inserisci un URL valido (https:// o http://).',
    eventDescLabel: 'Descrizione Evento (opzionale)',
    legendTiers: 'Biglietti e Lotti',
    addTier: 'Aggiungi lotto',
    removeTier: 'Rimuovi lotto',
    tierNameLabel: 'Nome Biglietto *',
    tierNameError: 'Inserisci il nome del biglietto.',
    tierPriceBrl: 'Prezzo (R$) *',
    tierQty: 'Posti *',
    tierRequiresCar: 'Richiede dati veicolo (Espositore)',
    backBtn: 'Indietro',
    publishBtn: 'Crea Nuovo Evento',
    publishingBtn: 'Pubblicazione...',
    successHeading: 'Evento Pubblicato.',
    successSub: 'La pagina biglietti è attiva e pronta da condividere.',
    salesLinkLabel: 'Link Vendite',
    copyLink: 'Copia Link',
    copiedLink: 'Copiato!',
    shareWhatsapp: 'WhatsApp',
    viewCheckout: 'Apri Pagina',
    goDashboard: 'Vai al Pannello Organizzatore',
    createAnother: 'Crea un altro evento',
    errorPrefix: 'Errore',
  },
};

const DEFAULT_TIERS: TierDraft[] = [
  {
    name: 'Ingresso Expositor Paddock',
    price_brl: '140',
    quantity_total: '100',
    requires_car_specs: true,
  },
  {
    name: 'Ingresso Pedestre',
    price_brl: '50',
    quantity_total: '400',
    requires_car_specs: false,
  },
];

const RotationalGlobe: React.FC<{ size?: number }> = ({ size = 88 }) => (
  <div
    className="relative flex items-center justify-center overflow-hidden rounded-full bg-zinc-950 border border-zinc-800/80 shrink-0"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <div
      className="absolute inset-0 w-full h-full animate-globe-spin"
      style={{
        backgroundImage:
          "url('https://unpkg.com/three-globe/example/img/earth-dark.jpg')",
        backgroundSize: 'auto 100%',
        backgroundRepeat: 'repeat-x',
        filter: 'brightness(2.1) contrast(1.2) grayscale(1)',
      }}
    />
    <div className="absolute inset-0 rounded-full shadow-[inset_-19px_-19px_30px_rgba(0,0,0,0.9),inset_9px_9px_19px_rgba(255,255,255,0.2)] pointer-events-none" />
  </div>
);

function usePostInteractionValidation(
  formRef: React.RefObject<HTMLFormElement>,
  announcerRef: React.RefObject<HTMLDivElement>,
  depsKey: string
) {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const supportsUserInvalid =
      typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)');
    const dirtyState = new WeakMap<
      Element,
      { hasInteracted: boolean; hasBlurred: boolean }
    >();
    const flagged = new WeakSet<Element>();
    const announced = new WeakSet<Element>();
    let announceTimer: ReturnType<typeof setTimeout> | undefined;
    let announcedField: Element | undefined;

    const linkError = (el: HTMLElement, shown: boolean) => {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const ids = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
      else el.removeAttribute('aria-describedby');
    };

    const spokenText = (node: HTMLElement) => {
      const copy = node.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
      return (copy.textContent || '').replace(/\s+/g, ' ').trim();
    };

    const announceError = (
      el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    ) => {
      const errorId = el.dataset.error;
      if (!errorId || !announcerRef.current) return;
      const errorEl = document.getElementById(errorId);
      if (!errorEl) return;
      const labelText = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : '';
      if (announceTimer) clearTimeout(announceTimer);
      announcerRef.current.textContent = '';
      announcedField = el;
      announceTimer = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = labelText + spokenText(errorEl);
        }
      }, 500);
    };

    const isFieldInvalid = (
      el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    ) => {
      if (supportsUserInvalid) {
        return el.matches(':user-invalid');
      }
      return el.classList.contains('user-invalid-fallback');
    };

    const syncAria = (el: EventTarget | null, announce = false) => {
      if (
        !(
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
        )
      ) {
        return;
      }
      const invalid = isFieldInvalid(el);
      if (invalid) {
        if (announce && !announced.has(el)) {
          announceError(el);
          announced.add(el);
        }
        el.setAttribute('aria-invalid', 'true');
        linkError(el, true);
        flagged.add(el);
      } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
        el.setAttribute('aria-invalid', 'false');
        linkError(el, false);
        flagged.delete(el);
        announced.delete(el);
        if (announcedField === el && announcerRef.current) {
          if (announceTimer) clearTimeout(announceTimer);
          announcerRef.current.textContent = '';
        }
      }
    };

    const updateFallback = (
      el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    ) => {
      const isValid = el.validity.valid;
      el.classList.toggle('user-invalid-fallback', !isValid);
      el.classList.toggle('user-valid-fallback', isValid);
    };

    form
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input, select, textarea'
      )
      .forEach((el) => syncAria(el));

    const handleBlur = (e: Event) => {
      const el = e.target;
      if (
        !supportsUserInvalid &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        const state = dirtyState.get(el) || {
          hasInteracted: false,
          hasBlurred: false,
        };
        state.hasBlurred = true;
        dirtyState.set(el, state);
        if (state.hasInteracted) updateFallback(el);
      }
      syncAria(el, true);
    };

    const handleInput = (e: Event) => {
      const el = e.target;
      if (
        !supportsUserInvalid &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        const state = dirtyState.get(el) || {
          hasInteracted: false,
          hasBlurred: false,
        };
        state.hasInteracted = true;
        dirtyState.set(el, state);
        if (state.hasBlurred) updateFallback(el);
      }
      if (el instanceof HTMLElement && el.hasAttribute('aria-invalid')) {
        syncAria(el);
      }
    };

    const handleChange = (e: Event) => {
      const el = e.target;
      if (
        !supportsUserInvalid &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        const state = dirtyState.get(el) || {
          hasInteracted: false,
          hasBlurred: false,
        };
        state.hasInteracted = true;
        dirtyState.set(el, state);
        if (state.hasBlurred) updateFallback(el);
      }
      syncAria(el, true);
    };

    const handleInvalid = (e: Event) => {
      const el = e.target;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        if (!supportsUserInvalid) {
          dirtyState.set(el, { hasInteracted: true, hasBlurred: true });
          updateFallback(el);
        }
        announced.add(el);
        syncAria(el);
      }
    };

    const handleReset = () => {
      setTimeout(() => {
        form
          .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            'input, select, textarea'
          )
          .forEach((el) => {
            dirtyState.delete(el);
            el.classList.remove('user-invalid-fallback', 'user-valid-fallback');
            syncAria(el);
          });
      });
    };

    form.addEventListener('blur', handleBlur, true);
    form.addEventListener('input', handleInput);
    form.addEventListener('change', handleChange, true);
    form.addEventListener('invalid', handleInvalid, true);
    form.addEventListener('reset', handleReset, true);

    return () => {
      if (announceTimer) clearTimeout(announceTimer);
      form.removeEventListener('blur', handleBlur, true);
      form.removeEventListener('input', handleInput);
      form.removeEventListener('change', handleChange, true);
      form.removeEventListener('invalid', handleInvalid, true);
      form.removeEventListener('reset', handleReset, true);
    };
  }, [formRef, announcerRef, depsKey]);
}

export const CreateEventFlow: React.FC<CreateEventFlowProps> = ({
  currentLang,
  onLanguageChange,
}) => {
  const c = copyByLang[currentLang];
  const uid = useId();
  const announcerRef = useRef<HTMLDivElement>(null);
  const authFormRef = useRef<HTMLFormElement>(null);
  const eventFormRef = useRef<HTMLFormElement>(null);
  const eventHeadingRef = useRef<HTMLHeadingElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('dg_organizer_token')
  );
  const [organizerInfo, setOrganizerInfo] = useState<any | null>(() => {
    const raw = localStorage.getItem('dg_organizer_info');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [step, setStep] = useState<FlowStep>(() =>
    localStorage.getItem('dg_organizer_token') ? 'event' : 'account'
  );
  const [authMode, setAuthMode] = useState<AuthMode>('signup');

  // Step 1: Organizer Account
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgPassword, setOrgPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Step 2: Event Info
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('14:00');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tiers, setTiers] = useState<TierDraft[]>(() =>
    DEFAULT_TIERS.map((tier) => ({ ...tier }))
  );
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // Step 3: Success
  const [createdEvent, setCreatedEvent] = useState<{
    title: string;
    slug: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (step === 'account') document.title = c.pageTitleAccount;
    else if (step === 'event') document.title = c.pageTitleEvent;
    else document.title = c.pageTitleSuccess;
  }, [step, c]);

  usePostInteractionValidation(
    authFormRef,
    announcerRef,
    `auth-${step}-${authMode}`
  );
  usePostInteractionValidation(
    eventFormRef,
    announcerRef,
    `event-${step}-${tiers.length}`
  );

  const moveFocusToHeading = (ref: React.RefObject<HTMLHeadingElement>) => {
    requestAnimationFrame(() => {
      ref.current?.focus();
    });
  };

  const persistSession = (newToken: string, organizer: any) => {
    localStorage.setItem('dg_organizer_token', newToken);
    localStorage.setItem('dg_organizer_info', JSON.stringify(organizer));
    setToken(newToken);
    setOrganizerInfo(organizer);
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('dg_organizer_token');
    localStorage.removeItem('dg_organizer_info');
    setToken(null);
    setOrganizerInfo(null);
    setAuthError(null);
    setStep('account');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const res = await organizerSignup({
          name: orgName,
          email: orgEmail,
          password: orgPassword,
          phone: orgPhone,
        });
        persistSession(res.token, res.organizer);
      } else {
        const res = await organizerLogin(orgEmail, orgPassword);
        persistSession(res.token, res.organizer);
      }
      setStep('event');
      moveFocusToHeading(eventHeadingRef);
    } catch (err: any) {
      setAuthError(
        err?.response?.data?.detail ||
          (authMode === 'signup'
            ? 'Não foi possível concluir seu cadastro.'
            : 'E-mail ou senha incorretos.')
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        name: `Lote #${prev.length + 1}`,
        price_brl: '80',
        quantity_total: '150',
        requires_car_specs: false,
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTierChange = <K extends keyof TierDraft>(
    index: number,
    field: K,
    value: TierDraft[K]
  ) => {
    setTiers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);
    setEventLoading(true);

    try {
      const formattedDate = `${eventDate} ${eventTime} BRT`;
      const formattedTiers = tiers.map((tier) => {
        const brl = Math.max(0, Number(tier.price_brl) || 0);
        return {
          name: tier.name,
          badge: tier.requires_car_specs ? 'epic' : 'uncommon',
          price_brl: brl,
          price_usd: Number((brl / 5).toFixed(2)),
          price_eur: Number((brl / 5.5).toFixed(2)),
          quantity_total: Math.max(1, Number(tier.quantity_total) || 1),
          requires_car_specs: tier.requires_car_specs,
          perks: tier.requires_car_specs
            ? ['Vaga Expositor', 'Check-in QR Code']
            : ['Acesso ao Evento', 'Check-in QR Code'],
        };
      });

      const res = await createNewEvent(
        {
          title,
          date: formattedDate,
          location,
          city,
          banner_url: bannerUrl || undefined,
          description: description || undefined,
          tiers: formattedTiers,
        },
        token
      );

      setCreatedEvent({
        title: res.title || title,
        slug: res.slug,
      });
      setStep('success');
      moveFocusToHeading(successHeadingRef);
    } catch (err: any) {
      setEventError(
        err?.response?.data?.detail ||
          'Erro ao publicar evento. Tente novamente.'
      );
    } finally {
      setEventLoading(false);
    }
  };

  const salesUrl = createdEvent
    ? `${window.location.origin}/eventos/${createdEvent.slug}`
    : '';

  const handleCopySalesUrl = () => {
    if (!salesUrl) return;
    navigator.clipboard.writeText(salesUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCreateAnother = () => {
    setTitle('');
    setEventDate('');
    setEventTime('14:00');
    setLocation('');
    setCity('');
    setBannerUrl('');
    setDescription('');
    setTiers(DEFAULT_TIERS.map((tier) => ({ ...tier })));
    setCreatedEvent(null);
    setEventError(null);
    setStep('event');
    moveFocusToHeading(eventHeadingRef);
  };

  const inputClass =
    'dg-control w-full bg-[#0b0d12]/90 border border-[#262a36] rounded-md px-3.5 py-2.5 text-white placeholder:text-zinc-500 transition';
  const landingPrimaryButtonClass =
    'underline underline-offset-4 decoration-zinc-700 border-2 border-[#1e222e] hover:border-white/40 rounded-md px-6 py-2 font-markazi text-xl bg-gradient-to-tr from-black to-[#0f1117] text-white transition inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-h-[48px]';
  const landingSecondaryButtonClass =
    'border border-[#1e222e] hover:border-white/30 rounded-md px-4 py-2 text-xs font-bold bg-[#0f1117] hover:bg-[#151720] text-zinc-200 hover:text-white transition inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-h-[44px]';

  const stepLabel =
    step === 'account'
      ? c.stepAccountLabel
      : step === 'event'
      ? c.stepEventLabel
      : c.stepSuccessLabel;

  return (
    <div className="min-h-[100dvh] bg-[#08090b] text-white flex flex-col font-sans">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      <div ref={announcerRef} aria-live="polite" className="visually-hidden" />

      {/* 40% Left Brand & Editorial Copy / 60% Right Focused Form */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_3fr] items-stretch">
        {/* LEFT 40%: Top Globe + Editorial Text + End Logo */}
        <section
          aria-labelledby={`${uid}-hero-heading`}
          className="relative min-w-0 bg-gradient-to-b from-[#0d0e14] to-[#08090b] border-b border-[#141720] lg:border-b-0 lg:border-r lg:border-[#141720] px-6 pt-5 pb-10 sm:px-10 lg:px-12 lg:pt-5 lg:pb-12 flex flex-col justify-start"
        >

          <div className="max-w-md mx-auto lg:mx-0">
            <div className="flex justify-end pr-4">
              <RotationalGlobe size={88} />
            </div>

            <p className="mt-11 font-markazi text-2xl text-zinc-200 leading-none">
              {c.heroLead}
            </p>

            <h1
              id={`${uid}-hero-heading`}
              className="mt-0 text-4xl lg:text-5xl font-medium font-markazi text-white tracking-wide leading-tight"
            >
              {c.heroTitle}
            </h1>
          </div>
          <div>
            <ul
              role="list"
              className="mt-12 space-y-14 font-markazi text-xl text-zinc-100 pt-1 list-none max-w-sm"
            >
              {[c.heroP1, c.heroP2, c.heroP3].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="text-zinc-400 shrink-0">
                    -
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="pt-10 flex justify-end pr-3">
              <img
                src="/dg-com-br.png"
                alt="Digital Garage"
                className="h-11 sm:h-12 w-auto object-contain block"
              />
            </div>
          </div>
        </section>

        {/* RIGHT 60%: Clean, Single-Column Form Workspace */}
        <section
          aria-label={stepLabel}
          className="min-w-0 dg-parede-queimada px-6 py-10 sm:px-10 lg:pl-10 lg:pr-12 lg:py-14 flex flex-col justify-center"
        >
          <div className="w-full max-w-lg mx-auto lg:mx-0">
            {/* Minimal Step Caption & Session Indicator */}
            <div className="flex flex-col gap-2 mb-1 text-xs font-mono text-zinc-500">
              <span>{stepLabel}</span>
              {token && organizerInfo && step !== 'account' && (
                <span>
                  {c.loggedInAs}{' '}
                  <strong className="text-zinc-300 font-sans">
                    {organizerInfo.name}
                  </strong>{' '}
                  ·{' '}
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="underline underline-offset-2 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {c.switchAccount}
                  </button>
                </span>
              )}
            </div>

            {/* STEP 1: ORGANIZER SIGN UP / LOGIN */}
            {step === 'account' && (
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <h2 className="text-3xl font-medium font-markazi text-white tracking-wide">
                    {authMode === 'signup'
                      ? c.accountHeadingSignup
                      : c.accountHeadingLogin}
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {authMode === 'signup'
                      ? c.switchToLoginPrompt
                      : c.switchToSignupPrompt}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                        setAuthError(null);
                      }}
                      className="font-markazi text-lg text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-white cursor-pointer"
                    >
                      {authMode === 'signup'
                        ? c.switchToLoginAction
                        : c.switchToSignupAction}
                    </button>
                  </p>
                </div>

                <form
                  ref={authFormRef}
                  onSubmit={handleAuthSubmit}
                  className="space-y-4"
                >
                  <fieldset className="space-y-4">
                    <legend className="visually-hidden">
                      {c.legendOrganizer}
                    </legend>

                    {authMode === 'signup' && (
                      <div className="dg-field space-y-1.5">
                        <label
                          htmlFor={`${uid}-org-name`}
                          className="block text-xs font-bold text-zinc-200"
                        >
                          {c.nameLabel}
                        </label>
                        <input
                          id={`${uid}-org-name`}
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          minLength={2}
                          enterKeyHint="next"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="Matheus Silva"
                          data-error={`${uid}-org-name-error`}
                          className={inputClass}
                        />
                        <div
                          id={`${uid}-org-name-error`}
                          className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                        >
                          <AlertCircle
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="visually-hidden">
                              {c.errorPrefix}:{' '}
                            </span>
                            {c.nameError}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-org-email`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {c.emailLabel}
                      </label>
                      <input
                        id={`${uid}-org-email`}
                        name="email"
                        type="email"
                        autoComplete="username"
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect="off"
                        required
                        enterKeyHint="next"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        data-error={`${uid}-org-email-error`}
                        className={inputClass}
                      />
                      <div
                        id={`${uid}-org-email-error`}
                        className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                      >
                        <AlertCircle
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="visually-hidden">
                            {c.errorPrefix}:{' '}
                          </span>
                          {c.emailError}
                        </span>
                      </div>
                    </div>

                    {authMode === 'signup' && (
                      <div className="dg-field space-y-1.5">
                        <label
                          htmlFor={`${uid}-org-phone`}
                          className="block text-xs font-bold text-zinc-200"
                        >
                          {c.phoneLabel}
                        </label>
                        <input
                          id={`${uid}-org-phone`}
                          name="tel"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          required
                          minLength={8}
                          enterKeyHint="next"
                          value={orgPhone}
                          onChange={(e) => setOrgPhone(e.target.value)}
                          placeholder="+55 11 99999-9999"
                          data-error={`${uid}-org-phone-error`}
                          className={inputClass}
                        />
                        <div
                          id={`${uid}-org-phone-error`}
                          className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                        >
                          <AlertCircle
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="visually-hidden">
                              {c.errorPrefix}:{' '}
                            </span>
                            {c.phoneError}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-org-password`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {c.passwordLabel}
                      </label>
                      {authMode === 'signup' && (
                        <span
                          id={`${uid}-org-password-hint`}
                          className="block text-xs text-zinc-500"
                        >
                          {c.passwordHintSignup}
                        </span>
                      )}
                      <div className="relative">
                        <input
                          id={`${uid}-org-password`}
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete={
                            authMode === 'signup'
                              ? 'new-password'
                              : 'current-password'
                          }
                          required
                          minLength={authMode === 'signup' ? 8 : 1}
                          enterKeyHint="done"
                          value={orgPassword}
                          onChange={(e) => setOrgPassword(e.target.value)}
                          placeholder="••••••••"
                          aria-describedby={
                            authMode === 'signup'
                              ? `${uid}-org-password-hint`
                              : undefined
                          }
                          data-error={`${uid}-org-password-error`}
                          className={`${inputClass} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-pressed={showPassword}
                          aria-label={
                            showPassword ? c.hidePassword : c.showPassword
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-white rounded-md transition cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      <div
                        id={`${uid}-org-password-error`}
                        className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                      >
                        <AlertCircle
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="visually-hidden">
                            {c.errorPrefix}:{' '}
                          </span>
                          {authMode === 'signup'
                            ? c.passwordErrorSignup
                            : c.passwordErrorLogin}
                        </span>
                      </div>
                    </div>
                  </fieldset>

                  {authError && (
                    <div
                      role="alert"
                      className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
                    >
                      <AlertCircle
                        className="w-4 h-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className={`${landingPrimaryButtonClass} w-full sm:w-auto`}
                    >
                      {authLoading ? (
                        <Loader2
                          className="w-5 h-5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <>
                          <span>
                            {authMode === 'signup'
                              ? c.signupSubmit
                              : c.loginSubmit}
                          </span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: EVENT INFO & TICKET TIERS */}
            {step === 'event' && (
              <div className="space-y-6">
                <h2
                  ref={eventHeadingRef}
                  tabIndex={-1}
                  className="text-3xl font-medium font-markazi text-white tracking-wide focus:outline-none"
                >
                  {c.eventHeading}
                </h2>

                <form
                  ref={eventFormRef}
                  onSubmit={handleEventSubmit}
                  className="space-y-6"
                >
                  <fieldset className="space-y-4">
                    <legend className="visually-hidden">
                      {c.legendEventInfo}
                    </legend>

                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-event-title`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {c.eventTitleLabel}
                      </label>
                      <input
                        id={`${uid}-event-title`}
                        name="title"
                        type="text"
                        required
                        minLength={3}
                        enterKeyHint="next"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Hoodster Vale Sul Meet 2026"
                        data-error={`${uid}-event-title-error`}
                        className={inputClass}
                      />
                      <div
                        id={`${uid}-event-title-error`}
                        className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                      >
                        <AlertCircle
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="visually-hidden">
                            {c.errorPrefix}:{' '}
                          </span>
                          {c.eventTitleError}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="dg-field space-y-1.5">
                        <label
                          htmlFor={`${uid}-event-date`}
                          className="block text-xs font-bold text-zinc-200"
                        >
                          {c.eventDateLabel}
                        </label>
                        <input
                          id={`${uid}-event-date`}
                          name="event_date"
                          type="date"
                          required
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          data-error={`${uid}-event-date-error`}
                          className={`${inputClass} [color-scheme:dark]`}
                        />
                        <div
                          id={`${uid}-event-date-error`}
                          className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                        >
                          <AlertCircle
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="visually-hidden">
                              {c.errorPrefix}:{' '}
                            </span>
                            {c.eventDateError}
                          </span>
                        </div>
                      </div>

                      <div className="dg-field space-y-1.5">
                        <label
                          htmlFor={`${uid}-event-time`}
                          className="block text-xs font-bold text-zinc-200"
                        >
                          {c.eventTimeLabel}
                        </label>
                        <input
                          id={`${uid}-event-time`}
                          name="event_time"
                          type="time"
                          required
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          data-error={`${uid}-event-time-error`}
                          className={`${inputClass} [color-scheme:dark]`}
                        />
                        <div
                          id={`${uid}-event-time-error`}
                          className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                        >
                          <AlertCircle
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="visually-hidden">
                              {c.errorPrefix}:{' '}
                            </span>
                            {c.eventTimeError}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="dg-field space-y-1.5">
                        <label
                          htmlFor={`${uid}-event-location`}
                          className="block text-xs font-bold text-zinc-200"
                        >
                          {c.eventLocationLabel}
                        </label>
                        <input
                          id={`${uid}-event-location`}
                          name="location"
                          type="text"
                          required
                          enterKeyHint="next"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Autódromo / Shopping"
                          data-error={`${uid}-event-location-error`}
                          className={inputClass}
                        />
                        <div
                          id={`${uid}-event-location-error`}
                          className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                        >
                          <AlertCircle
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="visually-hidden">
                              {c.errorPrefix}:{' '}
                            </span>
                            {c.eventLocationError}
                          </span>
                        </div>
                      </div>

                      <div className="dg-field space-y-1.5">
                        <label
                          htmlFor={`${uid}-event-city`}
                          className="block text-xs font-bold text-zinc-200"
                        >
                          {c.eventCityLabel}
                        </label>
                        <input
                          id={`${uid}-event-city`}
                          name="city"
                          type="text"
                          required
                          enterKeyHint="next"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Curitiba / PR"
                          data-error={`${uid}-event-city-error`}
                          className={inputClass}
                        />
                        <div
                          id={`${uid}-event-city-error`}
                          className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                        >
                          <AlertCircle
                            className="w-3.5 h-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            <span className="visually-hidden">
                              {c.errorPrefix}:{' '}
                            </span>
                            {c.eventCityError}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-event-banner`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {c.eventBannerLabel}
                      </label>
                      <input
                        id={`${uid}-event-banner`}
                        name="banner_url"
                        type="url"
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect="off"
                        enterKeyHint="next"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="https://..."
                        data-error={`${uid}-event-banner-error`}
                        className={inputClass}
                      />
                      <div
                        id={`${uid}-event-banner-error`}
                        className="dg-error-msg items-center gap-1.5 text-xs text-red-400"
                      >
                        <AlertCircle
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="visually-hidden">
                            {c.errorPrefix}:{' '}
                          </span>
                          {c.eventBannerError}
                        </span>
                      </div>
                    </div>

                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-event-description`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {c.eventDescLabel}
                      </label>
                      <textarea
                        id={`${uid}-event-description`}
                        name="description"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Programação e informações para o público..."
                        className={`${inputClass} min-h-[76px]`}
                      />
                    </div>
                  </fieldset>

                  {/* Compact Ticket Tiers */}
                  <fieldset className="space-y-3 pt-4 border-t border-[#1e222e]">
                    <div className="flex items-center justify-between gap-3">
                      <legend className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        {c.legendTiers}
                      </legend>
                      <button
                        type="button"
                        onClick={handleAddTier}
                        className="font-markazi text-lg underline underline-offset-4 decoration-zinc-700 text-zinc-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{c.addTier}</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {tiers.map((tier, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-md bg-[#0f1117] border border-[#1e222e] space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_104px_88px_auto] gap-3 items-start">
                            <div className="dg-field space-y-1">
                              <label
                                htmlFor={`${uid}-tier-name-${idx}`}
                                className="block text-[11px] font-bold text-zinc-400"
                              >
                                {c.tierNameLabel}
                              </label>
                              <input
                                id={`${uid}-tier-name-${idx}`}
                                name={`tier_name_${idx}`}
                                type="text"
                                required
                                value={tier.name}
                                onChange={(e) =>
                                  handleTierChange(idx, 'name', e.target.value)
                                }
                                data-error={`${uid}-tier-name-err-${idx}`}
                                className={inputClass}
                              />
                              <div
                                id={`${uid}-tier-name-err-${idx}`}
                                className="dg-error-msg items-center gap-1 text-xs text-red-400"
                              >
                                <AlertCircle
                                  className="w-3.5 h-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>
                                  <span className="visually-hidden">
                                    {c.errorPrefix}:{' '}
                                  </span>
                                  {c.tierNameError}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor={`${uid}-tier-brl-${idx}`}
                                className="block text-[11px] font-bold text-zinc-400"
                              >
                                {c.tierPriceBrl}
                              </label>
                              <input
                                id={`${uid}-tier-brl-${idx}`}
                                name={`tier_price_brl_${idx}`}
                                type="number"
                                min={0}
                                step="0.01"
                                required
                                value={tier.price_brl}
                                onChange={(e) =>
                                  handleTierChange(
                                    idx,
                                    'price_brl',
                                    e.target.value
                                  )
                                }
                                className={`${inputClass} font-mono`}
                              />
                            </div>

                            <div className="space-y-1">
                              <label
                                htmlFor={`${uid}-tier-qty-${idx}`}
                                className="block text-[11px] font-bold text-zinc-400"
                              >
                                {c.tierQty}
                              </label>
                              <input
                                id={`${uid}-tier-qty-${idx}`}
                                name={`tier_qty_${idx}`}
                                type="number"
                                min={1}
                                step={1}
                                required
                                value={tier.quantity_total}
                                onChange={(e) =>
                                  handleTierChange(
                                    idx,
                                    'quantity_total',
                                    e.target.value
                                  )
                                }
                                className={`${inputClass} font-mono`}
                              />
                            </div>

                            {tiers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTier(idx)}
                                aria-label={`${c.removeTier} ${idx + 1}`}
                                className="sm:mt-[20px] min-w-[44px] min-h-[48px] inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-red-400 transition cursor-pointer"
                              >
                                <Trash2
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            <input
                              id={`${uid}-tier-specs-${idx}`}
                              name={`tier_requires_car_specs_${idx}`}
                              type="checkbox"
                              checked={tier.requires_car_specs}
                              onChange={(e) =>
                                handleTierChange(
                                  idx,
                                  'requires_car_specs',
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 accent-white rounded border-[#1e222e] bg-[#08090b] cursor-pointer shrink-0"
                            />
                            <label
                              htmlFor={`${uid}-tier-specs-${idx}`}
                              className="text-xs text-zinc-400 cursor-pointer"
                            >
                              {c.tierRequiresCar}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>

                  {eventError && (
                    <div
                      role="alert"
                      className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
                    >
                      <AlertCircle
                        className="w-4 h-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{eventError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep('account')}
                      className="font-markazi text-xl underline underline-offset-4 decoration-zinc-700 text-zinc-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      <span>{c.backBtn}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={eventLoading}
                      className={`${landingPrimaryButtonClass} w-full sm:w-auto`}
                    >
                      {eventLoading ? (
                        <>
                          <Loader2
                            className="w-5 h-5 animate-spin"
                            aria-hidden="true"
                          />
                          <span>{c.publishingBtn}</span>
                        </>
                      ) : (
                        <span>{c.publishBtn}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: PUBLISHED */}
            {step === 'success' && createdEvent && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2
                    ref={successHeadingRef}
                    tabIndex={-1}
                    className="text-3xl font-medium font-markazi text-white tracking-wide focus:outline-none"
                  >
                    {c.successHeading}
                  </h2>
                  <p className="text-sm text-zinc-400">{c.successSub}</p>
                </div>

                <div className="p-4 rounded-md bg-[#0f1117] border border-[#1e222e] space-y-3">
                  <label
                    htmlFor={`${uid}-sales-url`}
                    className="block text-xs font-mono text-zinc-400"
                  >
                    {c.salesLinkLabel}
                  </label>
                  <input
                    id={`${uid}-sales-url`}
                    type="text"
                    readOnly
                    value={salesUrl}
                    className="dg-control w-full bg-[#08090b] border border-[#1e222e] rounded-md px-3 py-2 text-xs font-mono text-white select-all"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopySalesUrl}
                      className={landingSecondaryButtonClass}
                    >
                      {copiedLink ? (
                        <Check
                          className="w-4 h-4 text-emerald-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <Copy className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{copiedLink ? c.copiedLink : c.copyLink}</span>
                    </button>

                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Garanta seu ingresso para ${createdEvent.title}! ${salesUrl}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={landingSecondaryButtonClass}
                    >
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                      <span>{c.shareWhatsapp}</span>
                    </a>

                    <Link
                      to={`/eventos/${createdEvent.slug}`}
                      className={landingSecondaryButtonClass}
                    >
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      <span>{c.viewCheckout}</span>
                    </Link>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleCreateAnother}
                    className="font-markazi text-xl underline underline-offset-4 decoration-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {c.createAnother}
                  </button>

                  <Link to="/organizer" className={landingPrimaryButtonClass}>
                    <span>{c.goDashboard}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-[#050608] border-t border-[#1e222e] py-8 sm:py-10 px-6 sm:px-10 lg:px-12">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/dg-com-br.png"
              alt="Digital Garage"
              className="h-11 sm:h-12 w-auto object-contain"
            />
            <span className="text-zinc-500 text-3xl sm:text-4xl font-[100]" aria-hidden="true">|</span>
            <span className="font-markazi text-zinc-300 text-xl sm:text-2xl pt-1">
              A Plataforma do GearHead
            </span>
          </div>

          <div className="flex items-center gap-7 pr-2 sm:pr-6">
            <a
              href="https://pagar.me"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-90 hover:opacity-100 transition"
            >
              <img
                src="/pagarme-logo.svg"
                alt="Pagar.me V5 PIX"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </a>
            <a
              href="https://stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-90 hover:opacity-100 transition"
            >
              <img
                src="/stripe-logo.png"
                alt="Stripe Payments"
                className="h-6 sm:h-9 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
