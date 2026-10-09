from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Coupon

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


def seed_default_coupons(db: Session):
    if db.query(Coupon).count() == 0:
        db.add_all([
            Coupon(code="DG2026", discount_type="percentage", discount_value=15.0, usage_limit=100, active=True),
            Coupon(code="SPEED10", discount_type="fixed", discount_value=20.0, usage_limit=50, active=True),
            Coupon(code="MONZA2026", discount_type="percentage", discount_value=20.0, usage_limit=30, active=True),
        ])
        db.commit()


class CouponValidateRequest(BaseModel):
    code: str
    amount_brl: float


class CouponCreateRequest(BaseModel):
    code: str
    discount_type: str  # 'percentage' or 'fixed'
    discount_value: float
    usage_limit: int = 100


@router.post("/validate")
def validate_coupon(req: CouponValidateRequest, db: Session = Depends(get_db)):
    seed_default_coupons(db)
    cp = db.query(Coupon).filter(Coupon.code == req.code.upper().strip(), Coupon.active == True).first()
    if not cp:
        raise HTTPException(status_code=404, detail="Invalid or expired discount coupon code")

    if cp.usage_limit > 0 and cp.times_used >= cp.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    if cp.discount_type == "percentage":
        discount = req.amount_brl * (cp.discount_value / 100.0)
    else:
        discount = min(cp.discount_value, req.amount_brl)

    final_price = max(0.0, req.amount_brl - discount)

    return {
        "valid": True,
        "code": cp.code,
        "discount_type": cp.discount_type,
        "discount_value": cp.discount_value,
        "discount_brl": round(discount, 2),
        "final_price_brl": round(final_price, 2)
    }


@router.get("/list")
def list_coupons(db: Session = Depends(get_db)):
    seed_default_coupons(db)
    coupons = db.query(Coupon).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "discount_type": c.discount_type,
            "discount_value": c.discount_value,
            "usage_limit": c.usage_limit,
            "times_used": c.times_used,
            "active": c.active
        }
        for c in coupons
    ]


@router.post("/create")
def create_coupon(req: CouponCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(Coupon).filter(Coupon.code == req.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    cp = Coupon(
        code=req.code.upper().strip(),
        discount_type=req.discount_type,
        discount_value=req.discount_value,
        usage_limit=req.usage_limit,
        active=True
    )
    db.add(cp)
    db.commit()
    db.refresh(cp)
    return {"status": "success", "coupon": {"id": cp.id, "code": cp.code, "discount_type": cp.discount_type, "discount_value": cp.discount_value}}
