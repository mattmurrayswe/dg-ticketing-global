from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Event, TicketTier
from app.services.infinitepay_service import (
    default_currency_for_event,
    infer_event_country,
    is_brazilian_event,
)

router = APIRouter(prefix="/api/events", tags=["Events"])


DEFAULT_SEED_EVENTS = [
    {
        "slug": "41-drift-noite-do-terror",
        "title": "41Drift - Noite do Terror 2026",
        "subtitle": "Car Meet & Night Drift Showcase",
        "date": "2026-10-24 18:00 BRT",
        "location": "Pistas 41Drift - Curitiba / PR",
        "address": "Rod. BR-277, Km 68, Curitiba - PR",
        "city": "Curitiba, PR",
        "country": "BR",
        "banner_url": "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80",
        "description": "O maior encontro noturno de carros esportivos, modificados e drift do sul do Brasil. Exposição exclusiva no paddock e batalhas de drift na pista.",
        "tiers": [
            {
                "name": "Ingresso Expositor Paddock",
                "badge": "legendary",
                "price_brl": 120.0,
                "price_usd": 24.0,
                "price_eur": 22.0,
                "quantity_total": 150,
                "quantity_sold": 34,
                "requires_car_specs": True,
                "perks": "Vaga de Exposição Paddock,Acesso VIP Pista,Adesivo Oficial Digital Garage,Foto Profissional",
            },
            {
                "name": "Ingresso Pedestre / Espectador",
                "badge": "uncommon",
                "price_brl": 45.0,
                "price_usd": 9.0,
                "price_eur": 8.0,
                "quantity_total": 500,
                "quantity_sold": 182,
                "requires_car_specs": False,
                "perks": "Acesso ao Evento e Arquibancada,Área de Food Trucks,Acesso às Lojas de Parceiros",
            },
        ],
    },
    {
        "slug": "jdm-experience-street-edition",
        "title": "JDM Experience - Street Edition",
        "subtitle": "Japanese Domestic Market Annual Meet",
        "date": "2026-11-15 10:00 BRT",
        "location": "Speedway Music Park - Balneário Camboriú / SC",
        "address": "R. José Francisco Corrêa, Balneário Camboriú - SC",
        "city": "Balneário Camboriú, SC",
        "country": "BR",
        "banner_url": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
        "description": "Encontro dedicado exclusivamente à cultura automotiva japonesa. Lendas dos anos 90 e 2000 em exibição com avaliação técnica.",
        "tiers": [
            {
                "name": "Expositor JDM VIP",
                "badge": "epic",
                "price_brl": 150.0,
                "price_usd": 30.0,
                "price_eur": 28.0,
                "quantity_total": 100,
                "quantity_sold": 45,
                "requires_car_specs": True,
                "perks": "Vaga Reservada Paddock Principal,Troféu Melhores do Ano,Kit Exclusivo JDM,Troféu Votação do Público",
            },
            {
                "name": "Pedestre Geral",
                "badge": "uncommon",
                "price_brl": 50.0,
                "price_usd": 10.0,
                "price_eur": 9.0,
                "quantity_total": 600,
                "quantity_sold": 210,
                "requires_car_specs": False,
                "perks": "Acesso livre a todas as áreas públicas,Sorteios de Brindes JDM",
            },
        ],
    },
    {
        "slug": "capital-race",
        "title": "Capital Race",
        "subtitle": "Curitiba Car Meet & Track Experience",
        "date": "2026-12-06 09:00 BRT",
        "location": "Autódromo Internacional de Curitiba - Pinhais / PR",
        "address": "Av. Iraí, 16 - Weissópolis, Pinhais - PR",
        "city": "Curitiba, Brazil",
        "country": "BR",
        "banner_url": "/capital-race-logo.webp",
        "description": "Track day e exposição de superesportivos e preparados em Curitiba com credenciamento oficial Digital Garage.",
        "tiers": [
            {
                "name": "Expositor Paddock & Box",
                "badge": "legendary",
                "price_brl": 180.0,
                "price_usd": 36.0,
                "price_eur": 33.0,
                "quantity_total": 120,
                "quantity_sold": 48,
                "requires_car_specs": True,
                "perks": "Acesso Box & Paddock,Credencial Veicular Oficial,Check-in QR Code",
            },
            {
                "name": "Ingresso Espectador",
                "badge": "uncommon",
                "price_brl": 60.0,
                "price_usd": 12.0,
                "price_eur": 11.0,
                "quantity_total": 500,
                "quantity_sold": 165,
                "requires_car_specs": False,
                "perks": "Arquibancada & Visitação Box,Check-in QR Code",
            },
        ],
    },
    {
        "slug": "idolz",
        "title": "IDOLZ Official Car Meet",
        "subtitle": "Budapest Automotive Showcase",
        "date": "2027-05-16 11:00 CEST",
        "location": "Hungexpo Paddock Arena - Budapest",
        "address": "Albertirsai út 10, 1101 Budapest, Hungary",
        "city": "Budapest, Hungary",
        "country": "HU",
        "banner_url": "/idolz-logo.svg",
        "description": "Premier European stance, motorsport, and bespoke build showcase in the heart of Budapest.",
        "tiers": [
            {
                "name": "Show & Shine Exhibitor Pass",
                "badge": "legendary",
                "price_brl": 360.0,
                "price_usd": 72.0,
                "price_eur": 65.0,
                "quantity_total": 180,
                "quantity_sold": 62,
                "requires_car_specs": True,
                "perks": "Indoor Show Hall Slot,Driver Welcome Kit,Digital Garage QR Gate Pass",
            },
            {
                "name": "Spectator Day Pass",
                "badge": "uncommon",
                "price_brl": 140.0,
                "price_usd": 28.0,
                "price_eur": 25.0,
                "quantity_total": 800,
                "quantity_sold": 290,
                "requires_car_specs": False,
                "perks": "Full Arena & Paddock Access,Digital Garage QR Gate Pass",
            },
        ],
    },
    {
        "slug": "fuoriconcorso",
        "title": "FuoriConcorso",
        "subtitle": "Lake Como Automotive Gathering",
        "date": "2027-05-23 10:00 CEST",
        "location": "Villa del Grumello & Villa Sucota - Lake Como",
        "address": "Via per Cernobbio 11, 22100 Como CO, Italy",
        "city": "Lake Como, Italy",
        "country": "IT",
        "banner_url": "/logo-fuoriconcorso.svg",
        "description": "Curated concourse and automotive culture gathering overlooking Lake Como.",
        "tiers": [
            {
                "name": "Collector Vehicle Concours Entry",
                "badge": "legendary",
                "price_brl": 1350.0,
                "price_usd": 270.0,
                "price_eur": 250.0,
                "quantity_total": 80,
                "quantity_sold": 31,
                "requires_car_specs": True,
                "perks": "Villa Lawn Display Placement,Hospitality Terrace Access,Official Concours Pass",
            },
            {
                "name": "Villa Gardens Visitor Pass",
                "badge": "rare",
                "price_brl": 490.0,
                "price_usd": 98.0,
                "price_eur": 90.0,
                "quantity_total": 400,
                "quantity_sold": 144,
                "requires_car_specs": False,
                "perks": "Villa Gardens Exhibition Access,Digital Garage Official Pass",
            },
        ],
    },
    {
        "slug": "players-shows",
        "title": "Players Shows",
        "subtitle": "Goodwood Car Culture Showcase",
        "date": "2027-06-13 09:30 BST",
        "location": "Goodwood Motor Circuit - Chichester, UK",
        "address": "Goodwood, Chichester PO18 0PH, United Kingdom",
        "city": "Goodwood, United Kingdom",
        "country": "GB",
        "banner_url": "/players-logo.webp",
        "description": "Iconic UK custom car culture and circuit paddock showcase at Goodwood.",
        "tiers": [
            {
                "name": "Paddock Show Car Entry",
                "badge": "epic",
                "price_brl": 290.0,
                "price_usd": 58.0,
                "price_eur": 52.0,
                "quantity_total": 220,
                "quantity_sold": 89,
                "requires_car_specs": True,
                "perks": "Circuit Paddock Show Bay,Driver Admission Included,QR Fast-Track Entry",
            },
            {
                "name": "General Spectator Admission",
                "badge": "uncommon",
                "price_brl": 135.0,
                "price_usd": 27.0,
                "price_eur": 24.0,
                "quantity_total": 900,
                "quantity_sold": 340,
                "requires_car_specs": False,
                "perks": "All-Day Paddock & Grid Walk Access,QR Fast-Track Entry",
            },
        ],
    },
]


