import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dg_ticketing.db")

# If PostgreSQL or SQLite
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column(conn, table_name: str, column_name: str, ddl_type: str):
    inspector = inspect(conn)
    if not inspector.has_table(table_name):
        return
    existing = {col["name"] for col in inspector.get_columns(table_name)}
    if column_name not in existing:
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl_type}"))


def init_db():
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        _ensure_column(conn, "organizers", "phone", "VARCHAR(50)")
        _ensure_column(conn, "organizers", "organization", "VARCHAR(150)")
        _ensure_column(conn, "organizers", "instagram", "VARCHAR(120)")
        _ensure_column(conn, "events", "organizer_id", "INTEGER")
        _ensure_column(conn, "events", "country", "VARCHAR(60)")
        _ensure_column(conn, "ticket_orders", "payment_provider", "VARCHAR(40)")
        _ensure_column(conn, "ticket_orders", "infinitepay_slug", "VARCHAR(255)")
        _ensure_column(conn, "ticket_orders", "checkout_url", "TEXT")
    print("Database tables initialized successfully.")
