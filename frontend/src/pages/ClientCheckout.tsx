import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  fetchEvents,
  createCheckout,
  CarMeetEvent,
  TicketTier,
} from '../services/api';
import { Language, translations } from '../i18n/translations';
import { CouponInput } from '../components/CouponInput';
import { TicketPassModal } from '../components/TicketPassModal';
import { Navbar } from '../components/Navbar';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Car,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  MapPin,
  QrCode,
  ShieldCheck,
  Ticket,
} from 'lucide-react';

interface ClientCheckoutProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const INTERNATIONAL_LOC_KEYWORDS = [
  'hungary',
  'budapest',
  'italy',
  'italia',
  'lake como',
  'united kingdom',
  'goodwood',
  'london',
  'usa',
  'united states',
  'miami',
  'germany',
  'japan',
  'tokyo',
  'france',
  'spain',
  'portugal',
  'dubai',
];

function isBrazilianEventClient(ev: CarMeetEvent | null): boolean {
  if (!ev) return true;
  if (typeof ev.is_brazilian === 'boolean') return ev.is_brazilian;
  if (ev.payment_gateway) return ev.payment_gateway === 'infinitepay';
  if (ev.country && !['BR', 'BRA', 'BRAZIL', 'BRASIL'].includes(ev.country.toUpperCase())) {
    return false;
  }
  const haystack = `${ev.city || ''} ${ev.location || ''}`.toLowerCase();
  if (INTERNATIONAL_LOC_KEYWORDS.some((k) => haystack.includes(k))) {
    return false;
  }
  return true;
}

function defaultCurrencyForEventClient(ev: CarMeetEvent | null): 'BRL' | 'USD' | 'EUR' {
  if (!ev) return 'BRL';
  if (isBrazilianEventClient(ev)) return 'BRL';
  if (ev.default_currency === 'EUR' || ev.default_currency === 'USD') {
    return ev.default_currency;
  }
  const haystack = `${ev.country || ''} ${ev.city || ''} ${ev.location || ''}`.toLowerCase();
  if (
    haystack.includes('italy') ||
    haystack.includes('it') ||
    haystack.includes('hungary') ||
    haystack.includes('hu') ||
    haystack.includes('lake como') ||
    haystack.includes('budapest')
  ) {
    return 'EUR';
  }
  return 'USD';
}

function isLogoAssetUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith('.svg') || lower.includes('logo') || lower.endsWith('.webp');
}

const RotationalGlobe: React.FC<{ size?: number }> = ({ size = 92 }) => (
  <div
    className="relative flex items-center justify-center overflow-hidden rounded-full bg-zinc-950 border border-zinc-800/80 shrink-0"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <div
      className="absolute inset-0 w-full h-full animate-globe-spin"
      style={{
        backgroundImage: "url('https://unpkg.com/three-globe/example/img/earth-dark.jpg')",
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

    form.addEventListener('blur', handleBlur, true);
    form.addEventListener('input', handleInput);
    form.addEventListener('change', handleChange, true);
    form.addEventListener('invalid', handleInvalid, true);

    return () => {
      if (announceTimer) clearTimeout(announceTimer);
      form.removeEventListener('blur', handleBlur, true);
      form.removeEventListener('input', handleInput);
      form.removeEventListener('change', handleChange, true);
      form.removeEventListener('invalid', handleInvalid, true);
    };
  }, [formRef, announcerRef, depsKey]);
}

