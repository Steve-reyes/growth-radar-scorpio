#!/usr/bin/env python3
"""
Growth Radar — seed script.
Creates default BC territories, runs ingestion, and generates a brief.
Usage: python3 scripts/seed.py [--base-url https://growth-radar.example.com]
"""

import sys
import os
import json
import time
import urllib.request
import urllib.error
import ssl

BASE_URL = os.environ.get("SEED_BASE_URL", "https://growthradar.87.106.124.206.nip.io")
ADMIN_EMAIL = os.environ.get("SEED_ADMIN_EMAIL", "admin@growthradar.dev")
ADMIN_PASSWORD = os.environ.get("SEED_ADMIN_PASSWORD", "admin123")

TERRITORIES = [
    {"name": "Vancouver Metro", "city": "Vancouver", "province": "BC",
     "postal_code": None, "radius_km": 50},
    {"name": "Coquitlam", "city": "Coquitlam", "province": "BC",
     "postal_code": None, "radius_km": 15},
    {"name": "Burnaby", "city": "Burnaby", "province": "BC",
     "postal_code": None, "radius_km": 50},
    {"name": "Toronto Metro", "city": "Toronto", "province": "ON",
     "postal_code": None, "radius_km": 15},
    {"name": "Calgary Metro", "city": "Calgary", "province": "AB",
     "postal_code": None, "radius_km": 15},
    {"name": "Edmonton Metro", "city": "Edmonton", "province": "AB",
     "postal_code": None, "radius_km": 15},
    {"name": "Surrey Metro", "city": "Surrey", "province": "BC",
     "postal_code": None, "radius_km": 10},
    {"name": "Mississauga Metro", "city": "Mississauga", "province": "ON",
     "postal_code": None, "radius_km": 15},
    {"name": "Ottawa Metro", "city": "Ottawa", "province": "ON",
     "postal_code": None, "radius_km": 15},
    {"name": "Montreal Metro", "city": "Montreal", "province": "QC",
     "postal_code": None, "radius_km": 15},
]

ctx = ssl.create_default_context(cafile="/etc/ssl/certs/ca-certificates.crt")


def api(method: str, path: str, token: str | None = None, body: dict | None = None) -> dict:
    """Make an API call and return parsed JSON."""
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        resp = urllib.request.urlopen(req, context=ctx)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  [ERROR] {method} {path} -> {e.code} {body[:200]}")
        sys.exit(1)


def main():
    global BASE_URL
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--base-url" and i + 2 < len(sys.argv):
            BASE_URL = sys.argv[i + 2]

    print(f"🔑 Logging in as {ADMIN_EMAIL}...")
    token_data = api("POST", "/api/auth/login", body={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    })
    token: str = token_data["access_token"]
    print(f"   Token: {token[:20]}...")

    # Fetch existing territories
    existing = api("GET", "/api/territories", token=token)
    existing_map = {t["city"].lower(): t for t in existing}

    created = []
    for t in TERRITORIES:
        city_lower = t["city"].lower()
        if city_lower in existing_map:
            et = existing_map[city_lower]
            print(f"  ✅ {t['name']} (city={t['city']}) — already exists (id={et['id']})")
            created.append(et)
        else:
            print(f"  ➕ Creating {t['name']}...")
            new_t = api("POST", "/api/territories", token=token, body=t)
            created.append(new_t)
            print(f"     Created id={new_t['id']}")
            time.sleep(0.5)

    # Run ingestion on each
    print(f"\n🔁 Running ingestion on {len(created)} territories...")
    total_leads = 0
    for t in created:
        print(f"  ⏳ Ingesting {t['name']}...")
        api("POST", f"/api/territories/{t['id']}/ingest", token=token)
        print(f"     Done")
        time.sleep(2)  # brief pause between ingests

    # Fetch updated territory stats
    print(f"\n📊 Updated lead counts:")
    updated = api("GET", "/api/territories", token=token)
    for t in updated:
        print(f"  {t['name']}: {t.get('total_leads', '?')} leads (avg score {t.get('avg_score', '-')})")
        total_leads += t.get("total_leads", 0)

    # Generate brief
    print(f"\n📝 Generating daily brief...")
    try:
        brief = api("POST", "/api/briefs/generate", token=token)
        print("   Brief generated")
    except SystemExit:
        print("   Brief generation failed (may need OpenAI key)")

    print(f"\n✅ Seed complete. {len(created)} territories, ~{total_leads} leads total.")
    print(f"   Log in at {BASE_URL} with {ADMIN_EMAIL}")


if __name__ == "__main__":
    main()