def _serialize_event(ev: Event, tiers: list[TicketTier]) -> dict:
    country = infer_event_country(country=ev.country, city=ev.city, location=ev.location)
    is_br = is_brazilian_event(country=country, city=ev.city, location=ev.location)
    return {
        "id": ev.id,
        "slug": ev.slug,
        "title": ev.title,
        "subtitle": ev.subtitle,
        "date": ev.date,
        "location": ev.location,
        "address": ev.address,
        "city": ev.city,
        "country": country,
        "is_brazilian": is_br,
        "payment_gateway": "infinitepay" if is_br else "stripe",
        "default_currency": default_currency_for_event(country=country, city=ev.city, location=ev.location),
        "banner_url": ev.banner_url,
        "description": ev.description,
        "status": ev.status,
        "tiers": [
            {
                "id": t.id,
                "name": t.name,
                "badge": t.badge,
                "price_brl": t.price_brl,
                "price_usd": t.price_usd,
                "price_eur": t.price_eur,
                "quantity_total": t.quantity_total,
                "quantity_sold": t.quantity_sold,
                "requires_car_specs": t.requires_car_specs,
                "perks": [p.strip() for p in t.perks.split(",") if p.strip()] if t.perks else [],
            }
            for t in tiers
        ],
    }


def seed_default_events(db: Session):
    """Idempotently seeds Brazilian & International Digital Garage car meets."""
    existing_by_slug = {e.slug: e for e in db.query(Event).all()}
    changed = False

    for item in DEFAULT_SEED_EVENTS:
        existing = existing_by_slug.get(item["slug"])
        if existing:
            if not existing.country:
                existing.country = item["country"]
                changed = True
            continue

        ev = Event(
            slug=item["slug"],
            title=item["title"],
            subtitle=item["subtitle"],
            date=item["date"],
            location=item["location"],
            address=item["address"],
            city=item["city"],
            country=item["country"],
            banner_url=item["banner_url"],
            description=item["description"],
            status="active",
        )
        db.add(ev)
        db.flush()

        for tier_data in item["tiers"]:
            db.add(
                TicketTier(
                    event_id=ev.id,
                    name=tier_data["name"],
                    badge=tier_data["badge"],
                    price_brl=tier_data["price_brl"],
                    price_usd=tier_data["price_usd"],
                    price_eur=tier_data["price_eur"],
                    quantity_total=tier_data["quantity_total"],
                    quantity_sold=tier_data["quantity_sold"],
                    requires_car_specs=tier_data["requires_car_specs"],
                    perks=tier_data["perks"],
                )
            )
        changed = True

    if changed:
        db.commit()


@router.get("")
def list_events(db: Session = Depends(get_db)):
    """Returns list of active car meet events with regional gateway metadata."""
    seed_default_events(db)
    events = db.query(Event).all()
    result = []
    for ev in events:
        tiers = db.query(TicketTier).filter(TicketTier.event_id == ev.id).all()
        result.append(_serialize_event(ev, tiers))
    return {"status": "success", "events": result}


@router.get("/{slug}")
def get_event_detail(slug: str, db: Session = Depends(get_db)):
    """Returns single event details by slug."""
    seed_default_events(db)
    ev = db.query(Event).filter(Event.slug == slug).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    tiers = db.query(TicketTier).filter(TicketTier.event_id == ev.id).all()
    return _serialize_event(ev, tiers)
