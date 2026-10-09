from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.routers import events, checkout, coupons, organizer, webhooks

app = FastAPI(
    title="Digital Garage Car Meet Ticketing API",
    description="Modern Python Backend for Digital Garage Car Meet Ticketing with Pagar.me PIX, Stripe, i18n & Organizer Tools",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "dg-ticketing-api",
        "platform": "Digital Garage Car Meet Ticketing Platform",
        "version": "1.0.0"
    }


# Include Routers
app.include_router(events.router)
app.include_router(checkout.router)
app.include_router(coupons.router)
app.include_router(organizer.router)
app.include_router(webhooks.router)
