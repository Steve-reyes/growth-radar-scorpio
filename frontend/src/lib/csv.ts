// CSV Export utility
import { Lead } from './types';

export function csvEscape(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportLeadsCSV(leads: Lead[], filename: string = 'leads.csv') {
  const headers = [
    'Business Name', 'Phone', 'Email', 'Address', 'City', 'Province',
    'Postal Code', 'Business Type', 'HVAC Score', 'Status',
    'Source', 'Website', 'Licence Fee', 'Employees',
    'Score Reason', 'Notes', 'Discovered At'
  ];

  const rows = leads.map(l => [
    l.business_name, l.phone, l.email, l.address, l.city, l.province,
    l.postal_code, l.business_type, l.hvac_score, l.status,
    l.lead_source, l.website, l.licence_fee, l.num_employees,
    l.score_reason, l.notes, l.discovered_at
  ].map(csvEscape));

  const csv = [headers.join(','), ...rows.join('\r\n')].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
