from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class OrganizerUser(Base):
    __tablename__ = "organizers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(150), nullable=False)
    role = Column(String(50), default="organizer")
    created_at = Column(DateTime, default=datetime.utcnow)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    subtitle = Column(String(250), nullable=True)
    date = Column(String(100), nullable=False)
    location = Column(String(200), nullable=False)
    address = Column(String(300), nullable=True)
    city = Column(String(100), nullable=False)
    banner_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active")  # active, ended, upcoming

    tiers = relationship("TicketTier", back_populates="event", cascade="all, delete-orphan")


class TicketTier(Base):
    __tablename__ = "ticket_tiers"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String(150), nullable=False)
    badge = Column(String(50), default="uncommon")  # uncommon, rare, epic, legendary
    price_brl = Column(Float, nullable=False)
    price_usd = Column(Float, nullable=False)
    price_eur = Column(Float, nullable=False)
    quantity_total = Column(Integer, default=100)
    quantity_sold = Column(Integer, default=0)
    requires_car_specs = Column(Boolean, default=False)
    perks = Column(Text, nullable=True)  # JSON or comma-separated string of features

    event = relationship("Event", back_populates="tiers")
    orders = relationship("TicketOrder", back_populates="tier")


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(String(20), default="percentage")  # percentage or fixed
    discount_value = Column(Float, nullable=False)  # e.g., 15 for 15% or 20.0 for R$20
    usage_limit = Column(Integer, default=100)
    times_used = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TicketOrder(Base):
    __tablename__ = "ticket_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    ticket_tier_id = Column(Integer, ForeignKey("ticket_tiers.id"), nullable=False)
    
    buyer_name = Column(String(150), nullable=False)
    buyer_email = Column(String(150), nullable=False)
    buyer_phone = Column(String(50), nullable=False)
    cpf_cnpj = Column(String(30), nullable=True)

    # Vehicle specs (for Expositor / Paddock entries)
    car_make = Column(String(100), nullable=True)
    car_model = Column(String(100), nullable=True)
    car_year = Column(String(10), nullable=True)
    car_color = Column(String(50), nullable=True)
    license_plate = Column(String(20), nullable=True)

    quantity = Column(Integer, default=1)
    subtotal_brl = Column(Float, nullable=False)
    discount_brl = Column(Float, default=0.0)
    total_amount_brl = Column(Float, nullable=False)
    currency = Column(String(10), default="BRL")
    applied_coupon = Column(String(50), nullable=True)

    payment_method = Column(String(20), default="pix")  # pix or credit_card
    payment_status = Column(String(30), default="pending")  # pending, paid, cancelled, refunded
    
    pix_qr_code = Column(Text, nullable=True)
    pix_copy_paste = Column(Text, nullable=True)
    stripe_session_id = Column(String(255), nullable=True)

    checked_in = Column(Boolean, default=False)
    checked_in_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    tier = relationship("TicketTier", back_populates="orders")
