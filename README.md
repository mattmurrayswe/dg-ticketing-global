# Digital Garage Car Meet Ticketing Platform (`dg-ticketing`)

A modern, high-performance, mobile-first ticketing platform built with **Python (FastAPI)**, **React (TypeScript + Tailwind CSS)**, **PostgreSQL 16**, **Redis 7**, and **Docker**. Modeled after Digital Garage's car meet platform (which processed over R$80K across 7 events).

## Features

- 🏎️ **Car Meet Exhibitor & Spectator Ticketing**: Tiered tickets (Expositor Paddock with mandatory vehicle registration: Make, Model, Year, Color, License Plate vs Spectator pass).
- 💚 **Pagar.me PIX Integration (Brazil)**: Real-time QR Code base64 generation and "Copia e Cola" key payload.
- 💳 **Stripe Credit Card Integration**: Integrated Checkout Sessions for credit card payments with webhook listeners.
- 🌐 **Multi-Language (i18n) Support**: Full translation support for **PT-BR 🇧🇷**, **EN-US 🇺🇸**, and **IT 🇮🇹**.
- 💱 **Multi-Currency Support**: Dynamic pricing display in **BRL (R$)**, **USD ($)**, and **EUR (€)**.
- 🏷️ **Discount Coupon Engine**: Flexible coupon validation supporting percentage (e.g. 15% off) and fixed amount discounts (e.g. R$20 off).
- 📲 **Email & WhatsApp Ticket Delivery**: Instant HTML email dispatch & `wa.me` WhatsApp deep-link generation.
- 📊 **Organizer Dashboard**: Real-time sales metrics (R$ total sales, ticket count, car count), Live Gate QR Scanner for entrance check-ins, VIP Cortesia ticket issuer, and CSV roster exporter.
- 📜 **Rap & Funk Music Show Specification**: In-depth strategy report (`docs/RAP_FUNK_SHOW_TICKETING_SPEC.md`) detailing dynamic 15s rotating TOTP QR codes, virtual queueing, and offline HMAC JWT turnstile verification for 50,000+ attendee scale.

---

## Port Allocation (Isolated & Non-Conflicting)

| Service | Internal Port | Host Port | URL / Access |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | `5173` | `5175` | `http://localhost:5175` |
| **Backend API** | `8000` | `8005` | `http://localhost:8005` (Docs: `http://localhost:8005/docs`) |
| **PostgreSQL DB**| `5432` | `5435` | `localhost:5435` |
| **Redis Cache** | `6379` | `6381` | `localhost:6381` |

---

## Quick Start (Docker)

```bash
cd /Users/mattmurrayswe/dg-ticketing

# Launch the full container stack
docker compose up -d --build

# View container status
docker compose ps
```

---

## API Endpoints Overview

- `GET /api/events`: List active car meet events and ticket tiers.
- `POST /api/checkout/create`: Create ticket order, calculate discount, issue PIX/Stripe payment.
- `GET /api/checkout/order/{order_code}`: Fetch order details & digital pass.
- `POST /api/coupons/validate`: Validate discount coupon code.
- `GET /api/organizer/dashboard`: Revenue overview & check-in metrics.
- `POST /api/organizer/checkin`: Validate QR code / license plate at the gate.
- `POST /api/organizer/cortesia`: Issue complimentary VIP pass.
- `POST /api/webhooks/pagarme`: Pagar.me PIX webhook listener.
- `POST /api/webhooks/stripe`: Stripe credit card webhook listener.
