export interface Territory {
  id: number;
  name: string;
  city: string;
  province: string;
  postal_code: string | null;
  radius_km: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_leads?: number;
  new_leads?: number;
  avg_score?: number;
  high_potential?: number;
}

export interface Lead {
  id: number;
  territory_id: number;
  business_name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  licence_fee: number | null;
  num_employees: number | null;
  business_type: string | null;
  hvac_score: number;
  score_reason: string | null;
  lead_source: string | null;
  status: string;
  ai_drafted_email: string | null;
  notes: string | null;
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

export interface DailyBrief {
  id: number;
  territory_id: number | null;
  title: string;
  summary: string;
  lead_count: number;
  generated_at: string;
  delivered: boolean;
  top_lead_ids: number[];
}

export interface DashboardStats {
  total_territories: number;
  total_leads: number;
  leads_today: number;
  new_leads: number;
  high_potential_leads: number;
  average_hvac_score: number;
}
