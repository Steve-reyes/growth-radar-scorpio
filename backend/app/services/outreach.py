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
) -> str:
    """Generate a markdown summary of leads for a daily brief.

    Uses OpenAI when available, otherwise returns a structured template.
    """
    if not leads:
        return f"# Daily Brief: {territory_name}\n\nNo new leads discovered today."

    if api_key:
        try:
            from openai import AsyncOpenAI

            lead_descriptions = "\n".join(
                f"- {l.business_name} ({l.business_type or 'Unknown type'}, "
                f"HVAC Score: {l.hvac_score}/100, Source: {l.lead_source or 'Unknown'})"
                for l in leads[:20]
            )

            total_leads = len(leads)
            avg_score = sum(l.hvac_score for l in leads) / total_leads
            high_potential = sum(1 for l in leads if l.hvac_score >= 70)

            prompt = (
                f"Generate a professional daily brief in markdown for a territory called "
                f"'{territory_name}'. Include:\n"
                f"- A title and date\n"
                f"- Key numbers: {total_leads} total leads, avg score {avg_score:.0f}/100, "
                f"{high_potential} high-potential leads (score >= 70)\n"
                f"- A brief narrative summary of the opportunity landscape\n"
                f"- Top leads worth prioritizing\n\n"
                f"Leads discovered:\n{lead_descriptions}"
            )
            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a business intelligence analyst creating daily briefs."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=600,
                temperature=0.5,
            )
            summary = response.choices[0].message.content.strip()
            if summary:
                return summary
        except Exception:
            pass

    # Structured template fallback
    total = len(leads)
    avg_score = sum(l.hvac_score for l in leads) / total if total else 0
    high_potential = [l for l in leads if l.hvac_score >= 70]
    new_leads = [l for l in leads if l.status == "new"]

    lines = [
        f"# Daily Brief: {territory_name}",
        f"**Date:** {__import__('datetime').datetime.utcnow().strftime('%Y-%m-%d')}",
        "",
        "## Summary",
        f"- **Total Leads:** {total}",
        f"- **Average HVAC Score:** {avg_score:.0f}/100",
        f"- **High-Potential (>=70):** {len(high_potential)}",
        f"- **New Leads:** {len(new_leads)}",
        "",
        "## Top Leads",
    ]

    for l in sorted(leads, key=lambda x: x.hvac_score, reverse=True)[:10]:
        lines.append(
            f"- **{l.business_name}** — {l.business_type or 'N/A'} "
            f"(Score: {l.hvac_score}/100) — {l.city or ''}"
        )

    if high_potential:
        lines.extend([
            "",
            "## Priority Actions",
            "These leads have high HVAC potential and should be contacted soon:",
        ])
        for l in high_potential[:5]:
            lines.append(f"- {l.business_name} ({l.city or ''}) — Score: {l.hvac_score}")

    return "\n".join(lines)
