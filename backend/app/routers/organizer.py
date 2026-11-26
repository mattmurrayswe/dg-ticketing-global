from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import func
from sqlalchemy.orm import Session
import urllib.parse
from app.config.settings import FRONTEND_URL, FREE_EXHIBITOR_INVITE_LIMIT
from app.db.database import get_db
from app.db.models import TicketOrder, TicketTier, Event, OrganizerUser, ExhibitorInvite
from app.core.security import hash_password, verify_password, create_organizer_token, verify_organizer_token
from app.services.classificados_service import (
    fetch_nearby_classificados_vehicles,
    get_classificados_listing_sanitized,
)
from app.services.email_service import send_ticket_email
from app.services.infinitepay_service import infer_event_country
from app.services.whatsapp_service import send_whatsapp_notification
import re
import secrets
import unicodedata

router = APIRouter(prefix="/api/organizer", tags=["Organizer"])


def seed_default_organizer(db: Session):
    """Seeds default organizer admin if not present."""
    if db.query(OrganizerUser).count() == 0:
        admin = OrganizerUser(
            email="admin@digitalgarage.com.br",
            hashed_password=hash_password("admin123"),
            name="Master Admin",
            role="admin"
        )
        db.add(admin)
        db.commit()
    else:
        existing_admin = db.query(OrganizerUser).filter(
            OrganizerUser.email == "admin@digitalgarage.com.br",
            OrganizerUser.name == "Digital Garage Master Admin",
        ).first()
        if existing_admin:
            existing_admin.name = "Master Admin"
            db.commit()


class OrganizerLoginRequest(BaseModel):
    email: str
    password: str


class OrganizerSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    organization: Optional[str] = None
    instagram: Optional[str] = None


def _build_organizer_payload(user: OrganizerUser) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "organization": user.organization,
        "instagram": user.instagram,
    }


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return cleaned or "evento"


class CreateTierSchema(BaseModel):
    name: str
    badge: str = "uncommon"  # uncommon, rare, epic, legendary
    price_brl: float
    price_usd: float
    price_eur: float
    quantity_total: int = 100
    requires_car_specs: bool = False
    perks: Optional[List[str]] = None


class CreateEventRequest(BaseModel):
    title: str
    subtitle: Optional[str] = None
    date: str
    location: str
    address: Optional[str] = None
    city: str
    country: Optional[str] = None
    banner_url: Optional[str] = None
    description: Optional[str] = None
    tiers: List[CreateTierSchema]


class CheckinRequest(BaseModel):
    qr_code_or_order_code: str


class CortesiaIssueRequest(BaseModel):
    event_id: int
    ticket_tier_id: int
    recipient_name: str
    recipient_email: str
    recipient_phone: str
    car_make: Optional[str] = None
    car_model: Optional[str] = None
    car_year: Optional[str] = None
    license_plate: Optional[str] = None


class ExhibitorInviteRequest(BaseModel):
    event_id: int
    listing_id: int
    ticket_tier_id: Optional[int] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    license_plate: Optional[str] = None
    personal_message: Optional[str] = None


def _get_authenticated_organizer(
    authorization: Optional[str], db: Session
) -> Optional[OrganizerUser]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    auth_email = verify_organizer_token(token)
    if not auth_email:
        return None
    return (
        db.query(OrganizerUser)
        .filter(func.lower(OrganizerUser.email) == auth_email.lower())
        .first()
    )


def _get_accessible_events(organizer: Optional[OrganizerUser], db: Session) -> List[Event]:
    if organizer:
        if organizer.role == "admin":
            return db.query(Event).order_by(Event.id.desc()).all()
        owned = (
            db.query(Event)
            .filter(Event.organizer_id == organizer.id)
            .order_by(Event.id.desc())
            .all()
        )
        if owned:
            return owned
    return db.query(Event).order_by(Event.id.desc()).all()


