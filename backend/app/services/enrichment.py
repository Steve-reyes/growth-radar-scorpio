"""Lead contact enrichment service.

Uses Playwright to search Google Maps + Yelp for phone numbers and websites.
Falls back to DuckDuckGo if Playwright unavailable.
"""

import re
import httpx
from urllib.parse import quote
from typing import Optional

SEARCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

_contact_cache: dict[tuple[str, str], tuple[Optional[str], Optional[str]]] = {}
_playwright_available: Optional[bool] = None


async def _check_playwright() -> bool:
    global _playwright_available
    if _playwright_available is not None:
        return _playwright_available
    try:
        from playwright.async_api import async_playwright
        _playwright_available = True
        return True
    except ImportError:
        _playwright_available = False
        return False


def _extract_phone(text: str) -> Optional[str]:
    pat = r'(?:\+1\s?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}'
    matches = re.findall(pat, text)
    for m in matches:
        digits = re.sub(r'\D', '', m)
        if len(digits) in (10, 11):
            return m.strip()
    return None


async def _search_yelp(name: str, city: str) -> tuple[Optional[str], Optional[str]]:
    """Search Yelp for business contact info. Yelp is free and has no consent wall."""
    from playwright.async_api import async_playwright

    query = f"{name} {city}"
    url = f"https://www.yelp.com/search?find_desc={quote(query)}&find_loc={quote(city)}"

    phone = None
    website = None

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = await browser.new_context(
            user_agent=SEARCH_HEADERS["User-Agent"],
            locale="en-US",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        try:
            await page.goto(url, timeout=20000, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)

            # Click the first result to open its detail page
            first_result = await page.query_selector('a[href*="/biz/"]')
            if first_result:
                href = await first_result.get_attribute("href")
                if href:
                    biz_url = f"https://www.yelp.com{href}" if href.startswith("/") else href
                    await page.goto(biz_url, timeout=20000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(2000)

                    # Extract phone
                    phone_els = await page.query_selector_all('[href^="tel:"]')
                    for el in phone_els:
                        href = await el.get_attribute("href")
                        if href:
                            pn = href.replace("tel:", "").replace("+1", "").strip()
                            if pn:
                                phone = pn
                                break

                    # Extract website
                    web_els = await page.query_selector_all('[href^="http"]:not([href*="yelp"])')
                    for el in web_els:
                        href = await el.get_attribute("href")
                        if href and all(s not in href for s in ["yelp.com", "facebook.com", "instagram.com", "tripadvisor", "yellowpages"]):
                            website = href
                            break

                    # Fallback: scan page text for phone
                    if not phone:
                        body = await page.inner_text("body")
                        phone = _extract_phone(body)

        except Exception:
            pass
        finally:
            await browser.close()

    return phone, website


async def _search_google_with_consent(name: str, city: str) -> tuple[Optional[str], Optional[str]]:
    """Search Google Maps via Playwright, handling GDPR consent."""
    from playwright.async_api import async_playwright

    query = f"{name} {city}"
    url = f"https://www.google.com/maps/search/{quote(query)}/"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = await browser.new_context(
            user_agent=SEARCH_HEADERS["User-Agent"],
            locale="en-US",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        phone = None
        website = None

        try:
            await page.goto(url, timeout=20000, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)

            # Handle GDPR consent page
            consent_btn = await page.query_selector('button:has-text("Accept all"), button:has-text("Alle akzeptieren"), form:has-text("Accept all") button')
            if consent_btn:
                await consent_btn.click()
                await page.wait_for_timeout(3000)

            # Try to extract phone from the page
            phone_els = await page.query_selector_all('[data-tooltip*="phone" i], [aria-label*="phone" i]')
            for el in phone_els:
                text = await el.inner_text()
                pn = _extract_phone(text)
                if pn:
                    phone = pn
                    break

            if not phone:
                body = await page.inner_text("body")
                phone = _extract_phone(body)

            # Extract website
            web_els = await page.query_selector_all('a[href*="http"]:not([href*="google"])')
            seen = set()
            for el in web_els:
                href = await el.get_attribute("href")
                if href and href not in seen:
                    seen.add(href)
                    if "google.com" not in href and "facebook" not in href and "instagram" not in href:
                        website = href
                        break

        except Exception:
            pass
        finally:
            await browser.close()

    return phone, website


async def _search_duckduckgo(name: str, city: str) -> tuple[Optional[str], Optional[str]]:
    """Fallback: search DuckDuckGo."""
    query = f'"{name}" {city} phone'
    url = f"https://html.duckduckgo.com/html/?q={quote(query)}"

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=SEARCH_HEADERS)
            if resp.status_code != 200:
                return None, None

            html = resp.text
            snippets = re.findall(
                r'class="result__snippet"[^>]*>(.*?)</(?:a|div)>', html, re.DOTALL
            )
            snippet_text = " ".join(re.sub(r"<[^>]+>", "", s) for s in snippets)

            phone = _extract_phone(snippet_text)
            if not phone:
                phone = _extract_phone(html)

            links = re.findall(r'class="result__url"[^>]*>(.*?)</', html, re.DOTALL)
            website = None
            for link_text in links:
                clean_link = re.sub(r"<[^>]+>", "", link_text).strip()
                if clean_link and "duckduckgo.com" not in clean_link:
                    if clean_link.startswith("//"):
                        clean_link = "https:" + clean_link
                    elif not clean_link.startswith("http"):
                        clean_link = "https://" + clean_link
                    skip = ["facebook.com", "instagram.com", "twitter.com", "linkedin.com", "yelp.com"]
                    if not any(s in clean_link for s in skip):
                        website = clean_link
                        break
            return phone, website
    except Exception:
        return None, None


async def enrich_lead_contact(
    business_name: str,
    city: str,
) -> tuple[Optional[str], Optional[str]]:
    """Find phone number and website for a business.

    1. Playwright + Yelp (most reliable, no consent wall)
    2. Playwright + Google Maps (with consent handling)
    3. DuckDuckGo (httpx fallback)
    """
    key = (business_name.lower().strip(), (city or "").lower().strip())
    if not key[0]:
        return None, None
    if key in _contact_cache:
        return _contact_cache[key]

    phone = None
    website = None

    if await _check_playwright():
        # Try Yelp first (clean, no consent wall)
        phone, website = await _search_yelp(business_name, city or "")
        # If Yelp didn't find anything, try Google Maps with consent handling
        if not phone and not website:
            phone, website = await _search_google_with_consent(business_name, city or "")

    if not phone and not website:
        phone, website = await _search_duckduckgo(business_name, city or "")

    _contact_cache[key] = (phone, website)
    return phone, website
