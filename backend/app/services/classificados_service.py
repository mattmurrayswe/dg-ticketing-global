from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import math
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests

from app.config.settings import (
    CLASSIFICADOS_API_URL,
    CLASSIFICADOS_PUBLIC_URL,
    CLASSIFICADOS_WEB_URL,
)

# Fallback coordinates for popular Brazilian automotive venues / metro cities
# when not directly present in rarissimo_carros' curated IBGE subset.
METRO_COORDINATES_FALLBACK: Dict[str, Tuple[float, float, str, str]] = {
    "curitiba": (-25.4284, -49.2733, "Curitiba", "PR"),
    "pinhais": (-25.4447, -49.1925, "Pinhais", "PR"),
    "sao jose dos pinhais": (-25.5307, -49.2063, "São José dos Pinhais", "PR"),
    "londrina": (-23.3045, -51.1696, "Londrina", "PR"),
    "maringa": (-23.4210, -51.9331, "Maringá", "PR"),
    "cascavel": (-24.9578, -53.4595, "Cascavel", "PR"),
    "balneario camboriu": (-26.9926, -48.6357, "Balneário Camboriú", "SC"),
    "camboriu": (-27.0252, -48.6542, "Camboriú", "SC"),
    "itajai": (-26.9078, -48.6619, "Itajaí", "SC"),
    "blumenau": (-26.9194, -49.0661, "Blumenau", "SC"),
    "joinville": (-26.3045, -48.8487, "Joinville", "SC"),
    "florianopolis": (-27.5949, -48.5482, "Florianópolis", "SC"),
    "nova santa rita": (-29.8578, -51.2736, "Nova Santa Rita", "RS"),
    "porto alegre": (-30.0346, -51.2177, "Porto Alegre", "RS"),
    "gramado": (-29.3746, -50.8764, "Gramado", "RS"),
    "caxias do sul": (-29.1678, -51.1794, "Caxias do Sul", "RS"),
    "sao paulo": (-23.5505, -46.6333, "São Paulo", "SP"),
    "interlagos": (-23.7036, -46.6997, "São Paulo", "SP"),
    "campinas": (-22.9099, -47.0626, "Campinas", "SP"),
    "santos": (-23.9608, -46.3336, "Santos", "SP"),
    "sao jose dos campos": (-23.1896, -45.8841, "São José dos Campos", "SP"),
    "ribeirao preto": (-21.1775, -47.8103, "Ribeirão Preto", "SP"),
    "rio de janeiro": (-22.9068, -43.1729, "Rio de Janeiro", "RJ"),
    "niteroi": (-22.8833, -43.1036, "Niterói", "RJ"),
    "belo horizonte": (-19.9167, -43.9345, "Belo Horizonte", "MG"),
    "brasilia": (-15.7939, -47.8828, "Brasília", "DF"),
    "goiania": (-16.6869, -49.2648, "Goiânia", "GO"),
}

BRAZIL_UFS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
}

PRICE_LINE_RE = re.compile(
    r"(?:r\$\s*[\d\.,]+|valor\s*:|pre[cç]o\s*:|fipe|[\d\.,]+\s*k\b|\$\s*[\d\.,]+)",
    re.IGNORECASE,
)
PHONE_FALLBACK_RE = re.compile(r"(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}")


def _normalize_text(value: str) -> str:
    if not value:
        return ""
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_only = decomposed.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_only).strip().lower()


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _candidate_api_bases() -> List[str]:
    bases = [
        CLASSIFICADOS_API_URL.rstrip("/"),
        "http://host.docker.internal:8002/api",
        "http://localhost:8002/api",
        "http://127.0.0.1:8002/api",
    ]
    seen = []
    for b in bases:
        if b and b not in seen:
            seen.append(b)
    return seen


