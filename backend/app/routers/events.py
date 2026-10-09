from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Event, TicketTier

router = APIRouter(prefix="/api/events", tags=["Events"])


def seed_default_events(db: Session):
    """Seeds default Digital Garage car meets if database is empty."""
    if db.query(Event).count() == 0:
        event1 = Event(
            slug="41-drift-noite-do-terror",
            title="41Drift - Noite do Terror 2026",
            subtitle="Car Meet & Night Drift Showcase",
            date="2026-10-24 18:00 BRT",
            location="Pistas 41Drift - Curitiba / PR",
            address="Rod. BR-277, Km 68, Curitiba - PR",
            city="Curitiba",
            banner_url="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80",
            description="O maior encontro noturno de carros esportivos, modificados e drift do sul do Brasil. Exposição exclusiva no paddock e batalhas de drift na pista.",
            status="active"
        )
        db.add(event1)
        db.commit()
        db.refresh(event1)

        tiers1 = [
            TicketTier(
                event_id=event1.id,
                name="Ingresso Expositor Paddock",
                badge="legendary",
                price_brl=120.0,
                price_usd=24.0,
                price_eur=22.0,
                quantity_total=150,
                quantity_sold=34,
                requires_car_specs=True,
                perks="Vaga de Exposição Paddock,Acesso VIP Pista,Adesivo Oficial Digital Garage,Foto Profissional"
            ),
            TicketTier(
                event_id=event1.id,
                name="Ingresso Pedestre / Espectador",
                badge="uncommon",
                price_brl=45.0,
                price_usd=9.0,
                price_eur=8.0,
                quantity_total=500,
                quantity_sold=182,
                requires_car_specs=False,
                perks="Acesso ao Evento e Arquibancada,Área de Food Trucks,Acesso às Lojas de Parceiros"
            )
        ]
        db.add_all(tiers1)

        event2 = Event(
            slug="jdm-experience-street-edition",
            title="JDM Experience - Street Edition",
            subtitle="Japanese Domestic Market Annual Meet",
            date="2026-11-15 10:00 BRT",
            location="Speedway Music Park - Balneário Camboriú / SC",
            address="R. José Francisco Corrêa, Balneário Camboriú - SC",
            city="Balneário Camboriú",
            banner_url="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
            description="Encontro dedicado exclusivamente à cultura automotiva japonesa. Lendas dos anos 90 e 2000 em exibição com avaliação técnica.",
            status="active"
        )
        db.add(event2)
        db.commit()
        db.refresh(event2)

        tiers2 = [
            TicketTier(
                event_id=event2.id,
                name="Expositor JDM VIP",
                badge="epic",
                price_brl=150.0,
                price_usd=30.0,
                price_eur=28.0,
                quantity_total=100,
                quantity_sold=45,
                requires_car_specs=True,
                perks="Vaga Reservada Paddock Principal,Troféu Melhores do Ano,Kit Exclusivo JDM,Troféu Votação do Público"
            ),
            TicketTier(
                event_id=event2.id,
                name="Pedestre Geral",
                badge="uncommon",
                price_brl=50.0,
                price_usd=10.0,
                price_eur=9.0,
                quantity_total=600,
                quantity_sold=210,
                requires_car_specs=False,
                perks="Acesso livre a todas as áreas públicas,Sorteios de Brindes JDM"
            )
        ]
        db.add_all(tiers2)
        db.commit()


@router.get("")
def list_events(db: Session = Depends(get_db)):
    """Returns list of active car meet events."""
    seed_default_events(db)
    events = db.query(Event).all()
    result = []
    for ev in events:
        tiers = db.query(TicketTier).filter(TicketTier.event_id == ev.id).all()
        result.append({
            "id": ev.id,
            "slug": ev.slug,
            "title": ev.title,
            "subtitle": ev.subtitle,
            "date": ev.date,
            "location": ev.location,
            "address": ev.address,
            "city": ev.city,
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
                    "perks": t.perks.split(",") if t.perks else []
                }
                for t in tiers
            ]
        })
    return {"status": "success", "events": result}


@router.get("/{slug}")
def get_event_detail(slug: str, db: Session = Depends(get_db)):
    """Returns single event details by slug."""
    ev = db.query(Event).filter(Event.slug == slug).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    
    tiers = db.query(TicketTier).filter(TicketTier.event_id == ev.id).all()
    return {
        "id": ev.id,
        "slug": ev.slug,
        "title": ev.title,
        "subtitle": ev.subtitle,
        "date": ev.date,
        "location": ev.location,
        "address": ev.address,
        "city": ev.city,
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
                "perks": t.perks.split(",") if t.perks else []
            }
            for t in tiers
        ]
    }