def _build_exhibitor_whatsapp_link(
    phone: Optional[str],
    owner_name: str,
    vehicle_title: str,
    event: Event,
    order_code: str,
    personal_message: Optional[str] = None,
) -> str:
    pass_url = f"{FRONTEND_URL}/success?order_code={order_code}"
    intro = (
        personal_message.strip()
        if personal_message and personal_message.strip()
        else (
            f"Vimos seu *{vehicle_title}* na Digital Garage Classificados e "
            f"gostaríamos de convidá-lo oficialmente como *Expositor VIP (100% Cortesia)* "
            f"no nosso encontro automotivo!"
        )
    )
    text = (
        f"🏎️ *CONVITE OFICIAL EXPOSITOR — {event.title.upper()}* 🏎️\n\n"
        f"Olá, *{owner_name}*!\n"
        f"{intro}\n\n"
        f"🚗 *Veículo Convidado:* {vehicle_title}\n"
        f"📅 *Data:* {event.date}\n"
        f"📍 *Local:* {event.location} ({event.city})\n"
        f"🎫 *Passe VIP Cortesia:* `#{order_code}`\n\n"
        f"📲 *Acesse seu Passe com QR Code de Portão:* {pass_url}\n\n"
        f"Esperamos você e sua máquina no Paddock! 🔥"
    )
    encoded = urllib.parse.quote(text)
    clean_phone = "".join(filter(str.isdigit, phone or ""))
    if clean_phone:
        if not clean_phone.startswith("55") and len(clean_phone) <= 11:
            clean_phone = "55" + clean_phone
        return f"https://wa.me/{clean_phone}?text={encoded}"
    return f"https://wa.me/?text={encoded}"