def _request_classificados(path: str, params: Optional[Dict[str, Any]] = None) -> Any:
    last_err: Optional[Exception] = None
    for base in _candidate_api_bases():
        url = f"{base}/{path.lstrip('/')}"
        try:
            resp = requests.get(
                url,
                params=params,
                headers={"Accept": "application/json"},
                timeout=4.0,
            )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 404:
                return None
        except requests.RequestException as exc:
            last_err = exc
            continue
    if last_err:
        raise RuntimeError(f"Não foi possível conectar ao serviço dg-classificados: {last_err}")
    return None


def normalize_media_url(url: Optional[str]) -> Optional[str]:
    """Rewrites uploaded listing image URLs to the active local/public Classificados host."""
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.path.startswith("/uploads/"):
        return f"{CLASSIFICADOS_PUBLIC_URL.rstrip('/')}{parsed.path}"
    return url


def parse_city_and_uf(city_raw: str, location_raw: str = "", address_raw: str = "") -> Tuple[str, Optional[str]]:
    """Extracts clean city name and 2-letter UF from strings like 'Curitiba - PR' or 'Curitiba/PR'."""
    combined = f"{city_raw or ''} | {location_raw or ''} | {address_raw or ''}"
    uf_match = re.search(r"(?:[-/,]\s*|\b)([A-Z]{2})\b", combined.upper())
    uf = uf_match.group(1) if uf_match and uf_match.group(1) in BRAZIL_UFS else None

    cleaned = (city_raw or "").strip()
    cleaned = re.split(r"\s*[-/|]\s*", cleaned)[0].strip()
    cleaned = re.sub(r",\s*[A-Za-z]{2}$", "", cleaned).strip()
    return cleaned, uf


def resolve_event_coordinates(
    city_raw: str, location_raw: str = "", address_raw: str = ""
) -> Dict[str, Any]:
    """Resolves (lat, lng) for a Car Meet event using dg-classificados cities + metro fallbacks."""
    clean_city, uf = parse_city_and_uf(city_raw, location_raw, address_raw)
    norm_city = _normalize_text(clean_city)

    try:
        cities = _request_classificados("/locations/cities", {"q": clean_city, "limit": 20}) or []
    except RuntimeError:
        cities = []

    best_match = None
    for c in cities:
        c_norm = _normalize_text(c.get("name", ""))
        if c_norm == norm_city and (not uf or c.get("uf") == uf):
            best_match = c
            break
    if not best_match and cities:
        for c in cities:
            if not uf or c.get("uf") == uf:
                best_match = c
                break
        if not best_match:
            best_match = cities[0]

    if best_match and best_match.get("lat") is not None and best_match.get("lng") is not None:
        return {
            "city_name": best_match["name"],
            "uf": best_match.get("uf") or uf,
            "lat": float(best_match["lat"]),
            "lng": float(best_match["lng"]),
            "city_id": best_match.get("id"),
        }

    # Check curated metro / venue dictionary
    for key, (lat, lng, label_city, label_uf) in METRO_COORDINATES_FALLBACK.items():
        if key == norm_city or (key in _normalize_text(f"{city_raw} {location_raw}")):
            return {
                "city_name": clean_city or label_city,
                "uf": uf or label_uf,
                "lat": lat,
                "lng": lng,
                "city_id": None,
            }

    # Fallback to first city in the same state UF from dg-classificados
    if uf:
        try:
            state_cities = _request_classificados(f"/locations/states/{uf}/cities") or []
            for sc in state_cities:
                if sc.get("lat") is not None and sc.get("lng") is not None:
                    return {
                        "city_name": clean_city or sc["name"],
                        "uf": uf,
                        "lat": float(sc["lat"]),
                        "lng": float(sc["lng"]),
                        "city_id": sc.get("id"),
                    }
        except RuntimeError:
            pass

    # Default fallback (Curitiba - PR)
    return {
        "city_name": clean_city or "Curitiba",
        "uf": uf or "PR",
        "lat": -25.4284,
        "lng": -49.2733,
        "city_id": None,
    }


