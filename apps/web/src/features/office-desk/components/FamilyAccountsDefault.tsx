import { useEffect, useState } from 'react';
import { supabaseUntyped } from '../services/supabase';

interface InvoiceWithFamily {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  family_name: string;
  family_code: string;
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'overdue': return { backgroundColor: 'rgba(200,40,30,0.1)', color: '#C8281E' };
    case 'issued': return { backgroundColor: '#dbdad7', color: '#54626C' };
    case 'draft': return { backgroundColor: '#dbdad7', color: '#54626C' };
    case 'paid': return { backgroundColor: 'rgba(39,57,70,0.1)', color: '#273946' };
    default: return { backgroundColor: '#dbdad7', color: '#54626C' };
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'issued': return 'Sent';
    case 'overdue': return 'Overdue';
    case 'draft': return 'Draft';
    case 'paid': return 'Paid';
    default: return status;
  }
}

export function FamilyAccountsDefault() {
  const [invoices, setInvoices] = useState<InvoiceWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabaseUntyped
        .from('office_desk.invoices')
        .select('id, family_account_id, invoice_number, amount, status, issued_date, due_date')
        .order('created_at', { ascending: false })
        .limit(10);

      if (invoicesError) {
        setError(invoicesError.message);
        setLoading(false);
        return;
      }

      // Fetch family accounts for name lookup
      const familyIds = [...new Set((invoicesData || []).map((i: Record<string, unknown>) => i.family_account_id as string))];
      const { data: familiesData } = await supabaseUntyped
        .from('office_desk.family_accounts')
        .select('id, family_name, family_code')
        .in('id', familyIds);

      const familyMap = new Map<string, { family_name: string; family_code: string }>();
      (familiesData || []).forEach((f: Record<string, unknown>) => {
        familyMap.set(f.id as string, { family_name: f.family_name as string || 'Unknown', family_code: f.family_code as string || '—' });
      });

      const mapped = (invoicesData || []).map((inv: Record<string, unknown>) => {
        const family = familyMap.get(inv.family_account_id as string);
        return {
          id: inv.id as string,
          invoice_number: inv.invoice_number as string,
          amount: inv.amount as number,
          status: inv.status as string,
          issued_date: inv.issued_date as string | null,
          due_date: inv.due_date as string | null,
          family_name: family?.family_name || 'Unknown',
          family_code: family?.family_code || '—',
        };
      });
      setInvoices(mapped);
      setLoading(false);
    }

    fetchData();
  }, []);

  const totalRecords = invoices.length;
  const invoicedCount = invoices.filter((i) => i.status === 'issued').length;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const draftCount = invoices.filter((i) => i.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Entries Table */}
      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#faf9f6' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', lineHeight: '28px', fontWeight: 500, color: '#1A242B' }}>
            Recent Entries
          </h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center" style={{ color: '#54626C' }}>Loading entries...</div>
          ) : error ? (
            <div className="p-8 text-center" style={{ color: '#C8281E' }}>Error: {error}</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center" style={{ color: '#54626C' }}>No entries found</div>
          ) : (
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#F8F7F4' }}>
                  {['Family / Account', 'Inv. Date', 'Due Date', 'Amount', 'Status'].map((h) => (
                    <th key={h} className={`py-3 px-6 font-semibold ${h === 'Amount' ? 'text-right' : ''}`}
                      style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#54626C', fontFamily: '"Source Sans 3", sans-serif' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusStyle = getStatusStyle(inv.status);
                  return (
                    <tr key={inv.id} className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(195,199,204,0.1)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f4f3f0'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}>
                      <td className="py-4 px-6">
                        <div className="font-medium" style={{ color: '#273946', fontSize: '14px' }}>{inv.family_name}</div>
                        <div className="mt-0.5" style={{ color: '#54626C', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif' }}>
                          {inv.family_code}
                        </div>
                      </td>
                      <td className="py-4 px-6" style={{ color: '#54626C', fontSize: '14px' }}>
                        {inv.issued_date ? new Date(inv.issued_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 px-6" style={{ color: inv.status === 'overdue' ? '#C8281E' : '#1A242B', fontWeight: inv.status === 'overdue' ? 500 : undefined, fontSize: '14px' }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 px-6 text-right font-medium" style={{ color: '#273946', fontSize: '14px' }}>
                        ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded" style={{ ...statusStyle, fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif' }}>
                          {getStatusLabel(inv.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#faf9f6' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#273946' }}>rss_feed</span>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', lineHeight: '28px', fontWeight: 500, color: '#1A242B' }}>
              Office Desk Activities
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#54626C', fontFamily: '"Source Sans 3", sans-serif' }}>
              Total Records: {totalRecords} | Invoiced: {totalRecords > 0 ? Math.round((invoicedCount / totalRecords) * 100) : 0}%, Paid: {totalRecords > 0 ? Math.round((paidCount / totalRecords) * 100) : 0}%, Overdue: {totalRecords > 0 ? Math.round((overdueCount / totalRecords) * 100) : 0}%, Draft: {totalRecords > 0 ? Math.round((draftCount / totalRecords) * 100) : 0}%
            </p>
            <button className="hover:text-[#273946]" style={{ color: '#54626C' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>more_vert</span>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {invoices.slice(0, 3).map((inv, i) => (
            <div key={inv.id} className="flex gap-4 relative">
              {i < Math.min(invoices.length, 3) - 1 && (
                <div className="absolute left-4 top-8 bottom-[-24px] w-px" style={{ backgroundColor: 'rgba(195,199,204,0.3)' }} />
              )}
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                style={{
                  backgroundColor: inv.status === 'overdue' ? 'rgba(200,40,30,0.1)' : inv.status === 'paid' ? 'rgba(39,57,70,0.1)' : '#ffffff',
                  border: `1px solid ${inv.status === 'overdue' ? 'rgba(200,40,30,0.3)' : inv.status === 'paid' ? 'rgba(39,57,70,0.3)' : '#c3c7cc'}`
                }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: '14px',
                  color: inv.status === 'overdue' ? '#C8281E' : inv.status === 'paid' ? '#273946' : '#273946'
                }}>
                  {inv.status === 'overdue' ? 'warning' : inv.status === 'paid' ? 'check_circle' : 'receipt_long'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '14px', lineHeight: '20px', color: '#1A242B' }}>
                  {inv.status === 'overdue' ? (
                    <><span className="font-semibold" style={{ color: '#273946' }}>{inv.family_name}</span> account flagged as <span className="font-semibold" style={{ color: '#C8281E' }}>Overdue</span></>
                  ) : inv.status === 'paid' ? (
                    <><span className="font-semibold" style={{ color: '#273946' }}>{inv.family_name}</span> payment received</>
                  ) : (
                    <><span className="font-semibold" style={{ color: '#273946' }}>Invoice</span> generated for <span className="font-semibold" style={{ color: '#273946' }}>{inv.family_name}</span></>
                  )}
                </p>
                <p className="mt-1" style={{ fontSize: '12px', color: '#54626C' }}>
                  Ref: {inv.invoice_number}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
