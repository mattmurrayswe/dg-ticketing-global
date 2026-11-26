import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8005/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface TicketTier {
  id: number;
  name: string;
  badge: 'uncommon' | 'rare' | 'epic' | 'legendary';
  price_brl: number;
  price_usd: number;
  price_eur: number;
  quantity_total: number;
  quantity_sold: number;
  requires_car_specs: boolean;
  perks: string[];
}

export interface CarMeetEvent {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  location: string;
  address: string;
  city: string;
  country?: string;
  is_brazilian?: boolean;
  payment_gateway?: 'infinitepay' | 'stripe';
  default_currency?: 'BRL' | 'USD' | 'EUR';
  banner_url: string;
  description: string;
  status: string;
  tiers: TicketTier[];
}

export interface CheckoutPayload {
  event_id: number;
  ticket_tier_id: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  cpf_cnpj?: string;
  car_make?: string;
  car_model?: string;
  car_year?: string;
  car_color?: string;
  license_plate?: string;
  coupon_code?: string;
  payment_method: 'pix' | 'credit_card';
  currency?: 'BRL' | 'USD' | 'EUR';
}

export const fetchEvents = async (): Promise<CarMeetEvent[]> => {
  const resp = await api.get('/events');
  return resp.data.events;
};

export const fetchEventBySlug = async (slug: string): Promise<CarMeetEvent> => {
  const resp = await api.get(`/events/${encodeURIComponent(slug)}`);
  return resp.data;
};

export const validateCoupon = async (code: string, amount_brl: number) => {
  const resp = await api.post('/coupons/validate', { code, amount_brl });
  return resp.data;
};

export const createCheckout = async (payload: CheckoutPayload) => {
  const resp = await api.post('/checkout/create', payload);
  return resp.data;
};

export const getOrderDetails = async (orderCode: string) => {
  const resp = await api.get(`/checkout/order/${encodeURIComponent(orderCode)}`);
  return resp.data;
};

export const verifyOrderPayment = async (
  orderCode: string,
  params: {
    provider?: string | null;
    session_id?: string | null;
    slug?: string | null;
    transaction_nsu?: string | null;
    demo?: string | null;
  }
) => {
  const resp = await api.post(`/checkout/order/${encodeURIComponent(orderCode)}/verify`, params);
  return resp.data;
};

export const getTicketPdfUrl = (orderCode: string, inline = false) =>
  `${API_BASE}/checkout/order/${encodeURIComponent(orderCode)}/pdf${inline ? '?inline=true' : ''}`;

export const downloadTicketPdf = async (orderCode: string) => {
  const resp = await api.get(`/checkout/order/${encodeURIComponent(orderCode)}/pdf`, {
    responseType: 'blob',
  });
  const blobUrl = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Ingresso-DigitalGarage-${orderCode}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const resendTicketEmail = async (orderCode: string, email?: string) => {
  const resp = await api.post(
    `/checkout/order/${encodeURIComponent(orderCode)}/send-email`,
    email ? { email } : {}
  );
  return resp.data;
};

export interface OrganizerSignupPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  organization?: string;
  instagram?: string;
}

export const organizerSignup = async (payload: OrganizerSignupPayload) => {
  const resp = await api.post('/organizer/signup', payload);
  return resp.data;
};

export const organizerLogin = async (email: string, password: string) => {
  const resp = await api.post('/organizer/login', { email, password });
  return resp.data;
};

export const createNewEvent = async (payload: any, authToken?: string | null) => {
  const token = authToken ?? localStorage.getItem('dg_organizer_token');
  const resp = await api.post('/organizer/events/create', payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return resp.data;
};

export const getOrganizerDashboard = async () => {
  const token = localStorage.getItem('dg_organizer_token');
  const resp = await api.get('/organizer/dashboard', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return resp.data;
};

export const scanGateCheckin = async (codeOrPlate: string) => {
  const resp = await api.post('/organizer/checkin', { qr_code_or_order_code: codeOrPlate });
  return resp.data;
};

export const issueCortesia = async (payload: any) => {
  const resp = await api.post('/organizer/cortesia', payload);
  return resp.data;
};

export interface ClassificadosNearbyVehicle {
  listing_id: number;
  vehicle_type: string;
  vehicle_title: string;
  brand: string;
  model: string;
  version?: string | null;
  year_model?: number | null;
  year_manufacture?: number | null;
  mileage_km?: number | null;
  color?: string | null;
  city: string;
  uf: string;
  distance_km?: number | null;
  is_same_city: boolean;
  is_featured: boolean;
  cover_url?: string | null;
  images: string[];
  spec_badges: string[];
  highlights: string[];
  classificados_url?: string | null;
  owner: {
    id?: number | null;
    name: string;
    role: string;
    phone?: string | null;
    is_verified: boolean;
  };
  already_invited: boolean;
  invite?: {
    invite_id: number;
    order_code: string;
    owner_name: string;
    invited_at: string;
    pass_url: string;
    pdf_url: string;
    whatsapp_invite_url: string;
  } | null;
}

export interface ExhibitorVehiclesResponse {
  status: string;
  source_online?: boolean;
  selected_event: {
    id: number;
    slug: string;
    title: string;
    date: string;
    location: string;
    address?: string | null;
    city: string;
    tiers: Array<{
      id: number;
      name: string;
      badge: string;
      requires_car_specs: boolean;
    }>;
  } | null;
  available_events: Array<{
    id: number;
    slug: string;
    title: string;
    date: string;
    location: string;
    city: string;
  }>;
  origin: {
    city: string;
    uf?: string | null;
    lat?: number;
    lng?: number;
    radius_km: number;
  } | null;
  invite_quota: {
    limit: number;
    used: number;
    remaining: number;
  };
  vehicles: ClassificadosNearbyVehicle[];
  invites_sent: Array<{
    id: number;
    listing_id: number;
    order_code: string;
    vehicle_title: string;
    vehicle_city?: string | null;
    cover_url?: string | null;
    owner_name: string;
    owner_email?: string | null;
    owner_phone?: string | null;
    created_at: string;
    pass_url: string;
    whatsapp_invite_url: string;
  }>;
}

export const fetchNearbyExhibitorVehicles = async (params?: {
  event_id?: number;
  radius_km?: number;
  q?: string;
}): Promise<ExhibitorVehiclesResponse> => {
  const token = localStorage.getItem('dg_organizer_token');
  const resp = await api.get('/organizer/exhibitor-vehicles', {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return resp.data;
};

export const sendExhibitorVehicleInvite = async (payload: {
  event_id: number;
  listing_id: number;
  ticket_tier_id?: number;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  license_plate?: string;
  personal_message?: string;
}) => {
  const token = localStorage.getItem('dg_organizer_token');
  const resp = await api.post('/organizer/exhibitor-invites', payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return resp.data;
};
