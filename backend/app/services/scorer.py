"""Scoring businesses by digital marketing potential for Leadzap.io.

Scores 0-100 based on how likely a business is to buy:
- SEO / local SEO
- Web development / redesign
- Lead generation
- AI automation
- Digital marketing / PPC

Gold (85-100): high competition, high budget, clear ROI on digital marketing
Excellent (70-84): competitive local businesses, proven need for SEO/leadgen
Good (50-69): stable businesses, some digital marketing need
Low (20-49): limited budget or low online competition
"""

DIGITAL_MARKETING_SCORES = {
    # ===== GOLD (85-100) — High competition, high budget =====
    "Hvac Contractor": 100, "Hvac": 100, "Heating": 100, "Cooling": 95,
    "Roofing Contractor": 100, "Roofing": 100, "Roofer": 100,
    "Electrical Contractor": 95, "Electrician": 95, "Electrical": 90,
    "Plumbing Contractor": 95, "Plumber": 95, "Plumbing": 90,
    "Dental Clinic": 95, "Dentist": 95, "Dentistry": 95,
    "Chiropractor": 90, "Chiropractic": 90,
    "Medical Clinic": 90, "Walk-in Clinic": 85, "Urgent Care": 90,
    "Optometry": 85, "Optician": 80, "Eye Care": 85,
    "Law Firm": 95, "Lawyer": 95, "Legal Services": 90,
    "Real Estate Agency": 90, "Realtor": 95, "Realty": 90,
    "Insurance Broker": 85, "Insurance": 85,
    "Mortgage Broker": 85, "Financial Advisor": 85,
    "Veterinary": 85, "Animal Hospital": 85,

    # ===== EXCELLENT (70-84) =====
    "Restaurant": 90, "Cafe": 85, "Bakery": 80, "Bar": 80,
    "Brewery": 85, "Distillery": 80, "Catering": 80,
    "Hotel": 90, "Motel": 85, "Inn": 80, "Hospitality": 80,
    "Auto Repair": 85, "Auto Shop": 80, "Mechanic": 80, "Garage": 75,
    "Car Dealer": 85, "Auto Dealer": 85, "Dealership": 85,
    "Gym": 80, "Fitness Center": 80, "Fitness": 80, "Wellness": 70,
    "General Contractor": 80, "Contractor": 80, "Renovation": 75,
    "Construction": 75, "Building Contractor": 80,
    "Daycare": 75, "Childcare": 75, "Preschool": 75,
    "Pharmacy": 75,
    "Salon": 75, "Barber": 70, "Spa": 75,
    "Landscaping": 75, "Lawn Care": 75, "Tree Service": 75,
    "Cleaning Service": 75, "Janitorial": 70,
    "Pest Control": 80,
    "Painting Contractor": 75,
    "Flooring": 70, "Paving": 70, "Concrete": 70, "Drywall": 70,
    "Martial Arts": 75, "Dance Studio": 70,

    # ===== GOOD (50-69) =====
    "Grocery": 70, "Supermarket": 70,
    "School": 60, "College": 65, "Academy": 65,
    "Clinic": 70, "Medical": 70,
    "Office": 45, "Retail": 50, "Store": 45, "Boutique": 50,
    "Laundry": 50, "Dry Cleaning": 50,
    "Auto Body": 65, "Auto Glass": 65, "Tire Shop": 65,
    "Theatre": 60, "Cinema": 60, "Entertainment": 55,
    "Pet Grooming": 60, "Pet Store": 55,
    "Travel Agency": 65,
    "Garden Center": 55, "Nursery": 55,

    # ===== LOW (20-49) =====
    "Warehouse": 65, "Logistics": 60, "Storage": 55,
    "Manufacturing": 70, "Factory": 70, "Industrial": 65,
    "Church": 45, "Temple": 45, "Worship": 45,
    "Property Maintenance": 55, "Handyman": 55,
    "Freight": 50, "Shipping": 45,
    "Wholesale": 45, "Supply": 40,
    "Consulting": 45, "Consultant": 45,
    "Printing": 50,
    "Photography": 55,
    "Locksmith": 55,
    "Convenience Store": 45, "Gas Station": 50,
}

# Name-based keyword heuristics
KEYWORD_HEURISTICS = {
    "hvac": 100, "heating": 100, "furnace": 100, "air condition": 100,
    "roofing": 100, "roofer": 100, "roof": 90,
    "electrician": 95, "electrical": 90,
    "plumber": 95, "plumbing": 90, "drain": 80,
    "mechanical": 85,
    "dentist": 95, "dental": 95, "chiropractor": 90,
    "law": 95, "lawyer": 95, "attorney": 95, "legal": 90,
    "realtor": 95, "real estate": 90,
    "restaurant": 90, "cafe": 85, "bakery": 80, "kitchen": 90,
    "hotel": 90, "motel": 85,
    "auto repair": 85, "mechanic": 80, "garage": 75,
    "gym": 80, "fitness": 80,
    "contractor": 80, "construction": 75, "renovation": 75,
    "landscaping": 75, "lawn": 75,
    "cleaning": 75, "janitorial": 70,
    "pest control": 80,
    "veterinary": 85, "vet": 85,
    "salon": 75, "barber": 70, "spa": 75,
    "painting": 75, "flooring": 70, "concrete": 70,
    "daycare": 75, "childcare": 75,
    "pharmacy": 75, "medical": 70, "clinic": 70,
    "manufacturing": 70, "factory": 70, "warehouse": 65,
    "grocery": 70, "supermarket": 70,
    "school": 60, "office": 45, "retail": 50, "store": 45,
}


def score_business(
    business_type: str = "",
    business_name: str = "",
    address: str = "",
) -> tuple[int, str]:
    """
    Score a business by digital marketing potential (0-100).

    High score = this business needs SEO, web dev, lead gen, or AI automation.
    Returns (score, reason_string).
    """
    search_text = f"{business_type} {business_name} {address}".lower()

    # 1. Check exact business type match
    if business_type:
        for dm_type, score in DIGITAL_MARKETING_SCORES.items():
            if dm_type.lower() == business_type.lower():
                return (score, f"Matched business type '{business_type}' -> score {score}")

        # Partial match on business type
        for dm_type, score in DIGITAL_MARKETING_SCORES.items():
            if dm_type.lower() in business_type.lower() or business_type.lower() in dm_type.lower():
                return (score, f"Partial match '{business_type}' ~ '{dm_type}' -> score {score}")

    # 2. Check keyword heuristics on name
    best_score = 0
    best_keyword = None
    for keyword, score in KEYWORD_HEURISTICS.items():
        if keyword in search_text and score > best_score:
            best_score = score
            best_keyword = keyword

    if best_keyword:
        return (best_score, f"Keyword heuristic '{best_keyword}' -> score {best_score}")

    # 3. Default
    return (30, "Default score for unknown business type -- low digital marketing priority")
