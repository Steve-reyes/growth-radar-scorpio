from app.utils.canada import INDUSTRY_KEYWORDS

HVAC_WEIGHTS = {
    "Restaurant": 90,
    "Commercial Kitchen": 95,
    "Food Service": 90,
    "Warehouse": 75,
    "Logistics": 75,
    "Distribution Center": 75,
    "Manufacturing": 80,
    "Industrial": 80,
    "Hotel": 85,
    "Motel": 80,
    "Hospitality": 85,
    "Office": 50,
    "Retail": 45,
    "Store": 45,
    "Grocery": 70,
    "Supermarket": 70,
    "School": 60,
    "Daycare": 55,
    "Educational": 60,
    "Medical": 65,
    "Clinic": 60,
    "Dental": 55,
    "Gym": 70,
    "Fitness": 70,
    "Church": 50,
    "Place of Worship": 50,
    "Apartment": 40,
    "Residential": 30,
}

KEYWORD_HEURISTICS = {
    "kitchen": 80,
    "warehouse": 70,
    "storage": 60,
    "industrial": 80,
    "manufacturing": 80,
    "factory": 80,
    "restaurant": 90,
    "cafe": 85,
    "coffee": 60,
    "bakery": 80,
    "grocery": 70,
    "supermarket": 70,
    "hotel": 85,
    "motel": 80,
    "hospitality": 85,
    "school": 60,
    "daycare": 55,
    "clinic": 60,
    "medical": 65,
    "dental": 55,
    "gym": 70,
    "fitness": 70,
    "office": 50,
    "retail": 45,
    "store": 45,
    "apartment": 40,
    "condo": 30,
    "residential": 30,
    "church": 50,
    "worship": 50,
    "lab": 65,
    "laboratory": 65,
    "pharmacy": 60,
    "laundry": 55,
    "salon": 45,
    "spa": 50,
    "theatre": 55,
    "cinema": 55,
    "mall": 60,
    "plaza": 55,
}


def score_business(
    business_type: str = "",
    business_name: str = "",
    address: str = "",
) -> tuple[int, str]:
    """
    Score a business by its HVAC potential (0-100).

    - First checks business_type against HVAC_WEIGHTS
    - Then checks business_name against KEYWORD_HEURISTICS
    - Defaults to 30 for unknown types
    Returns (score, reason_string).
    """
    search_text = f"{business_type} {business_name} {address}".lower()

    # 1. Check exact business type match
    if business_type:
        for hvac_type, score in HVAC_WEIGHTS.items():
            if hvac_type.lower() == business_type.lower():
                return (score, f"Matched business type '{business_type}' → score {score}")

        # Partial match on business type
        for hvac_type, score in HVAC_WEIGHTS.items():
            if hvac_type.lower() in business_type.lower() or business_type.lower() in hvac_type.lower():
                return (score, f"Partial match '{business_type}' ~ '{hvac_type}' → score {score}")

    # 2. Check industry keywords mapping
    for keyword, mapped_type in INDUSTRY_KEYWORDS.items():
        if keyword in search_text:
            base_score = HVAC_WEIGHTS.get(mapped_type, 30)
            return (base_score, f"Keyword '{keyword}' → '{mapped_type}' → score {base_score}")

    # 3. Check keyword heuristics
    best_score = 0
    best_keyword = None
    for keyword, score in KEYWORD_HEURISTICS.items():
        if keyword in search_text and score > best_score:
            best_score = score
            best_keyword = keyword

    if best_keyword:
        return (best_score, f"Heuristic keyword '{best_keyword}' → score {best_score}")

    # 4. Default
    return (30, "Default score for unknown business type")
