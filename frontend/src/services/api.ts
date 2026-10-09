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

export const validateCoupon = async (code: string, amount_brl: number) => {
  const resp = await api.post('/coupons/validate', { code, amount_brl });
  return resp.data;
};

export const createCheckout = async (payload: CheckoutPayload) => {
  const resp = await api.post('/checkout/create', payload);
  return resp.data;
};

export const getOrderDetails = async (orderCode: string) => {
  const resp = await api.get(`/checkout/order/${orderCode}`);
  return resp.data;
};

export const organizerLogin = async (email: string, password: string) => {
  const resp = await api.post('/organizer/login', { email, password });
  return resp.data;
};

export const createNewEvent = async (payload: any) => {
  const resp = await api.post('/organizer/events/create', payload);
  return resp.data;
};

export const getOrganizerDashboard = async () => {
  const resp = await api.get('/organizer/dashboard');
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
