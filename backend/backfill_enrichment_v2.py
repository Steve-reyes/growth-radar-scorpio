"""Backfill enrichment v2 — single browser instance, OOM-safe."""
import asyncio, sys, gc
sys.path.insert(0, "/app")

from sqlalchemy import select
from app.database import async_session_factory
from app.models.lead import Lead


async def backfill():
    # Get IDs of leads needing enrichment
    async with async_session_factory() as db:
        result = await db.execute(
            select(Lead.id, Lead.business_name, Lead.city).where(Lead.phone.is_(None))
        )
        lead_rows = result.all()

    total = len(lead_rows)
    print(f"Enriching {total} leads...", flush=True)

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        # ONE browser for all leads
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox",
                  "--disable-dev-shm-usage", "--disable-gpu",
                  "--single-process", "--no-zygote"]
        )
        context = await browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"),
            locale="en-US",
            viewport={"width": 800, "height": 600},
        )

        done = 0
        found = 0

        for lid, name, city in lead_rows:
            try:
                page = await context.new_page()
                phone, website = None, None

                try:
                    query = f"{name} {city or ''}"
                    url = f"https://www.yelp.com/search?find_desc={__import__('urllib.parse').quote(query)}&find_loc={__import__('urllib.parse').quote(city or '')}"
                    await page.goto(url, timeout=20000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(3000)

                    first_result = await page.query_selector('a[href*="/biz/"]')
                    if first_result:
                        href = await first_result.get_attribute("href")
                        if href:
                            biz_url = f"https://www.yelp.com{href}" if href.startswith("/") else href
                            await page.goto(biz_url, timeout=20000, wait_until="domcontentloaded")
                            await page.wait_for_timeout(2000)

                            phone_els = await page.query_selector_all('[href^="tel:"]')
                            for el in phone_els:
                                h = await el.get_attribute("href")
                                if h:
                                    pn = h.replace("tel:", "").replace("+1", "").strip()
                                    if pn:
                                        phone = pn
                                        break

                            web_els = await page.query_selector_all('[href^="http"]:not([href*="yelp"])')
                            for el in web_els:
                                h = await el.get_attribute("href")
                                if h and all(s not in h for s in ["yelp.com", "facebook.com", "instagram.com", "tripadvisor", "yellowpages"]):
                                    website = h
                                    break

                            if not phone:
                                body = await page.inner_text("body")
                                import re
                                pat = r'(?:\+1\s?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}'
                                m = re.search(pat, body)
                                if m:
                                    phone = m.group()
                except Exception:
                    pass
                finally:
                    await page.close()

                if phone or website:
                    async with async_session_factory() as db:
                        try:
                            result = await db.execute(select(Lead).where(Lead.id == lid))
                            lead = result.scalar_one_or_none()
                            if lead:
                                if phone:
                                    lead.phone = phone
                                if website:
                                    lead.website = website
                                await db.commit()
                                found += 1
                                print(f"  ✓ #{lid} {name[:30]} → {phone or '-'}", flush=True)
                        except Exception as e:
                            print(f"  ✗ #{lid} commit error: {e}", flush=True)
                else:
                    print(f"  - #{lid} {name[:30]} → nothing", flush=True)

                done += 1
                gc.collect()

                if done % 10 == 0:
                    print(f"  [{done}/{total}] {found} found", flush=True)

            except Exception as e:
                print(f"  Error lead {lid} ({name}): {e}", flush=True)
                continue

        await browser.close()

    print(f"\nDone! {done} processed, {found} enriched.", flush=True)


if __name__ == "__main__":
    asyncio.run(backfill())