const checkoutCopy = {
  pt: {
    eyebrow: 'De GearHead para GearHead',
    backEvents: 'Voltar para Encontre Eventos',
    selectEventHeading: 'Escolha o Evento',
    brGatewayBadge: 'Evento Nacional · InfinitePay',
    intlGatewayBadge: 'Evento Internacional · Stripe',
    step1Title: '1. Categoria do Ingresso',
    step2Title: '2. Credenciamento do Veículo Expositor',
    step3Title: '3. Dados do Comprador',
    step4Title: '4. Pagamento Oficial',
    exhibitorBadge: 'Expositor',
    spectatorDesc: 'Credencial individual para acesso ao evento',
    spotsLeft: 'vagas restantes',
    cpfOptional: 'CPF / CNPJ (opcional — recibo InfinitePay)',
    brPaymentLead: 'Eventos no Brasil são processados com repasse imediato via InfinitePay.',
    intlPaymentLead:
      'Eventos internacionais são processados globalmente via Stripe Checkout.',
    pixTitle: 'PIX Instantâneo',
    pixDesc: 'QR Code imediato e confirmação automática InfinitePay',
    brCardTitle: 'Cartão de Crédito',
    brCardDesc: 'Checkout seguro InfinitePay em Real (R$) com parcelamento',
    stripeCardTitle: 'Cartão Internacional · Apple Pay · Google Pay',
    stripeCardDesc: 'Ambiente criptografado Stripe para eventos internacionais',
    summaryEyebrow: '• Resumo do Ingresso',
    passPreviewBadgeBr: 'INFINITEPAY · BRASIL',
    passPreviewBadgeIntl: 'STRIPE · INTERNATIONAL',
    subtotalLabel: 'Subtotal',
    discountLabel: 'Desconto',
    encryptedFooterBr: 'Processamento Oficial Brasil',
    encryptedFooterIntl: 'Global Encrypted Checkout',
    payPixCta: 'Gerar PIX InfinitePay',
    payInfiniteCardCta: 'Pagar na InfinitePay',
    payStripeCta: 'Pagar com Stripe',
    cancelledBanner: 'O pagamento externo foi cancelado. Seus dados continuam preenchidos caso queira concluir.',
    eventNotFound: 'Evento não encontrado.',
    pixReadyBadge: '• Aguardando Pagamento PIX · InfinitePay',
    pixReadyTitle: 'Escaneie o QR Code Oficial',
    openHostedCheckout: 'Abrir Link Seguro InfinitePay',
    viewIssuedPass: 'Visualizar Ingresso Emitido',
    makeError: 'Informe a marca do veículo.',
    modelError: 'Informe o modelo do veículo.',
    plateError: 'Informe a placa do veículo.',
    nameError: 'Informe seu nome completo.',
    emailError: 'Digite um e-mail válido (ex: voce@exemplo.com).',
    phoneError: 'Informe um telefone ou WhatsApp válido.',
  },
  en: {
    eyebrow: 'From GearHead to GearHead',
    backEvents: 'Back to Car Meet Events',
    selectEventHeading: 'Select Event',
    brGatewayBadge: 'Brazilian Event · InfinitePay',
    intlGatewayBadge: 'International Event · Stripe',
    step1Title: '1. Ticket Category',
    step2Title: '2. Exhibitor Vehicle Registration',
    step3Title: '3. Buyer Credentials',
    step4Title: '4. Official Payment',
    exhibitorBadge: 'Exhibitor',
    spectatorDesc: 'Individual admission pass for event access',
    spotsLeft: 'spots left',
    cpfOptional: 'Tax ID / CPF (optional)',
    brPaymentLead: 'Brazilian events are processed exclusively through InfinitePay in BRL.',
    intlPaymentLead: 'International events are processed globally through Stripe Checkout.',
    pixTitle: 'Instant PIX',
    pixDesc: 'Instant QR Code and automatic confirmation via InfinitePay',
    brCardTitle: 'Credit Card (BRL)',
    brCardDesc: 'Hosted InfinitePay checkout with installment support',
    stripeCardTitle: 'International Card · Apple Pay · Google Pay',
    stripeCardDesc: 'Encrypted multi-currency Stripe Checkout session',
    summaryEyebrow: '• Official Pass Summary',
    passPreviewBadgeBr: 'INFINITEPAY · BRAZIL',
    passPreviewBadgeIntl: 'STRIPE · INTERNATIONAL',
    subtotalLabel: 'Subtotal',
    discountLabel: 'Discount',
    encryptedFooterBr: 'Official Brazil Gateway',
    encryptedFooterIntl: 'Global Encrypted Checkout',
    payPixCta: 'Pay via InfinitePay PIX',
    payInfiniteCardCta: 'Pay with InfinitePay',
    payStripeCta: 'Pay with Stripe',
    cancelledBanner: 'Payment was cancelled. You can review your details and try again.',
    eventNotFound: 'Event not found.',
    pixReadyBadge: '• Awaiting PIX Payment · InfinitePay',
    pixReadyTitle: 'Scan Official PIX QR Code',
    openHostedCheckout: 'Open InfinitePay Checkout Link',
    viewIssuedPass: 'Open Official Pass',
    makeError: 'Enter the vehicle make.',
    modelError: 'Enter the vehicle model.',
    plateError: 'Enter the vehicle license plate.',
    nameError: 'Enter your full name.',
    emailError: 'Enter a valid email address.',
    phoneError: 'Enter a valid WhatsApp or phone number.',
  },
  it: {
    eyebrow: 'Da GearHead a GearHead',
    backEvents: 'Torna agli Eventi',
    selectEventHeading: 'Seleziona Evento',
    brGatewayBadge: 'Evento Brasile · InfinitePay',
    intlGatewayBadge: 'Evento Internazionale · Stripe',
    step1Title: '1. Categoria Biglietto',
    step2Title: '2. Registrazione Veicolo Espositore',
    step3Title: '3. Dati Acquirente',
    step4Title: '4. Pagamento Ufficiale',
    exhibitorBadge: 'Espositore',
    spectatorDesc: 'Pass individuale per l’accesso all’evento',
    spotsLeft: 'posti rimasti',
    cpfOptional: 'CPF / Codice Fiscale (opzionale)',
    brPaymentLead: 'Gli eventi in Brasile sono elaborati tramite InfinitePay (BRL).',
    intlPaymentLead: 'Gli eventi internazionali sono elaborati tramite Stripe Checkout.',
    pixTitle: 'PIX Istantaneo',
    pixDesc: 'Codice QR immediato tramite InfinitePay',
    brCardTitle: 'Carta di Credito (BRL)',
    brCardDesc: 'Checkout sicuro InfinitePay',
    stripeCardTitle: 'Carta Internazionale · Apple Pay · Google Pay',
    stripeCardDesc: 'Sessione crittografata Stripe Checkout',
    summaryEyebrow: '• Riepilogo Pass Ufficiale',
    passPreviewBadgeBr: 'INFINITEPAY · BRASILE',
    passPreviewBadgeIntl: 'STRIPE · INTERNATIONAL',
    subtotalLabel: 'Subtotale',
    discountLabel: 'Sconto',
    encryptedFooterBr: 'Gateway Ufficiale Brasile',
    encryptedFooterIntl: 'Checkout Globale Crittografato',
    payPixCta: 'Paga con PIX InfinitePay',
    payInfiniteCardCta: 'Paga con InfinitePay',
    payStripeCta: 'Paga con Stripe',
    cancelledBanner: 'Il pagamento è stato annullato. Puoi riprovare quando vuoi.',
    eventNotFound: 'Evento non trovato.',
    pixReadyBadge: '• In attesa di pagamento PIX · InfinitePay',
    pixReadyTitle: 'Scansiona il QR Code PIX',
    openHostedCheckout: 'Apri Link InfinitePay',
    viewIssuedPass: 'Visualizza Pass Ufficiale',
    makeError: 'Inserisci la marca del veicolo.',
    modelError: 'Inserisci il modello del veicolo.',
    plateError: 'Inserisci la targa del veicolo.',
    nameError: 'Inserisci il tuo nome completo.',
    emailError: 'Inserisci un indirizzo email valido.',
    phoneError: 'Inserisci un numero di telefono valido.',
  },
} as const;