def _sanitize_highlights(description: Optional[str]) -> List[str]:
    """Extracts short vehicle highlights from description while stripping ALL prices/values."""
    if not description:
        return []
    highlights: List[str] = []
    skip_prefixes = (
        "vende-se",
        "vende se",
        "troca",
        "trocas",
        "intermediacao",
        "informacoes de responsabilidade",
        "contato",
        "whatsapp",
    )
    for raw_line in description.splitlines():
        line = raw_line.strip(" \t•-*")
        if not line or len(line) > 70:
            continue
        if PRICE_LINE_RE.search(line):
            continue
        if PHONE_FALLBACK_RE.search(line):
            continue
        norm = _normalize_text(line)
        if any(norm.startswith(prefix) for prefix in skip_prefixes):
            continue
        highlights.append(line)
        if len(highlights) >= 3:
            break
    return highlights


def _extract_fallback_phone(description: Optional[str]) -> Optional[str]:
    if not description:
        return None
    m = PHONE_FALLBACK_RE.search(description)
    return m.group(0).strip() if m else None


def get_classificados_listing_sanitized(listing_id: int) -> Optional[Dict[str, Any]]:
    """Fetches a single vehicle from dg-classificados and strips all pricing fields."""
    detail = _request_classificados(f"/listings/{listing_id}")
    if not detail:
        return None
    return _build_sanitized_vehicle(detail, detail=detail, distance_km=None, event_city_norm="")


def _build_sanitized_vehicle(
    summary: Dict[str, Any],
    detail: Optional[Dict[str, Any]],
    distance_km: Optional[float],
    event_city_norm: str,
) -> Dict[str, Any]:
    brand_obj = summary.get("brand") or {}
    model_obj = summary.get("model") or {}
    city_obj = summary.get("city") or {}
    seller_obj = (detail or {}).get("seller") or {}
    description = (detail or {}).get("description") or ""
    attrs = (detail or {}).get("attributes") or {}

    fallback_phone = _extract_fallback_phone(description)
    owner_phone = seller_obj.get("whatsapp") or seller_obj.get("phone") or fallback_phone

    raw_images = (detail or {}).get("images") or []
    images = [
        normalize_media_url(img.get("url") or img.get("thumb_url"))
        for img in raw_images
        if img.get("url") or img.get("thumb_url")
    ]
    cover_url = normalize_media_url(summary.get("cover_url"))
    if not cover_url and images:
        cover_url = images[0]

    brand_name = brand_obj.get("name") or ""
    model_name = model_obj.get("name") or ""
    version = summary.get("version") or ""
    vehicle_title = " ".join(p for p in [brand_name, model_name, version] if p).strip()

    car_city_name = city_obj.get("name") or ""
    car_uf = city_obj.get("uf") or ""
    is_same_city = bool(
        event_city_norm and _normalize_text(car_city_name) == event_city_norm
    ) or (distance_km is not None and distance_km < 15.0)

    spec_badges: List[str] = []
    if attrs.get("engine"):
        spec_badges.append(str(attrs["engine"]))
    if attrs.get("hp"):
        spec_badges.append(f"{attrs['hp']} cv")
    if attrs.get("drivetrain"):
        spec_badges.append(str(attrs["drivetrain"]).upper())
    if attrs.get("transmission"):
        spec_badges.append(str(attrs["transmission"]).capitalize())

    url_path = summary.get("url_path") or ""
    classificados_url = (
        f"{CLASSIFICADOS_WEB_URL.rstrip('/')}{url_path}" if url_path else CLASSIFICADOS_WEB_URL
    )

    # NOTE: Intentionally omits `price` and `fipe_value` in compliance with organizer privacy rules.
    return {
        "listing_id": summary["id"],
        "vehicle_type": summary.get("vehicle_type", "carro"),
        "vehicle_title": vehicle_title,
        "brand": brand_name,
        "model": model_name,
        "version": summary.get("version"),
        "year_model": summary.get("year_model"),
        "year_manufacture": summary.get("year_manufacture"),
        "mileage_km": summary.get("mileage_km"),
        "color": summary.get("color"),
        "city": car_city_name,
        "uf": car_uf,
        "distance_km": round(distance_km, 1) if distance_km is not None else None,
        "is_same_city": is_same_city,
        "is_featured": bool(summary.get("is_featured", False)),
        "cover_url": cover_url,
        "images": [u for u in images if u],
        "spec_badges": spec_badges,
        "highlights": _sanitize_highlights(description),
        "classificados_url": classificados_url,
        "owner": {
            "id": seller_obj.get("id"),
            "name": seller_obj.get("dealer_name") or seller_obj.get("name") or "Proprietário Digital Garage",
            "role": seller_obj.get("role") or "particular",
            "phone": owner_phone,
            "is_verified": bool(seller_obj.get("is_verified", False)),
        },
    }


