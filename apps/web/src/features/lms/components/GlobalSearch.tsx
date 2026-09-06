// GlobalSearch — search across students, leads, payments, registrations, contracts

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface SearchResult {
  id: string;
  type: 'student' | 'lead' | 'payment' | 'registration' | 'contract';
  title: string;
  subtitle: string;
  status?: string;
  route: string;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function search(q: string) {
    setLoading(true);
    const lower = q.toLowerCase();
    const all: SearchResult[] = await Promise.all([
      searchStudents(lower),
      searchLeads(lower),
      searchPayments(lower),
      searchRegistrations(lower),
      searchContracts(lower),
    ]).then((arrays) => arrays.flat());

    setResults(all.slice(0, 20));
    setLoading(false);
  }

  async function searchStudents(q: string): Promise<SearchResult[]> {
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name, enrollment_status')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(5);

    return ((data ?? []) as any[]).map((s: any) => ({
      id: s.id,
      type: 'student' as const,
      title: `${s.first_name} ${s.last_name}`,
      subtitle: s.enrollment_status || 'No status',
      status: s.enrollment_status,
      route: `/service/school-desk/student/${s.id}`,
    }));
  }

  async function searchLeads(q: string): Promise<SearchResult[]> {
    const { data } = await supabase
      .schema('front_desk')
      .from('leads')
      .select('id, name, email, status')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5);

    return ((data ?? []) as any[]).map((l: any) => ({
      id: l.id,
      type: 'lead' as const,
      title: l.name || 'Unnamed Lead',
      subtitle: l.email || 'No email',
      status: l.status,
      route: `/service/front-desk/lead/${l.id}`,
    }));
  }

  async function searchPayments(q: string): Promise<SearchResult[]> {
    const { data } = await supabase
      .from('payments')
      .select('id, student_id, amount, status, payment_type, created_at')
      .ilike('payment_type', `%${q}%`)
      .limit(5);

    return ((data ?? []) as any[]).map((p: any) => ({
      id: p.id,
      type: 'payment' as const,
      title: `R ${p.amount.toFixed(2)}`,
      subtitle: `${p.payment_type} — ${new Date(p.created_at).toLocaleDateString()}`,
      status: p.status,
      route: `/service/school-desk/student/${p.student_id}`,
    }));
  }

  async function searchRegistrations(q: string): Promise<SearchResult[]> {
    const { data } = await supabase
      .schema('office_desk')
      .from('registrations')
      .select('id, student_name, student_email, status')
      .or(`student_name.ilike.%${q}%,student_email.ilike.%${q}%`)
      .limit(5);

    return ((data ?? []) as any[]).map((r: any) => ({
      id: r.id,
      type: 'registration' as const,
      title: r.student_name || 'Unnamed',
      subtitle: r.student_email || 'No email',
      status: r.status,
      route: `/service/office-desk/registrations`,
    }));
  }

  async function searchContracts(q: string): Promise<SearchResult[]> {
    const { data } = await supabase
      .from('contracts' as any)
      .select('id, title, status')
      .ilike('title', `%${q}%`)
      .limit(5);

    return ((data ?? []) as any[]).map((c: any) => ({
      id: c.id,
      type: 'contract' as const,
      title: c.title,
      subtitle: 'Contract',
      status: c.status,
      route: `/service/office-desk/contracts`,
    }));
  }

  function handleSelect(result: SearchResult) {
    navigate(result.route);
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  const typeColors: Record<string, string> = {
    student: '#2563EB',
    lead: '#7C3AED',
    payment: '#059669',
    registration: '#D97706',
    contract: '#DC2626',
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search students, leads, payments..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-80 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">No results found</div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium text-white"
                    style={{ backgroundColor: typeColors[r.type] }}
                  >
                    {r.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
                  </div>
                  {r.status && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{r.status}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
