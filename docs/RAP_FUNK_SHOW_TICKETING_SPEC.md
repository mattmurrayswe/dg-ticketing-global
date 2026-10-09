# Rap & Funk Music Show Ticketing Platform Architecture & Strategy Specification

## Executive Summary
Large-scale Rap, Hip-Hop, and Funk music shows (e.g. 50,000+ attendees at stadiums, festivals, or arenas) present distinct operational challenges compared to automotive meets: extreme ticket drop surge traffic, high scalping incentive, screenshot reselling fraud, multi-zone VIP stage access, age restriction enforcement, and high-density gate entry bottlenecks where cellular networks routinely fail.

This document outlines the architectural specification and strategy for scaling the Digital Garage ticketing infrastructure to support high-volume Rap & Funk music festivals.

---

## 1. Anti-Scalping & Ticket Fraud Prevention

### 1.1 Dynamic 15-Second Rotating TOTP QR Codes
Static QR codes (PDFs or static images) are vulnerable to screenshot duplication, Telegram reselling, and scalper scalping bots.
- **Dynamic Token Rotation**: The client mobile app renders an animated 2D QR code backed by a Time-Based One-Time Password (TOTP) algorithm seeded with a server-side secret key per ticket order.
- **Rotation Interval**: Re-generates every 15 seconds.
- **Screenshot Protection**: Screen capture prevention APIs (`FLAG_SECURE` on Android, `preventScreenCapture` on iOS) disabled screenshot saving. Any captured screenshot expires in under 15 seconds.

### 1.2 Non-Transferable Digital Identity Lock
- Each ticket is cryptographically tied to the buyer's Brazilian **CPF** (Cadastro de Pessoas Físicas) or passport number.
- Secondary market transfer is strictly controlled via an official platform re-sale queue with price caps (maximum 100% face value) to defeat scalpers.

---

## 2. High-Surge Virtual Queueing & Traffic Control

### 2.1 Virtual Waiting Room (Queue-It Architecture)
During major artist ticket drops (e.g., 50,000 tickets sold out in 3 minutes), backend databases will crash if exposed to raw unthrottled traffic.
- **Redis Token-Bucket Rate Limiter**: Incoming HTTP connections are assigned an encrypted queue token.
- **Controlled Ingress**: Ingress traffic to checkout endpoints is throttled to 250 requests/second per worker, maintaining database stability.
- **Fair Seat Allocation**: Users in the virtual waiting room are granted a 10-minute hold window to complete Pagar.me PIX or credit card checkout.

---

## 3. Offline Turnstile Cryptographic Gate Verification

### 3.1 Network-Independent Entry Verification
Cellular networks (4G/5G) fail at 50,000-person venues. Gate turnstiles and handheld scanners cannot depend on real-time API calls.
- **HMAC-SHA256 Signed JWT QR Tokens**: The dynamic QR code embeds a compact JWT payload signed by the platform's private RSA/HMAC key.
- **Local Handheld Scanners**: Scanners run an offline Android/iOS app pre-loaded with the event's public validation key.
- **Local Validation**: The scanner decodes the QR code offline, verifies the cryptographic signature, checks timestamps, and logs entry locally in under **80 milliseconds**.
- **Peer-to-Peer Gate Sync**: Scanners synchronize checked-in ticket IDs with adjacent gate scanners over local Mesh Wi-Fi or Bluetooth LE.

---

## 4. Multi-Zone Access & RFID/NFC Wristband Integration

### 4.1 Tiered Zone Access Control
Rap and Funk shows feature tiered access zones:
- General Pista
- Pista Premium / Front Stage
- Camarote VIP & Backstage
- Artist & Staff Hospitality

### 4.2 RFID / NFC Wristband Sync
At gate entry, the scanned QR ticket is linked to a high-frequency (13.56 MHz) RFID/NFC wristband.
- NFC wristbands allow instantaneous tap-and-go entry at stage boundaries and VIP lounges.
- Supports cashless food and beverage payments integrated into the event ledger.

---

## 5. Age & Identity Verification Compliance

### 5.1 Age Verification (16+ / 18+ Events)
- Integration with Serpro / Receita Federal CPF API to automatically verify buyer birth date during checkout.
- Automated flag on digital pass for underage attendees (e.g. special color border for under 18) to prevent unauthorized bar sales.

---

## 6. CDC Compliance & Chargeback Protection

### 6.1 Brazilian Consumer Rights (CDC Art. 49)
- Enforces the 7-day right of withdrawal (*direito de arrependimento*) for online purchases made at least 48 hours prior to event start.
- Automatic refund processing via Pagar.me / Stripe API webhook upon user cancellation request.

---

## 7. Comparative Technical Architecture Summary

| Feature | Car Meet Ticketing (Current) | Rap & Funk Show Ticketing (Spec) |
| :--- | :--- | :--- |
| **Typical Scale** | 300 - 2,000 cars & attendees | 10,000 - 60,000+ attendees |
| **Vehicle Registration** | Mandatory (Make, Model, Plate) | Optional / Not Applicable |
| **QR Code Type** | Static / Semi-dynamic QR | 15s Dynamic TOTP Rotating QR |
| **Gate Check-in** | Online API or Mobile Web Scanner | Offline HMAC JWT Scanners + Mesh Sync |
| **Traffic Handling** | Standard REST Endpoints | Virtual Waiting Queue (Redis Token Bucket) |
| **Access Control** | Paddock vs Spectator | Multi-zone RFID / NFC Wristband Tap |
| **Primary Payments** | PIX (Pagar.me) + Stripe Credit Card | PIX Instant + Credit Card + Installments |
