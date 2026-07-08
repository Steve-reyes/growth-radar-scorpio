"""Outreach email drafting service.

Uses OpenAI API when available, falls back to template-based generation.
"""

from typing import Optional

from app.models.lead import Lead
from app.models.territory import Territory


async def draft_outreach_email(
    lead: Lead,
    territory: Optional[Territory] = None,
    api_key: str = "",
) -> str:
    """Draft a personalized outreach email for a lead.

    If OPENAI_API_KEY is set, uses OpenAI to draft the email.
    Otherwise, uses a template-based fallback.
    """
    territory_name = territory.name if territory else "your area"
    city = lead.city or territory.city if territory else "your city"
    business_type = lead.business_type or "business"

    if api_key:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=api_key)
            prompt = (
                f"You are a commercial HVAC sales professional. "
                f"Draft a short, personalized outreach email to {lead.business_name} "
                f"in {city}. They are a {business_type} business located in {territory_name}. "
                f"Keep it friendly, professional, and under 150 words. "
                f"Mention that reliable HVAC is critical for their operations. "
                f"End with a call to action for a quick chat."
            )
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful HVAC sales assistant."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=300,
                temperature=0.7,
            )
            email_text = response.choices[0].message.content.strip()
            if email_text:
                return email_text
        except Exception:
            # Fall through to template on any error
            pass

    # Template-based fallback
    email_text = (
        f"Hi {lead.business_name},\n\n"
        f"I noticed you're operating in {city}. As a {business_type}, "
        f"having reliable HVAC is critical for your operations. We help "
        f"businesses in {territory_name} optimize their heating and cooling systems, "
        f"reduce energy costs, and improve comfort for your customers and staff.\n\n"
        f"Would you be open to a quick chat next week to discuss how we might help?\n\n"
        f"Best regards,\n"
        f"Growth Radar HVAC Team"
    )
    return email_text


async def generate_brief_summary(
    leads: list[Lead],
    territory_name: str,
    api_key: str = "",
) -> tuple[str, list[int]]:
    """Generate a brief summary with top lead IDs.

    Returns (summary_text, top_lead_ids).
    """
    if not leads:
        return (
            f"No leads found for {territory_name}.",
            [],
        )

    total = len(leads)
    avg_score = sum(l.hvac_score for l in leads) / total if total else 0
    scored = sorted(leads, key=lambda x: x.hvac_score, reverse=True)
    high_potential = [l for l in scored if l.hvac_score >= 70]
    top_5 = scored[:5]
    top_ids = [l.id for l in top_5]

    # Build simple, readable summary
    lines = [
        f"Territory: {territory_name}",
        f"Leads: {total}  ·  Avg Score: {avg_score:.0f}/100  ·  Hot Leads: {len(high_potential)}",
        "",
        "Top Leads to Prioritize:",
    ]
    for i, l in enumerate(top_5, 1):
        lines.append(
            f"  {i}. {l.business_name}  —  Score: {l.hvac_score}  —  {l.city or ''}  —  {l.business_type or 'N/A'}"
        )

    if high_potential and high_potential != top_5[:len(high_potential)]:
        remaining = [l for l in high_potential if l not in top_5]
        if remaining:
            lines.append("")
            lines.append("Other Hot Leads:")
            for l in remaining[:3]:
                lines.append(f"  • {l.business_name}  —  Score: {l.hvac_score}  —  {l.city or ''}")

    summary = "\n".join(lines)
    return summary, top_ids