def fetch_nearby_classificados_vehicles(
    event_city: str,
    event_location: str = "",
    event_address: str = "",
    radius_km: float = 250.0,
    search_query: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetches active cars from rarissimo_carros (dg-classificados) near the event's location,
    calculates exact distance in km, strips all prices, and enriches owner details.
    """
    origin = resolve_event_coordinates(event_city, event_location, event_address)
    event_lat, event_lng = origin["lat"], origin["lng"]
    event_city_norm = _normalize_text(origin["city_name"])

    all_cities = _request_classificados("/locations/cities", {"limit": 100}) or []
    city_coords: Dict[int, Tuple[float, float]] = {
        c["id"]: (float(c["lat"]), float(c["lng"]))
        for c in all_cities
        if c.get("id") is not None and c.get("lat") is not None and c.get("lng") is not None
    }

    params: Dict[str, Any] = {"page": 1, "page_size": 60, "vehicle_type": "carro"}
    if search_query and search_query.strip():
        params["q"] = search_query.strip()

    search_resp = _request_classificados("/search", params) or {}
    items = search_resp.get("items") or []

    matched: List[Tuple[Dict[str, Any], float]] = []
    for item in items:
        c_inline = item.get("city") or {}
        cid = c_inline.get("id")
        coords = city_coords.get(cid) if cid is not None else None
        if not coords:
            c_resolved = resolve_event_coordinates(
                c_inline.get("name") or "", "", c_inline.get("uf") or ""
            )
            coords = (c_resolved["lat"], c_resolved["lng"])

        dist = haversine_km(event_lat, event_lng, coords[0], coords[1])
        if dist <= radius_km:
            matched.append((item, dist))

    # Sort closest first, then featured, then newest model year
    matched.sort(
        key=lambda pair: (
            round(pair[1], 1),
            0 if pair[0].get("is_featured") else 1,
            -(pair[0].get("year_model") or 0),
        )
    )

    def _load_detail(listing_id: int) -> Optional[Dict[str, Any]]:
        try:
            return _request_classificados(f"/listings/{listing_id}")
        except Exception:
            return None

    details_by_id: Dict[int, Optional[Dict[str, Any]]] = {}
    if matched:
        with ThreadPoolExecutor(max_workers=min(8, len(matched))) as pool:
            futures = {
                item["id"]: pool.submit(_load_detail, item["id"])
                for item, _ in matched
            }
            for lid, fut in futures.items():
                details_by_id[lid] = fut.result()

    vehicles = [
        _build_sanitized_vehicle(
            summary=item,
            detail=details_by_id.get(item["id"]),
            distance_km=dist,
            event_city_norm=event_city_norm,
        )
        for item, dist in matched
    ]

    return {
        "origin": {
            "city": origin["city_name"],
            "uf": origin["uf"],
            "lat": event_lat,
            "lng": event_lng,
            "radius_km": radius_km,
        },
        "total_nearby": len(vehicles),
        "vehicles": vehicles,
    }