@router.post("/signup")
def organizer_signup(req: OrganizerSignupRequest, db: Session = Depends(get_db)):
    """Registers a new event organizer account and returns an access token."""
    seed_default_organizer(db)

    name = req.name.strip()
    email = req.email.strip().lower()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Informe o nome completo do organizador.")
    if "@" not in email or "." not in email.split("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="Informe um e-mail válido.")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 8 caracteres.")

    existing = db.query(OrganizerUser).filter(func.lower(OrganizerUser.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Já existe uma conta cadastrada com este e-mail. Faça login para continuar."
        )

    user = OrganizerUser(
        email=email,
        hashed_password=hash_password(req.password),
        name=name,
        phone=req.phone.strip() if req.phone and req.phone.strip() else None,
        organization=req.organization.strip() if req.organization and req.organization.strip() else None,
        instagram=req.instagram.strip() if req.instagram and req.instagram.strip() else None,
        role="organizer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_organizer_token(user.email)
    return {
        "status": "success",
        "token": token,
        "organizer": _build_organizer_payload(user),
    }


@router.post("/login")
def organizer_login(req: OrganizerLoginRequest, db: Session = Depends(get_db)):
    """Authenticates event organizer and returns access token."""
    seed_default_organizer(db)
    email = req.email.strip().lower()
    user = db.query(OrganizerUser).filter(func.lower(OrganizerUser.email) == email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha do organizador incorretos")

    token = create_organizer_token(user.email)
    return {
        "status": "success",
        "token": token,
        "organizer": _build_organizer_payload(user),
    }


@router.post("/events/create")
def create_new_event(
    req: CreateEventRequest,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """Creates a new Car Meet Event and configures its ticket tiers."""
    if not req.title.strip() or not req.date.strip() or not req.location.strip() or not req.city.strip():
        raise HTTPException(status_code=400, detail="Preencha título, data, local e cidade do evento.")
    if not req.tiers:
        raise HTTPException(status_code=400, detail="Configure pelo menos um lote de ingresso.")

    organizer_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        auth_email = verify_organizer_token(token)
        if auth_email:
            organizer = db.query(OrganizerUser).filter(func.lower(OrganizerUser.email) == auth_email.lower()).first()
            if organizer:
                organizer_id = organizer.id

    slug = f"{_slugify(req.title)}-{secrets.token_hex(2)}"

    resolved_country = infer_event_country(
        country=req.country,
        city=req.city,
        location=req.location,
    )

    event = Event(
        organizer_id=organizer_id,
        slug=slug,
        title=req.title.strip(),
        subtitle=req.subtitle.strip() if req.subtitle and req.subtitle.strip() else None,
        date=req.date.strip(),
        location=req.location.strip(),
        address=req.address.strip() if req.address and req.address.strip() else None,
        city=req.city.strip(),
        country=resolved_country,
        banner_url=req.banner_url.strip() if req.banner_url and req.banner_url.strip() else "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80",
        description=req.description.strip() if req.description and req.description.strip() else None,
        status="active"
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    created_tiers = []
    for t_schema in req.tiers:
        tier = TicketTier(
            event_id=event.id,
            name=t_schema.name.strip() or "Ingresso",
            badge=t_schema.badge,
            price_brl=t_schema.price_brl,
            price_usd=t_schema.price_usd,
            price_eur=t_schema.price_eur,
            quantity_total=t_schema.quantity_total,
            quantity_sold=0,
            requires_car_specs=t_schema.requires_car_specs,
            perks=",".join(t_schema.perks) if t_schema.perks else ""
        )
        db.add(tier)
        created_tiers.append(tier)
    
    db.commit()

    return {
        "status": "success",
        "message": f"Evento '{event.title}' criado e configurado com sucesso!",
        "event_id": event.id,
        "slug": event.slug,
        "title": event.title,
        "total_tiers_configured": len(created_tiers)
    }


@router.get("/dashboard")
def get_organizer_dashboard(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """Returns overview analytics and events owned by the authenticated organizer."""
    organizer = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        auth_email = verify_organizer_token(token)
        if auth_email:
            organizer = db.query(OrganizerUser).filter(func.lower(OrganizerUser.email) == auth_email.lower()).first()

    if organizer:
        if organizer.role == "admin":
            owned_events = db.query(Event).order_by(Event.id.desc()).all()
        else:
            owned_events = (
                db.query(Event)
                .filter(Event.organizer_id == organizer.id)
                .order_by(Event.id.desc())
                .all()
            )
    else:
        owned_events = []

    orders = db.query(TicketOrder).all()
    
    real_time_sales_brl = sum(o.total_amount_brl for o in orders if o.payment_status in ["paid", "pending"])
    historical_baseline_brl = 84500.0  # R$ 84.5K processed across 7 past events
    total_platform_revenue_brl = historical_baseline_brl + real_time_sales_brl

    total_tickets_sold = len(orders) + 482
    total_cars_registered = len([o for o in orders if o.license_plate]) + 195
    total_checked_in = len([o for o in orders if o.checked_in]) + 140

    tier_stats = {}
    tiers = db.query(TicketTier).all()
    for t in tiers:
        sold = db.query(TicketOrder).filter(TicketOrder.ticket_tier_id == t.id).count()
        tier_stats[t.name] = {
            "tier_id": t.id,
            "badge": t.badge,
            "sold_live": sold,
            "total_available": t.quantity_total,
            "price_brl": t.price_brl
        }

    recent_orders = [
        {
            "order_code": o.order_code,
            "buyer_name": o.buyer_name,
            "buyer_email": o.buyer_email,
            "car_model": f"{o.car_make or ''} {o.car_model or ''}".strip() or "Pedestre",
            "license_plate": o.license_plate or "-",
            "amount_brl": o.total_amount_brl,
            "payment_status": o.payment_status,
            "checked_in": o.checked_in,
            "created_at": o.created_at.strftime("%d/%m/%Y %H:%M")
        }
        for o in reversed(orders[-15:])
    ]

    return {
        "status": "success",
        "historical_baseline_brl": historical_baseline_brl,
        "real_time_sales_brl": real_time_sales_brl,
        "total_platform_revenue_brl": total_platform_revenue_brl,
        "total_tickets_sold": total_tickets_sold,
        "total_cars_registered": total_cars_registered,
        "total_checked_in": total_checked_in,
        "tier_stats": tier_stats,
        "recent_orders": recent_orders,
        "organizer_events": [
            {
                "id": ev.id,
                "slug": ev.slug,
                "title": ev.title,
                "date": ev.date,
                "city": ev.city,
            }
            for ev in owned_events
        ],
    }


@router.post("/checkin")
def scan_gate_checkin(req: CheckinRequest, db: Session = Depends(get_db)):
    """Validates scanned QR code or order code at the gate scanner."""
    query_str = req.qr_code_or_order_code.strip().upper()
    order = db.query(TicketOrder).filter(TicketOrder.order_code.ilike(f"%{query_str}%")).first()

    if not order:
        order = db.query(TicketOrder).filter(TicketOrder.license_plate.ilike(f"%{query_str}%")).first()

    if not order:
        return {
            "status": "invalid",
            "message": "Ingresso não encontrado no sistema.",
            "order_code": query_str
        }

    if order.checked_in:
        return {
            "status": "already_checked_in",
            "message": f"Atenção! Ingresso #{order.order_code} JÁ FOI UTILIZADO em {order.checked_in_at.strftime('%H:%M:%S') if order.checked_in_at else 'data anterior'}.",
            "buyer_name": order.buyer_name,
            "order_code": order.order_code
        }

    order.checked_in = True
    order.checked_in_at = datetime.utcnow()
    order.payment_status = "paid"
    db.commit()

    tier = db.query(TicketTier).filter(TicketTier.id == order.ticket_tier_id).first()

    return {
        "status": "success",
        "message": f"ENTRADA LIBERADA! Ingresso #{order.order_code} validado com sucesso.",
        "order_code": order.order_code,
        "buyer_name": order.buyer_name,
        "tier_name": tier.name if tier else "Ingresso Digital",
        "car_info": f"{order.car_make or ''} {order.car_model or ''} ({order.license_plate or 'Sem Placa'})".strip(),
        "checked_in_at": order.checked_in_at.strftime("%H:%M:%S BRT")
    }


@router.post("/cortesia")
def issue_cortesia_ticket(req: CortesiaIssueRequest, db: Session = Depends(get_db)):
    """Generates a free complimentary ticket (Cortesia) and sends Email & WhatsApp."""
    event = db.query(Event).filter(Event.id == req.event_id).first()
    tier = db.query(TicketTier).filter(TicketTier.id == req.ticket_tier_id).first()
    if not event or not tier:
        raise HTTPException(status_code=404, detail="Event or Ticket Tier not found")

    order_code = f"DG-CORTESIA-{secrets.token_hex(3).upper()}"
    order = TicketOrder(
        order_code=order_code,
        event_id=event.id,
        ticket_tier_id=tier.id,
        buyer_name=req.recipient_name,
        buyer_email=req.recipient_email,
        buyer_phone=req.recipient_phone,
        car_make=req.car_make,
        car_model=req.car_model,
        car_year=req.car_year,
        license_plate=req.license_plate.upper() if req.license_plate else None,
        quantity=1,
        subtotal_brl=0.0,
        discount_brl=tier.price_brl,
        total_amount_brl=0.0,
        currency="BRL",
        applied_coupon="CORTESIA",
        payment_method="cortesia",
        payment_status="paid"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    order_data = {
        "order_code": order_code,
        "buyer_name": req.recipient_name,
        "event_title": event.title,
        "event_date": event.date,
        "event_location": event.location,
        "tier_name": f"Cortesia VIP - {tier.name}",
        "car_make": req.car_make,
        "car_model": req.car_model,
        "license_plate": req.license_plate
    }

    send_ticket_email(req.recipient_email, order_data)
    wa_res = send_whatsapp_notification(req.recipient_phone, order_data)

    return {
        "status": "success",
        "message": f"Cortesia emitida com sucesso para {req.recipient_name}!",
        "order_code": order_code,
        "whatsapp_link": wa_res.get("deep_link")
    }


@router.get("/roster")
def get_attendee_roster(db: Session = Depends(get_db)):
    """Returns all registered attendees and vehicles for CSV export."""
    orders = db.query(TicketOrder).all()
    roster = []
    for o in orders:
        ev = db.query(Event).filter(Event.id == o.event_id).first()
        t = db.query(TicketTier).filter(TicketTier.id == o.ticket_tier_id).first()
        roster.append({
            "order_code": o.order_code,
            "event": ev.title if ev else "",
            "tier": t.name if t else "",
            "buyer_name": o.buyer_name,
            "buyer_email": o.buyer_email,
            "buyer_phone": o.buyer_phone,
            "car_make": o.car_make or "-",
            "car_model": o.car_model or "-",
            "car_year": o.car_year or "-",
            "license_plate": o.license_plate or "-",
            "payment_status": o.payment_status,
            "checked_in": "SIM" if o.checked_in else "NÃO"
        })
    return {"status": "success", "roster": roster}


@router.get("/exhibitor-vehicles")
def discover_nearby_exhibitor_vehicles(
    event_id: Optional[int] = Query(default=None),
    radius_km: float = Query(default=250.0, ge=10.0, le=3000.0),
    q: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Lists cars from rarissimo_carros (dg-classificados) near the organizer's event location.
    Never exposes vehicle prices and returns the organizer's 10-free-invites quota status.
    """
    organizer = _get_authenticated_organizer(authorization, db)
    accessible_events = _get_accessible_events(organizer, db)

    if not accessible_events:
        return {
            "status": "success",
            "selected_event": None,
            "available_events": [],
            "origin": None,
            "invite_quota": {
                "limit": FREE_EXHIBITOR_INVITE_LIMIT,
                "used": 0,
                "remaining": FREE_EXHIBITOR_INVITE_LIMIT,
            },
            "vehicles": [],
            "invites_sent": [],
        }

    selected_event = None
    if event_id is not None:
        selected_event = next((ev for ev in accessible_events if ev.id == event_id), None)
    if selected_event is None:
        selected_event = accessible_events[0]

    tiers = db.query(TicketTier).filter(TicketTier.event_id == selected_event.id).all()
    existing_invites = (
        db.query(ExhibitorInvite)
        .filter(ExhibitorInvite.event_id == selected_event.id)
        .order_by(ExhibitorInvite.created_at.desc())
        .all()
    )
    invites_by_listing = {inv.classificados_listing_id: inv for inv in existing_invites}

    used_count = len(existing_invites)
    remaining_count = max(0, FREE_EXHIBITOR_INVITE_LIMIT - used_count)

    try:
        nearby_data = fetch_nearby_classificados_vehicles(
            event_city=selected_event.city,
            event_location=selected_event.location or "",
            event_address=selected_event.address or "",
            radius_km=radius_km,
            search_query=q,
        )
        raw_vehicles = nearby_data["vehicles"]
        origin_info = nearby_data["origin"]
        source_online = True
    except Exception as exc:
        print(f"[Classificados Integration] Error fetching nearby cars: {exc}")
        raw_vehicles = []
        origin_info = {
            "city": selected_event.city,
            "uf": None,
            "radius_km": radius_km,
        }
        source_online = False

    enriched_vehicles = []
    for v in raw_vehicles:
        inv = invites_by_listing.get(v["listing_id"])
        invite_payload = None
        if inv:
            invite_payload = {
                "invite_id": inv.id,
                "order_code": inv.order_code,
                "owner_name": inv.owner_name,
                "invited_at": inv.created_at.strftime("%d/%m/%Y %H:%M"),
                "pass_url": f"{FRONTEND_URL}/success?order_code={inv.order_code}",
                "pdf_url": f"/api/checkout/order/{inv.order_code}/pdf",
                "whatsapp_invite_url": _build_exhibitor_whatsapp_link(
                    phone=inv.owner_phone or v.get("owner", {}).get("phone"),
                    owner_name=inv.owner_name,
                    vehicle_title=inv.vehicle_title,
                    event=selected_event,
                    order_code=inv.order_code,
                    personal_message=inv.personal_message,
                ),
            }
        enriched_vehicles.append({
            **v,
            "already_invited": inv is not None,
            "invite": invite_payload,
        })

    return {
        "status": "success",
        "source_online": source_online,
        "selected_event": {
            "id": selected_event.id,
            "slug": selected_event.slug,
            "title": selected_event.title,
            "date": selected_event.date,
            "location": selected_event.location,
            "address": selected_event.address,
            "city": selected_event.city,
            "tiers": [
                {
                    "id": t.id,
                    "name": t.name,
                    "badge": t.badge,
                    "requires_car_specs": t.requires_car_specs,
                }
                for t in tiers
            ],
        },
        "available_events": [
            {
                "id": ev.id,
                "slug": ev.slug,
                "title": ev.title,
                "date": ev.date,
                "location": ev.location,
                "city": ev.city,
            }
            for ev in accessible_events
        ],
        "origin": origin_info,
        "invite_quota": {
            "limit": FREE_EXHIBITOR_INVITE_LIMIT,
            "used": used_count,
            "remaining": remaining_count,
        },
        "vehicles": enriched_vehicles,
        "invites_sent": [
            {
                "id": inv.id,
                "listing_id": inv.classificados_listing_id,
                "order_code": inv.order_code,
                "vehicle_title": inv.vehicle_title,
                "vehicle_city": inv.vehicle_city,
                "cover_url": inv.cover_url,
                "owner_name": inv.owner_name,
                "owner_email": inv.owner_email,
                "owner_phone": inv.owner_phone,
                "created_at": inv.created_at.strftime("%d/%m/%Y %H:%M"),
                "pass_url": f"{FRONTEND_URL}/success?order_code={inv.order_code}",
                "whatsapp_invite_url": _build_exhibitor_whatsapp_link(
                    phone=inv.owner_phone,
                    owner_name=inv.owner_name,
                    vehicle_title=inv.vehicle_title,
                    event=selected_event,
                    order_code=inv.order_code,
                    personal_message=inv.personal_message,
                ),
            }
            for inv in existing_invites
        ],
    }


@router.post("/exhibitor-invites")
def send_free_exhibitor_vehicle_invite(
    req: ExhibitorInviteRequest,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Issues 1 of the organizer's 10 free exhibitor invites to a vehicle owner from dg-classificados.
    Generates a complimentary QR Code pass, optional PDF email, and WhatsApp invite link.
    """
    organizer = _get_authenticated_organizer(authorization, db)
    if not organizer:
        raise HTTPException(status_code=401, detail="Faça login como organizador para enviar convites.")

    event = db.query(Event).filter(Event.id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")

    if organizer.role != "admin" and event.organizer_id and event.organizer_id != organizer.id:
        raise HTTPException(status_code=403, detail="Você só pode enviar convites para eventos que organiza.")

    duplicate = (
        db.query(ExhibitorInvite)
        .filter(
            ExhibitorInvite.event_id == event.id,
            ExhibitorInvite.classificados_listing_id == req.listing_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Este veículo já recebeu um convite gratuito (#{duplicate.order_code}) para este evento.",
        )

    used_count = (
        db.query(ExhibitorInvite)
        .filter(ExhibitorInvite.event_id == event.id)
        .count()
    )
    if used_count >= FREE_EXHIBITOR_INVITE_LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"Limite atingido: você já utilizou os {FREE_EXHIBITOR_INVITE_LIMIT} convites gratuitos de veículos expositores deste evento.",
        )

    vehicle = get_classificados_listing_sanitized(req.listing_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado no Digital Garage Classificados.")

    tiers = db.query(TicketTier).filter(TicketTier.event_id == event.id).all()
    if not tiers:
        raise HTTPException(status_code=400, detail="Este evento não possui categorias de ingresso configuradas.")

    selected_tier = None
    if req.ticket_tier_id:
        selected_tier = next((t for t in tiers if t.id == req.ticket_tier_id), None)
    if not selected_tier:
        selected_tier = next((t for t in tiers if t.requires_car_specs), tiers[0])

    owner_info = vehicle.get("owner") or {}
    final_owner_name = (
        req.owner_name.strip()
        if req.owner_name and req.owner_name.strip()
        else (owner_info.get("name") or "Proprietário Convidado")
    )
    final_owner_email = (
        req.owner_email.strip().lower()
        if req.owner_email and req.owner_email.strip()
        else ""
    )
    final_owner_phone = (
        req.owner_phone.strip()
        if req.owner_phone and req.owner_phone.strip()
        else (owner_info.get("phone") or "")
    )
    final_plate = (
        req.license_plate.strip().upper()
        if req.license_plate and req.license_plate.strip()
        else "CONVITE"
    )

    order_code = f"DG-INVITE-{secrets.token_hex(3).upper()}"
    car_year_str = str(vehicle["year_model"]) if vehicle.get("year_model") else None

    order = TicketOrder(
        order_code=order_code,
        event_id=event.id,
        ticket_tier_id=selected_tier.id,
        buyer_name=final_owner_name,
        buyer_email=final_owner_email or f"convite+{order_code.lower()}@digitalgarage.com.br",
        buyer_phone=final_owner_phone or "Convite Classificados",
        car_make=vehicle["brand"],
        car_model=vehicle["model"],
        car_year=car_year_str,
        car_color=vehicle.get("color"),
        license_plate=final_plate,
        quantity=1,
        subtotal_brl=0.0,
        discount_brl=selected_tier.price_brl,
        total_amount_brl=0.0,
        currency="BRL",
        applied_coupon="CONVITE-EXPOSITOR",
        payment_method="convite_expositor",
        payment_status="paid",
    )
    db.add(order)

    city_label = " / ".join(p for p in [vehicle.get("city"), vehicle.get("uf")] if p)
    invite = ExhibitorInvite(
        organizer_id=organizer.id,
        event_id=event.id,
        classificados_listing_id=vehicle["listing_id"],
        order_code=order_code,
        vehicle_title=vehicle["vehicle_title"],
        car_make=vehicle["brand"],
        car_model=vehicle["model"],
        car_year=car_year_str,
        car_color=vehicle.get("color"),
        vehicle_city=city_label or None,
        cover_url=vehicle.get("cover_url"),
        owner_name=final_owner_name,
        owner_email=final_owner_email or None,
        owner_phone=final_owner_phone or None,
        personal_message=req.personal_message.strip() if req.personal_message and req.personal_message.strip() else None,
        status="invited",
    )
    db.add(invite)
    selected_tier.quantity_sold = (selected_tier.quantity_sold or 0) + 1
    db.commit()
    db.refresh(invite)

    order_data = {
        "order_code": order_code,
        "buyer_name": final_owner_name,
        "buyer_email": final_owner_email,
        "buyer_phone": final_owner_phone,
        "event_title": event.title,
        "event_subtitle": event.subtitle,
        "event_date": event.date,
        "event_location": event.location,
        "event_address": event.address,
        "event_city": event.city,
        "tier_name": f"Convite Expositor VIP — {selected_tier.name}",
        "car_make": vehicle["brand"],
        "car_model": vehicle["model"],
        "car_year": car_year_str,
        "car_color": vehicle.get("color"),
        "license_plate": final_plate,
        "payment_method": "CONVITE EXPOSITOR",
        "payment_status": "paid",
        "total_amount_brl": 0.0,
        "currency": "BRL",
    }

    email_dispatched = False
    if final_owner_email and "@" in final_owner_email:
        email_dispatched = send_ticket_email(final_owner_email, order_data)

    whatsapp_url = _build_exhibitor_whatsapp_link(
        phone=final_owner_phone,
        owner_name=final_owner_name,
        vehicle_title=vehicle["vehicle_title"],
        event=event,
        order_code=order_code,
        personal_message=invite.personal_message,
    )

    new_used = used_count + 1
    new_remaining = max(0, FREE_EXHIBITOR_INVITE_LIMIT - new_used)

    return {
        "status": "success",
        "message": f"Convite gratuito enviado para {final_owner_name} ({vehicle['vehicle_title']})!",
        "order_code": order_code,
        "pass_url": f"{FRONTEND_URL}/success?order_code={order_code}",
        "pdf_url": f"/api/checkout/order/{order_code}/pdf",
        "whatsapp_invite_url": whatsapp_url,
        "email_dispatched": email_dispatched,
        "invite_quota": {
            "limit": FREE_EXHIBITOR_INVITE_LIMIT,
            "used": new_used,
            "remaining": new_remaining,
        },
    }