export const ClientCheckout: React.FC<ClientCheckoutProps> = ({
  currentLang,
  onLanguageChange,
}) => {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  const slugParam = routeSlug || searchParams.get('slug');
  const eventIdParam = searchParams.get('event_id');
  const wasCancelled = searchParams.get('cancelled') === 'true';
  const isDedicatedView = Boolean(slugParam || eventIdParam);

  const t = translations[currentLang];
  const c = checkoutCopy[currentLang];

  const [events, setEvents] = useState<CarMeetEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CarMeetEvent | null>(null);
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);

  // Currency & Payment Gateway State
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');

  // Buyer Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');

  // Vehicle Info
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');

  // Coupon State
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountBrl, setDiscountBrl] = useState<number>(0);

  // Submission & Order State
  const [eventsLoading, setEventsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const isBrazilian = isBrazilianEventClient(selectedEvent);
  const activeGateway: 'infinitepay' | 'stripe' = isBrazilian ? 'infinitepay' : 'stripe';

  usePostInteractionValidation(
    formRef,
    announcerRef,
    `${selectedEvent?.id ?? 'none'}-${selectedTier?.id ?? 'none'}-${Boolean(
      selectedTier?.requires_car_specs
    )}`
  );

  const applySelectedEvent = (ev: CarMeetEvent | null) => {
    setSelectedEvent(ev);
    setOrderResult(null);
    setSubmitError(null);
    setAppliedCoupon(null);
    setDiscountBrl(0);

    if (!ev) {
      setSelectedTier(null);
      return;
    }

    const br = isBrazilianEventClient(ev);
    setCurrency(defaultCurrencyForEventClient(ev));
    setPaymentMethod(br ? 'pix' : 'credit_card');
    setSelectedTier(ev.tiers.length > 0 ? ev.tiers[0] : null);
  };

  useEffect(() => {
    setEventsLoading(true);
    fetchEvents()
      .then((data) => {
        setEvents(data);
        if (data.length > 0) {
          const matched = data.find(
            (e) => e.slug === slugParam || String(e.id) === eventIdParam
          );
          const target = isDedicatedView ? matched || null : data[0];
          applySelectedEvent(target);
        }
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => setEventsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, eventIdParam, isDedicatedView]);

  useEffect(() => {
    if (selectedEvent) {
      document.title = `${selectedEvent.title} — Checkout | Digital Garage`;
    } else {
      document.title = 'Checkout Oficial | Digital Garage';
    }
  }, [selectedEvent]);

  const handleTierSelect = (tier: TicketTier) => {
    setSelectedTier(tier);
    setAppliedCoupon(null);
    setDiscountBrl(0);
    setOrderResult(null);
    setSubmitError(null);
  };

  const getTierAmount = (tier: TicketTier, cur: 'BRL' | 'USD' | 'EUR' = currency): number => {
    if (cur === 'USD') return tier.price_usd || Number((tier.price_brl / 5).toFixed(2));
    if (cur === 'EUR') return tier.price_eur || Number((tier.price_brl / 5.5).toFixed(2));
    return tier.price_brl;
  };

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'R$';

  const formatMoney = (val: number, cur: 'BRL' | 'USD' | 'EUR' = currency): string => {
    const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : 'R$';
    if (cur === 'BRL') {
      return `${sym} ${val.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `${sym} ${val.toFixed(2)}`;
  };

  const subtotalDisplay = selectedTier ? getTierAmount(selectedTier, currency) : 0;
  const discountRatio =
    selectedTier && selectedTier.price_brl > 0
      ? subtotalDisplay / selectedTier.price_brl
      : currency === 'USD'
        ? 1 / 5
        : currency === 'EUR'
          ? 1 / 5.5
          : 1;
  const discountDisplay = Number((discountBrl * discountRatio).toFixed(2));
  const totalDisplay = Math.max(0, Number((subtotalDisplay - discountDisplay).toFixed(2)));

  const handleCouponApplied = (code: string, discBrl: number) => {
    setAppliedCoupon(code || null);
    setDiscountBrl(discBrl || 0);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      firstInvalid?.focus();
      return;
    }

    if (!selectedEvent || !selectedTier) return;

    setLoading(true);
    try {
      const effectiveMethod = isBrazilian ? paymentMethod : 'credit_card';
      const effectiveCurrency = isBrazilian ? 'BRL' : currency;

      const res = await createCheckout({
        event_id: selectedEvent.id,
        ticket_tier_id: selectedTier.id,
        buyer_name: name.trim(),
        buyer_email: email.trim(),
        buyer_phone: phone.trim(),
        cpf_cnpj: isBrazilian && cpf.trim() ? cpf.trim() : undefined,
        car_make: selectedTier.requires_car_specs ? make.trim() : undefined,
        car_model: selectedTier.requires_car_specs ? model.trim() : undefined,
        car_year: selectedTier.requires_car_specs && year.trim() ? year.trim() : undefined,
        car_color: selectedTier.requires_car_specs && color.trim() ? color.trim() : undefined,
        license_plate:
          selectedTier.requires_car_specs && plate.trim()
            ? plate.trim().toUpperCase()
            : undefined,
        coupon_code: appliedCoupon || undefined,
        payment_method: effectiveMethod,
        currency: effectiveCurrency,
      });

      const checkoutUrl: string | undefined = res?.payment_details?.checkout_url;
      const hasInlinePixQr = Boolean(
        isBrazilian &&
          effectiveMethod === 'pix' &&
          (res?.payment_details?.pix_qr_code_base64 || res?.payment_details?.pix_copy_paste)
      );

      // Redirect immediately to Stripe (International) or hosted InfinitePay Checkout
      if (checkoutUrl && !hasInlinePixQr) {
        window.location.assign(checkoutUrl);
        return;
      }

      const enriched = {
        ...res,
        event_slug: selectedEvent.slug,
        event_title: selectedEvent.title,
        event_date: selectedEvent.date,
        event_location: selectedEvent.location,
        tier_name: selectedTier.name,
        buyer_name: name.trim(),
        buyer_email: email.trim(),
        car_make: make.trim() || undefined,
        car_model: model.trim() || undefined,
        car_year: year.trim() || undefined,
        car_color: color.trim() || undefined,
        license_plate: plate.trim() ? plate.trim().toUpperCase() : undefined,
      };
      setOrderResult(enriched);
      if (!hasInlinePixQr) {
        setShowPassModal(true);
      }
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.detail ||
          err?.message ||
          'Não foi possível iniciar o pagamento. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPixToClipboard = () => {
    if (orderResult?.payment_details?.pix_copy_paste) {
      navigator.clipboard.writeText(orderResult.payment_details.pix_copy_paste);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  // Signature monochrome design tokens matching Criar Evento, Landing Page, Área do Organizador & TicketPassModal
  const inputClass =
    'dg-control w-full bg-[#0b0d12]/90 border border-[#262a36] rounded-md px-3.5 py-2.5 text-white placeholder:text-zinc-500 transition';
  const primaryEditorialBtnClass =
    'w-full underline underline-offset-4 decoration-zinc-700 border-2 border-[#1e222e] hover:border-white/40 rounded-md px-6 py-3 font-markazi text-2xl bg-gradient-to-tr from-black to-[#0f1117] hover:from-[#0f1117] hover:to-[#181b24] text-white transition inline-flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-h-[54px]';
  const secondaryMonoBtnClass =
    'border border-[#1e222e] hover:border-white/30 rounded-md px-4 py-2.5 text-xs font-bold bg-[#0f1117] hover:bg-[#151720] text-zinc-200 hover:text-white transition inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white min-h-[44px]';

  const payButtonLabel = isBrazilian
    ? paymentMethod === 'pix'
      ? `${c.payPixCta} · ${formatMoney(totalDisplay, 'BRL')}`
      : `${c.payInfiniteCardCta} · ${formatMoney(totalDisplay, 'BRL')}`
    : `${c.payStripeCta} · ${formatMoney(totalDisplay, currency)}`;

  return (
    <div className="dg-checkout-mono min-h-[100dvh] bg-[#08090b] text-white flex flex-col font-sans">
      <Navbar currentLang={currentLang} onLanguageChange={onLanguageChange} />

      <div ref={announcerRef} aria-live="polite" className="visually-hidden" />

      {/* Editorial Hero Header (matches LandingPage, OrganizerDashboard & FindEventsV2) */}
      <section className="relative pt-10 pb-10 px-4 sm:px-8 border-b border-[#1e222e] bg-gradient-to-b from-[#0d0e14] to-[#08090b]">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Breadcrumb & Gateway Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/eventos-v2"
              className="font-markazi text-xl underline underline-offset-4 decoration-zinc-700 hover:decoration-white text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{c.backEvents}</span>
            </Link>

            {selectedEvent && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#08090b] border border-[#262a36] text-[11px] font-exo font-bold uppercase tracking-wider text-zinc-200">
                {isBrazilian ? (
                  <Lock className="w-3.5 h-3.5 text-zinc-300" aria-hidden="true" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-zinc-300" aria-hidden="true" />
                )}
                <span>{isBrazilian ? c.brGatewayBadge : c.intlGatewayBadge}</span>
              </span>
            )}
          </div>

          {eventsLoading ? (
            <div className="py-10 flex items-center gap-3 text-zinc-400 font-mono text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-white" aria-hidden="true" />
              <span>Carregando bilheteria oficial...</span>
            </div>
          ) : selectedEvent ? (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-3xl space-y-2">
                <p className="font-markazi text-[1.6rem] text-zinc-400 leading-none">
                  {c.eyebrow}
                </p>

                <h1 className="text-4xl lg:text-5xl font-medium font-markazi text-white tracking-wide leading-tight">
                  {selectedEvent.title}
                </h1>

                {selectedEvent.description && (
                  <p className="font-markazi text-xl text-zinc-400 max-w-2xl leading-snug">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-zinc-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                    <span>{selectedEvent.date}</span>
                  </span>
                  <span className="text-zinc-600" aria-hidden="true">
                    |
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                    <span>{selectedEvent.location || selectedEvent.city}</span>
                  </span>
                </div>
              </div>

              {/* Event Emblem / Banner + Monochrome Rotational Globe */}
              <div className="flex items-center gap-5 shrink-0">
                {selectedEvent.banner_url && (
                  <div className="w-36 h-24 sm:w-44 sm:h-28 rounded-xl bg-[#0b0d12] border border-[#1e222e] overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={selectedEvent.banner_url}
                      alt={selectedEvent.title}
                      className={
                        isLogoAssetUrl(selectedEvent.banner_url)
                          ? 'max-h-16 max-w-[80%] w-auto object-contain'
                          : 'w-full h-full object-cover grayscale-[20%] contrast-105'
                      }
                    />
                  </div>
                )}
                <div className="hidden sm:block">
                  <RotationalGlobe size={92} />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#0f1117] border border-[#1e222e] text-center space-y-4 max-w-xl mx-auto">
              <p className="font-markazi text-2xl text-white">{c.eventNotFound}</p>
              <Link to="/eventos-v2" className={`${secondaryMonoBtnClass} mx-auto w-auto`}>
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>{c.backEvents}</span>
              </Link>
            </div>
          )}

          {/* Multi-Event Catalog Switcher when visiting /checkout directly */}
          {!isDedicatedView && events.length > 1 && (
            <div className="pt-4 border-t border-[#1e222e] space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                {c.selectEventHeading}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {events.map((ev) => {
                  const evIsBr = isBrazilianEventClient(ev);
                  const isSelected = selectedEvent?.id === ev.id;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => applySelectedEvent(ev)}
                      aria-pressed={isSelected}
                      className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-tr from-black to-[#151720] border-white/50 text-white'
                          : 'bg-[#0b0d12]/80 border-[#1e222e] hover:border-zinc-600 text-zinc-300'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg bg-[#08090b] border border-[#1e222e] overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={ev.banner_url}
                          alt=""
                          className={
                            isLogoAssetUrl(ev.banner_url)
                              ? 'max-h-9 max-w-[80%] w-auto object-contain'
                              : 'w-full h-full object-cover'
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-exo font-bold uppercase tracking-wider text-zinc-400">
                            {evIsBr ? 'BR · InfinitePay' : `${ev.country || 'INTL'} · Stripe`}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white truncate mt-0.5">{ev.title}</p>
                        <p className="text-[11px] font-mono text-zinc-400 truncate">{ev.city}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Checkout Split Workspace */}
      {selectedEvent && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10">
          {wasCancelled && (
            <div
              role="status"
              className="mb-6 p-4 rounded-xl bg-[#0f1117] border border-white/25 text-xs text-zinc-200 flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
              <span>{c.cancelledBanner}</span>
            </div>
          )}

          <form
            ref={formRef}
            method="post"
            action="/api/checkout/create"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* LEFT 7 COLS: .dg-parede-queimada Form Workspace (mirrors Criar Evento) */}
            <div className="lg:col-span-7 dg-parede-queimada rounded-2xl border border-[#1e222e] p-6 sm:p-8 space-y-8">
              {/* STEP 1: TICKET TIER SELECTION */}
              <fieldset className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <legend className="font-righteous text-lg text-white tracking-wide flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-zinc-300" aria-hidden="true" />
                    <span>{c.step1Title}</span>
                  </legend>

                  {/* Currency Display: Locked BRL for Brazilian InfinitePay events; USD/EUR switcher for International Stripe events */}
                  {isBrazilian ? (
                    <span className="px-2.5 py-1 rounded-md bg-[#08090b] border border-[#262a36] text-[11px] font-mono text-zinc-300">
                      Moeda Oficial: R$ BRL
                    </span>
                  ) : (
                    <div
                      role="group"
                      aria-label="Currency"
                      className="inline-flex p-0.5 rounded-md bg-[#08090b] border border-[#262a36]"
                    >
                      {(['EUR', 'USD'] as const).map((cur) => (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => setCurrency(cur)}
                          aria-pressed={currency === cur}
                          className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                            currency === cur
                              ? 'bg-white text-[#08090b]'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {cur === 'EUR' ? '€ EUR' : '$ USD'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedEvent.tiers.map((tierItem) => {
                    const isSelected = selectedTier?.id === tierItem.id;
                    const tierInputId = `${uid}-tier-${tierItem.id}`;
                    const remaining = Math.max(
                      0,
                      tierItem.quantity_total - tierItem.quantity_sold
                    );
                    return (
                      <div key={tierItem.id} className="relative">
                        <input
                          id={tierInputId}
                          type="radio"
                          name="ticket_tier_id"
                          value={tierItem.id}
                          checked={isSelected}
                          onChange={() => handleTierSelect(tierItem)}
                          className="visually-hidden peer"
                        />
                        <label
                          htmlFor={tierInputId}
                          className={`block p-4 sm:p-5 rounded-xl border transition cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white ${
                            isSelected
                              ? 'bg-gradient-to-tr from-black to-[#151720] border-white/60'
                              : 'bg-[#0b0d12]/90 border-[#1e222e] hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? 'border-white bg-white text-[#08090b]'
                                      : 'border-zinc-600 bg-transparent'
                                  }`}
                                  aria-hidden="true"
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </span>
                                <span className="text-base font-bold text-white">
                                  {tierItem.name}
                                </span>
                                {tierItem.requires_car_specs && (
                                  <span className="px-2 py-0.5 rounded bg-[#08090b] border border-[#262a36] text-[10px] font-exo font-bold uppercase tracking-wider text-zinc-200">
                                    {c.exhibitorBadge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400 pl-6">
                                {tierItem.requires_car_specs ? t.requiresSpecs : c.spectatorDesc}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-lg font-black text-white font-mono block">
                                {formatMoney(getTierAmount(tierItem, currency), currency)}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {remaining} {c.spotsLeft}
                              </span>
                            </div>
                          </div>

                          {tierItem.perks && tierItem.perks.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-[#1e222e] flex flex-wrap gap-2 pl-6">
                              {tierItem.perks.map((perk, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] text-zinc-300 bg-[#08090b] px-2.5 py-1 rounded-md border border-[#1e222e] inline-flex items-center gap-1.5"
                                >
                                  <Check className="w-3 h-3 text-zinc-300" aria-hidden="true" />
                                  <span>{perk}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              {/* STEP 2: VEHICLE SPECS (Conditional for Exhibitor Tiers) */}
              {selectedTier?.requires_car_specs && (
                <fieldset className="space-y-4 pt-6 border-t border-[#1e222e]">
                  <legend className="font-righteous text-lg text-white tracking-wide flex items-center gap-2">
                    <Car className="w-4 h-4 text-zinc-300" aria-hidden="true" />
                    <span>{c.step2Title}</span>
                  </legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-car-make`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {t.make} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id={`${uid}-car-make`}
                        name="car_make"
                        type="text"
                        required
                        enterKeyHint="next"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder="Porsche, Nissan, BMW..."
                        data-error={`${uid}-car-make-err`}
                        className={inputClass}
                      />
                      <div
                        id={`${uid}-car-make-err`}
                        className="dg-error-msg items-center gap-1.5 text-xs text-zinc-200"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{c.makeError}</span>
                      </div>
                    </div>

                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-car-model`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {t.model} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id={`${uid}-car-model`}
                        name="car_model"
                        type="text"
                        required
                        enterKeyHint="next"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="911 GT3, Skyline R34..."
                        data-error={`${uid}-car-model-err`}
                        className={inputClass}
                      />
                      <div
                        id={`${uid}-car-model-err`}
                        className="dg-error-msg items-center gap-1.5 text-xs text-zinc-200"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{c.modelError}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`${uid}-car-year`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {t.year}
                      </label>
                      <input
                        id={`${uid}-car-year`}
                        name="car_year"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        enterKeyHint="next"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="2024"
                        className={`${inputClass} font-mono`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor={`${uid}-car-color`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {t.color}
                      </label>
                      <input
                        id={`${uid}-car-color`}
                        name="car_color"
                        type="text"
                        enterKeyHint="next"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="Preto Ônix"
                        className={inputClass}
                      />
                    </div>

                    <div className="dg-field space-y-1.5">
                      <label
                        htmlFor={`${uid}-car-plate`}
                        className="block text-xs font-bold text-zinc-200"
                      >
                        {t.plate} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id={`${uid}-car-plate`}
                        name="license_plate"
                        type="text"
                        required
                        spellCheck={false}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        enterKeyHint="next"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        placeholder="ABC-1D23"
                        data-error={`${uid}-car-plate-err`}
                        className={`${inputClass} font-mono uppercase`}
                      />
                      <div
                        id={`${uid}-car-plate-err`}
                        className="dg-error-msg items-center gap-1.5 text-xs text-zinc-200"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{c.plateError}</span>
                      </div>
                    </div>
                  </div>
                </fieldset>
              )}

              {/* STEP 3: BUYER CREDENTIALS */}
              <fieldset className="space-y-4 pt-6 border-t border-[#1e222e]">
                <legend className="font-righteous text-lg text-white tracking-wide">
                  {selectedTier?.requires_car_specs
                    ? c.step3Title
                    : `2. ${t.buyerDetailsTitle}`}
                </legend>

                <div className="dg-field space-y-1.5">
                  <label
                    htmlFor={`${uid}-buyer-name`}
                    className="block text-xs font-bold text-zinc-200"
                  >
                    {t.name} <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id={`${uid}-buyer-name`}
                    name="buyer_name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    enterKeyHint="next"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo do titular"
                    data-error={`${uid}-buyer-name-err`}
                    className={inputClass}
                  />
                  <div
                    id={`${uid}-buyer-name-err`}
                    className="dg-error-msg items-center gap-1.5 text-xs text-zinc-200"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{c.nameError}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="dg-field space-y-1.5">
                    <label
                      htmlFor={`${uid}-buyer-email`}
                      className="block text-xs font-bold text-zinc-200"
                    >
                      {t.email} <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id={`${uid}-buyer-email`}
                      name="buyer_email"
                      type="email"
                      autoComplete="email"
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                      enterKeyHint="next"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="gearhead@dominio.com"
                      data-error={`${uid}-buyer-email-err`}
                      className={inputClass}
                    />
                    <div
                      id={`${uid}-buyer-email-err`}
                      className="dg-error-msg items-center gap-1.5 text-xs text-zinc-200"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{c.emailError}</span>
                    </div>
                  </div>

                  <div className="dg-field space-y-1.5">
                    <label
                      htmlFor={`${uid}-buyer-phone`}
                      className="block text-xs font-bold text-zinc-200"
                    >
                      {t.phone} <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id={`${uid}-buyer-phone`}
                      name="buyer_phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      minLength={8}
                      enterKeyHint={isBrazilian ? 'next' : 'done'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={isBrazilian ? '+55 (41) 99999-9999' : '+39 02 1234 5678'}
                      data-error={`${uid}-buyer-phone-err`}
                      className={inputClass}
                    />
                    <div
                      id={`${uid}-buyer-phone-err`}
                      className="dg-error-msg items-center gap-1.5 text-xs text-zinc-200"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{c.phoneError}</span>
                    </div>
                  </div>
                </div>

                {isBrazilian && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${uid}-buyer-cpf`}
                      className="block text-xs font-bold text-zinc-200"
                    >
                      {c.cpfOptional}
                    </label>
                    <input
                      id={`${uid}-buyer-cpf`}
                      name="cpf_cnpj"
                      type="text"
                      inputMode="numeric"
                      spellCheck={false}
                      autoCorrect="off"
                      enterKeyHint="done"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                )}
              </fieldset>

              {/* STEP 4: REGIONAL PAYMENT GATEWAY (InfinitePay for Brazil / Stripe for International) */}
              <fieldset className="space-y-4 pt-6 border-t border-[#1e222e]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <legend className="font-righteous text-lg text-white tracking-wide">
                    {selectedTier?.requires_car_specs
                      ? c.step4Title
                      : `3. ${t.paymentMethodTitle}`}
                  </legend>

                  {activeGateway === 'infinitepay' ? (
                    <img
                      src="/infinitepay-logo.svg"
                      alt="InfinitePay"
                      className="h-5 w-auto object-contain opacity-95"
                    />
                  ) : (
                    <img
                      src="/stripe-logo.png"
                      alt="Stripe"
                      className="h-6 w-auto object-contain brightness-0 invert opacity-95"
                    />
                  )}
                </div>

                <p className="text-xs text-zinc-400">
                  {isBrazilian ? c.brPaymentLead : c.intlPaymentLead}
                </p>

                {isBrazilian ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Option 1: PIX via InfinitePay */}
                    <div className="relative">
                      <input
                        id={`${uid}-pay-pix`}
                        type="radio"
                        name="payment_method"
                        value="pix"
                        checked={paymentMethod === 'pix'}
                        onChange={() => setPaymentMethod('pix')}
                        className="visually-hidden peer"
                      />
                      <label
                        htmlFor={`${uid}-pay-pix`}
                        className={`h-full p-4 rounded-xl border transition flex flex-col justify-between gap-3 cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white ${
                          paymentMethod === 'pix'
                            ? 'bg-gradient-to-tr from-black to-[#151720] border-white/60 text-white'
                            : 'bg-[#0b0d12]/90 border-[#1e222e] hover:border-zinc-600 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                            <QrCode className="w-4 h-4 text-zinc-200" aria-hidden="true" />
                            <span>{c.pixTitle}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#08090b] border border-[#262a36] text-[10px] font-mono uppercase text-zinc-300">
                            PIX
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{c.pixDesc}</p>
                        <div className="pt-2 border-t border-[#1e222e] flex items-center justify-between">
                          <img
                            src="/infinitepay-logo.svg"
                            alt="InfinitePay"
                            className="h-4 w-auto object-contain opacity-85"
                          />
                          <span className="text-[10px] font-mono text-zinc-400">BRL · 24/7</span>
                        </div>
                      </label>
                    </div>

                    {/* Option 2: Credit Card via InfinitePay */}
                    <div className="relative">
                      <input
                        id={`${uid}-pay-br-card`}
                        type="radio"
                        name="payment_method"
                        value="credit_card"
                        checked={paymentMethod === 'credit_card'}
                        onChange={() => setPaymentMethod('credit_card')}
                        className="visually-hidden peer"
                      />
                      <label
                        htmlFor={`${uid}-pay-br-card`}
                        className={`h-full p-4 rounded-xl border transition flex flex-col justify-between gap-3 cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white ${
                          paymentMethod === 'credit_card'
                            ? 'bg-gradient-to-tr from-black to-[#151720] border-white/60 text-white'
                            : 'bg-[#0b0d12]/90 border-[#1e222e] hover:border-zinc-600 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                            <CreditCard className="w-4 h-4 text-zinc-200" aria-hidden="true" />
                            <span>{c.brCardTitle}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#08090b] border border-[#262a36] text-[10px] font-mono uppercase text-zinc-300">
                            ATÉ 12X
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {c.brCardDesc}
                        </p>
                        <div className="pt-2 border-t border-[#1e222e] flex items-center justify-between">
                          <img
                            src="/infinitepay-logo.svg"
                            alt="InfinitePay"
                            className="h-4 w-auto object-contain opacity-85"
                          />
                          <span className="text-[10px] font-mono text-zinc-400">
                            Checkout Seguro
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  /* International Events: Stripe Global Card + Wallets */
                  <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-tr from-black to-[#151720] border border-white/50 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                        <span className="text-sm font-bold text-white">{c.stripeCardTitle}</span>
                      </div>
                      <img
                        src="/stripe-logo.png"
                        alt="Stripe"
                        className="h-5 w-auto object-contain brightness-0 invert"
                      />
                    </div>
                    <p className="text-xs text-zinc-400">{c.stripeCardDesc}</p>
                    <div className="pt-2.5 border-t border-[#1e222e] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-400 uppercase">
                      <span>Visa · Mastercard · Amex · Apple Pay · Google Pay</span>
                      <span>{currencySymbol} {currency}</span>
                    </div>
                  </div>
                )}
              </fieldset>
            </div>

            {/* RIGHT 5 COLS: Sticky Boarding-Pass Live Ticket Summary (mirrors TicketPassModal.tsx) */}
            <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
              <div className="bg-gradient-to-b from-[#0b0c11] to-[#08090b] border border-[#1e222e] rounded-2xl overflow-hidden shadow-2xl">
                {/* Boarding-Pass Top Header */}
                <div className="dg-parede-queimada border-b border-[#1e222e] px-6 pt-6 pb-5 text-center">
                  <img
                    src="/dg-com-br.png"
                    alt="Digital Garage"
                    className="h-10 mx-auto mb-5 object-contain"
                  />

                  <p className="font-markazi text-xl text-zinc-300 leading-none mb-2.5">
                    {c.summaryEyebrow}
                  </p>

                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#08090b] border border-[#262a36] text-[10px] font-exo text-zinc-200 font-bold uppercase tracking-wider mb-2.5">
                    <span>
                      {isBrazilian ? c.passPreviewBadgeBr : c.passPreviewBadgeIntl}
                    </span>
                  </div>

                  <h2 className="font-righteous text-xl font-normal text-white tracking-wide leading-snug">
                    {selectedEvent.title}
                  </h2>
                </div>

                {/* Boarding-Pass Body */}
                <div className="px-6 pt-5 pb-6 space-y-4">
                  {/* Date & Venue Mini Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#151720] p-3 rounded-xl border border-[#1e222e]">
                      <span className="text-zinc-400 block text-[10px] uppercase font-mono">
                        Data
                      </span>
                      <span className="font-bold text-zinc-200 block mt-0.5 truncate">
                        {selectedEvent.date}
                      </span>
                    </div>
                    <div className="bg-[#151720] p-3 rounded-xl border border-[#1e222e]">
                      <span className="text-zinc-400 block text-[10px] uppercase font-mono">
                        Cidade
                      </span>
                      <span className="font-bold text-zinc-200 block mt-0.5 truncate">
                        {selectedEvent.city}
                      </span>
                    </div>
                  </div>

                  {/* Selected Tier & Live Vehicle Preview */}
                  {selectedTier && (
                    <div className="bg-[#151720] p-3.5 rounded-xl border border-[#1e222e] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-zinc-400 uppercase font-mono block">
                            Categoria Selecionada
                          </span>
                          <span className="text-sm font-bold text-white block truncate">
                            {selectedTier.name}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-[#08090b] border border-[#262a36] text-zinc-200 text-xs font-mono font-bold shrink-0">
                          1x
                        </span>
                      </div>

                      {selectedTier.requires_car_specs && (make || model || plate) && (
                        <div className="pt-2 border-t border-[#1e222e] flex items-center justify-between gap-2 text-xs text-zinc-300">
                          <span className="truncate">
                            {[make, model, year && `(${year})`].filter(Boolean).join(' ') ||
                              'Veículo Expositor'}
                          </span>
                          {plate && (
                            <strong className="font-mono text-white shrink-0">{plate}</strong>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Perforated Boarding-Pass Divider (matches TicketPassModal.tsx) */}
                  <div className="relative py-1.5 flex items-center" aria-hidden="true">
                    <div className="w-5 h-5 rounded-full bg-[#08090b] border border-[#1e222e] -ml-9 shrink-0" />
                    <div className="w-full border-t border-dashed border-[#1e222e]" />
                    <div className="w-5 h-5 rounded-full bg-[#08090b] border border-[#1e222e] -mr-9 shrink-0" />
                  </div>

                  {/* Monochrome Coupon Input */}
                  {selectedTier && (
                    <CouponInput
                      currentLang={currentLang}
                      amountBrl={selectedTier.price_brl}
                      currency={currency}
                      displayAmount={subtotalDisplay}
                      onCouponApplied={(code, discBrl) => handleCouponApplied(code, discBrl)}
                      onCouponCleared={() => handleCouponApplied('', 0)}
                    />
                  )}

                  {/* Totals Breakdown */}
                  {selectedTier && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{c.subtotalLabel}</span>
                        <span className="font-mono text-zinc-200">
                          {formatMoney(subtotalDisplay, currency)}
                        </span>
                      </div>

                      {discountDisplay > 0 && (
                        <div className="flex items-center justify-between text-xs text-zinc-200">
                          <span>
                            {c.discountLabel} ({appliedCoupon})
                          </span>
                          <span className="font-mono text-white">
                            -{formatMoney(discountDisplay, currency)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline justify-between pt-3 border-t border-[#1e222e]">
                        <span className="font-markazi text-2xl text-zinc-200">
                          {t.totalPrice}
                        </span>
                        <span className="text-2xl font-black text-white font-mono">
                          {formatMoney(totalDisplay, currency)}
                        </span>
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div
                      role="alert"
                      className="p-3 rounded-md bg-[#151720] border border-white/40 text-zinc-100 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Signature Editorial Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !selectedTier}
                    className={primaryEditorialBtnClass}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        <span>{t.processing}</span>
                      </>
                    ) : (
                      <>
                        <span>{payButtonLabel}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {/* Monochrome Gateway Trust Strip */}
                  <div className="pt-3 border-t border-[#1e222e] flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-300 shrink-0" aria-hidden="true" />
                      <span>
                        {isBrazilian ? c.encryptedFooterBr : c.encryptedFooterIntl}
                      </span>
                    </span>

                    {isBrazilian ? (
                      <img
                        src="/infinitepay-logo.svg"
                        alt="InfinitePay"
                        className="h-4 w-auto object-contain opacity-90"
                      />
                    ) : (
                      <img
                        src="/stripe-logo.png"
                        alt="Stripe"
                        className="h-4 w-auto object-contain brightness-0 invert opacity-90"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Inline Monochrome PIX InfinitePay Panel (when PIX QR is generated inline) */}
              {orderResult &&
                (orderResult.payment_details?.pix_qr_code_base64 ||
                  orderResult.payment_details?.pix_copy_paste) && (
                  <div
                    role="status"
                    className="bg-gradient-to-b from-[#0b0c11] to-[#08090b] p-6 rounded-2xl border border-white/40 shadow-2xl space-y-4"
                  >
                    <div className="text-center space-y-1">
                      <p className="font-markazi text-xl text-zinc-300 leading-none">
                        {c.pixReadyBadge}
                      </p>
                      <h3 className="font-righteous text-lg text-white pt-1">
                        {c.pixReadyTitle}
                      </h3>
                      <p className="text-xs text-zinc-400">{t.pixInstruction}</p>
                    </div>

                    {orderResult.payment_details?.pix_qr_code_base64 && (
                      <div className="flex justify-center py-2">
                        <img
                          src={orderResult.payment_details.pix_qr_code_base64}
                          alt="QR Code PIX InfinitePay"
                          className="w-44 h-44 rounded-xl border-4 border-white bg-white shadow-lg"
                        />
                      </div>
                    )}

                    {orderResult.payment_details?.pix_copy_paste && (
                      <div className="space-y-2.5">
                        <label
                          htmlFor={`${uid}-pix-payload`}
                          className="visually-hidden"
                        >
                          Código PIX Copia e Cola
                        </label>
                        <input
                          id={`${uid}-pix-payload`}
                          type="text"
                          readOnly
                          value={orderResult.payment_details.pix_copy_paste}
                          className="w-full bg-[#08090b] border border-[#262a36] rounded-md px-3 py-2.5 text-[11px] font-mono text-zinc-300 select-all"
                        />
                        <button
                          type="button"
                          onClick={copyPixToClipboard}
                          className="w-full py-3 bg-white hover:bg-zinc-200 text-[#08090b] font-bold rounded-md text-xs uppercase tracking-wider transition inline-flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {copiedPix ? (
                            <Check className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Copy className="w-4 h-4" aria-hidden="true" />
                          )}
                          <span>{copiedPix ? t.pixCopied : t.copyPix}</span>
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#1e222e] flex flex-col gap-2">
                      {orderResult.payment_details?.checkout_url && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = orderResult.payment_details.checkout_url as string;
                            if (url.startsWith(window.location.origin)) {
                              navigate(url.replace(window.location.origin, ''));
                            } else {
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className={`${secondaryMonoBtnClass} w-full`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{c.openHostedCheckout}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowPassModal(true)}
                        className="font-markazi text-xl underline underline-offset-4 decoration-zinc-700 hover:decoration-white text-zinc-300 hover:text-white transition text-center py-1 cursor-pointer"
                      >
                        {c.viewIssuedPass} (#{orderResult.order_code})
                      </button>
                    </div>
                  </div>
                )}
            </aside>
          </form>
        </main>
      )}

      {/* Footer matching Criar Evento & LandingPage */}
      <footer className="mt-auto bg-[#050608] border-t border-[#1e222e] py-8 sm:py-10 px-6 sm:px-10 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src="/dg-com-br.png"
              alt="Digital Garage"
              className="h-11 sm:h-12 w-auto object-contain"
            />
            <span className="text-zinc-500 text-3xl sm:text-4xl font-[100]" aria-hidden="true">
              |
            </span>
            <span className="font-markazi text-zinc-300 text-xl sm:text-2xl pt-1">
              A Plataforma do GearHead
            </span>
          </div>

          <div className="flex items-center gap-7">
            <img
              src="/infinitepay-logo.svg"
              alt="InfinitePay — Eventos no Brasil"
              className="h-6 w-auto object-contain opacity-85"
            />
            <img
              src="/stripe-logo.png"
              alt="Stripe — International Events"
              className="h-6 w-auto object-contain brightness-0 invert opacity-85"
            />
          </div>
        </div>
      </footer>

      {/* Official Monochrome Ticket Pass Modal */}
      {showPassModal && orderResult && (
        <TicketPassModal
          currentLang={currentLang}
          orderData={orderResult}
          onClose={() => setShowPassModal(false)}
        />
      )}
    </div>
  );
};
