import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import ContactPanel from '../components/ContactPanel';
import { fetchFamilyById, type FamilyData } from '../lib/crmClient';

export default function FamilyProfilePage() {
  const { familyId } = useParams();
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Personal & Academic');

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    fetchFamilyById(familyId)
      .then(data => {
        if (data) setFamilyData(data);
        else setError('Family not found');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [familyId]);

  if (loading) return <AdminLayout activeDesk="crm"><div className="p-8 text-center">Loading...</div></AdminLayout>;
  if (error || !familyData) return <AdminLayout activeDesk="crm"><div className="p-8 text-center text-red-600">{error || 'Not found'}</div></AdminLayout>;

  const contactActivities = [
    { type: 'attendance' as const, label: 'ACCOUNT NOTE', description: 'All paperwork verified and up to date for the current academic year.', timestamp: '15 May 2024' },
    { type: 'general' as const, label: 'ENROLLMENT CONFIRMED', description: 'Both students enrolled for Spring 2024 term. Tuition paid in full.', timestamp: '01 Sep 2023' },
    { type: 'medical' as const, label: 'MEDICAL RECORD UPDATE', description: 'Emergency contact details updated by Sarah Montgomery.', timestamp: '12 Oct 2023' },
  ];

  return (
    <AdminLayout activeDesk="crm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/service/crm" className="hover:underline" style={{ color: '#54626C' }}>CRM</Link>
        <span style={{ color: '#54626C' }}>/</span>
        <span style={{ color: '#1A242B' }}>Family Profile</span>
      </div>

      {/* Account Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#273946', color: '#E8A020', fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500 }}>
            M
          </div>
          <div>
            <h1 className="mb-2" style={{ fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500, lineHeight: '44px', color: '#1A242B', letterSpacing: '-0.01em' }}>
              {family.name}
            </h1>
            <p className="text-sm" style={{ color: '#54626C' }}>Family Account • ID: {family.id}</p>
          </div>
        </div>
        <button
          onClick={() => setIsContactPanelOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold transition-colors duration-200 cursor-pointer"
          style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
          Activity Log
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto shrink-0 -mb-[1px]">
        <nav className="flex" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-6 py-3 whitespace-nowrap transition-colors relative"
                style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', fontFamily: '"Source Sans 3", sans-serif',
                  color: isActive ? '#273946' : '#54626C',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderTop: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderLeft: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRadius: isActive ? '0.25rem 0.25rem 0 0' : undefined,
                  zIndex: isActive ? 10 : undefined,
                }}>
                {isActive && (
                  <span className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: '#E8A020' }} />
                )}
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Family Overview */}
      <section>
        <h2 className="mb-6" style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>Family Overview</h2>
        <div className="rounded p-8 grid grid-cols-1 md:grid-cols-5 gap-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.2)' }}>
          {[
            { label: 'Enrollment Date', value: new Date(family.created_at).toLocaleDateString() },
            { label: 'Family Code', value: family.family_code || 'N/A' },
            { label: 'Status', value: family.status },
            { label: 'Tenant ID', value: family.tenant_id?.substring(0, 8) || 'N/A' },
            { label: 'Account ID', value: family.id?.substring(0, 8) || 'N/A' },
          ].map((item) => (
            <div key={item.label}>
              <p className="mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>{item.label}</p>
              <p className="text-base" style={{ color: '#1A242B' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Members Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Adult Members */}
        <section>
          <h2 className="mb-6" style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>Adult Members</h2>
          <div className="rounded p-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.2)' }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}>
                  <th className="pb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Name</th>
                  <th className="pb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Role</th>
                  <th className="pb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {familyData.adults.map((adult, i) => (
                  <tr key={adult.id} style={{ borderBottom: i < familyData.adults.length - 1 ? '1px solid rgba(195,199,204,0.1)' : undefined }}>
                    <td className="py-4 text-sm" style={{ color: '#1A242B' }}>
                      <Link to={`/service/crm/family/${familyId}/adult/${adult.id}`} className="hover:underline" style={{ color: '#273946' }}>
                        {adult.name}
                      </Link>
                    </td>
                    <td className="py-4 text-sm" style={{ color: '#54626C' }}>{adult.role}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                        style={{ fontSize: '10px', backgroundColor: 'rgba(39,57,70,0.05)', color: '#273946', border: '1px solid rgba(39,57,70,0.1)' }}>
                        {adult.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Student Members */}
        <section>
          <h2 className="mb-6" style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>Student Members</h2>
          <div className="rounded p-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.2)' }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}>
                  <th className="pb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Student</th>
                  <th className="pb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Grade</th>
                  <th className="pb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {familyData.students.map((student, i) => (
                  <tr key={student.id} style={{ borderBottom: i < familyData.students.length - 1 ? '1px solid rgba(195,199,204,0.1)' : undefined }}>
                    <td className="py-4 text-sm" style={{ color: '#1A242B' }}>
                      <Link to={`/service/crm/family/${familyId}/student/${student.id}`} className="hover:underline" style={{ color: '#273946' }}>
                        {student.name}
                      </Link>
                    </td>
                    <td className="py-4 text-sm" style={{ color: '#54626C' }}>{student.grade || 'N/A'}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                        style={{ fontSize: '10px', backgroundColor: 'rgba(39,57,70,0.05)', color: '#273946', border: '1px solid rgba(39,57,70,0.1)' }}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Recent Invoices */}
      <section>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)', backgroundColor: '#faf9f6' }}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#273946' }}>receipt_long</span>
              <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>Recent Invoices</h2>
            </div>
            <div className="flex items-center gap-4">
              <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
                Total Invoices: {familyInvoices.length} | Paid: {familyInvoices.filter(i => i.status === 'paid').length} | Pending: {familyInvoices.filter(i => i.status !== 'paid').length}
              </p>
              <button className="hover:opacity-70 transition-opacity cursor-pointer">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#54626C' }}>more_vert</span>
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {familyInvoices.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#54626C' }}>No invoices yet</p>
            ) : familyInvoices.slice(0, 5).map((invoice, i) => (
              <div key={invoice.id} className="flex gap-4 relative">
                {i < Math.min(familyInvoices.length, 5) - 1 && (
                  <div className="absolute left-4 top-8 bottom-[-24px] w-px" style={{ backgroundColor: 'rgba(195,199,204,0.3)' }} />
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                  style={{
                    backgroundColor: invoice.status === 'paid' ? 'rgba(39,57,70,0.1)' : 'rgba(232,160,32,0.1)',
                    border: invoice.status === 'paid' ? '1px solid rgba(39,57,70,0.3)' : '1px solid rgba(232,160,32,0.3)',
                  }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '14px',
                    color: invoice.status === 'paid' ? '#273946' : '#E8A020',
                  }}>{invoice.status === 'paid' ? 'check_circle' : 'pending'}</span>
                </div>
                <div>
                  <p className="text-sm" style={{ color: '#1A242B' }}>
                    <span className="font-semibold" style={{ color: '#273946' }}>{invoice.description || 'Invoice'}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#54626C' }}>
                    {new Date(invoice.created_at).toLocaleDateString()} • ${invoice.amount?.toFixed(2) || '0.00'} • {invoice.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Ledger */}
      <section>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(39,57,70,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-8 py-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}>
            <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#1A242B' }}>Recent Payments</h2>
            <button className="flex items-center gap-1 hover:underline" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#273946' }}>
              View All
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'rgba(244,243,240,0.3)' }}>
                  {['Date', 'Amount', 'Method', 'Status'].map((h) => (
                    <th key={h} className="px-8 pb-4 uppercase border-b" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C', borderColor: 'rgba(195,199,204,0.2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {familyPayments.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-4 text-center text-sm" style={{ color: '#54626C' }}>No payments yet</td></tr>
                ) : familyPayments.map((payment, i) => (
                  <tr key={payment.id} style={{ height: '52px', borderBottom: i < familyPayments.length - 1 ? '1px solid rgba(195,199,204,0.1)' : undefined }}>
                    <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>{new Date(payment.created_at).toLocaleDateString()}</td>
                    <td className="px-8 py-4 text-sm" style={{ color: '#1A242B' }}>${payment.amount?.toFixed(2) || '0.00'}</td>
                    <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>{payment.payment_method || 'N/A'}</td>
                    <td className="px-8 py-4 text-sm" style={{ color: payment.status === 'completed' ? '#1A242B' : '#E8A020' }}>{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Administrative & Financial */}
      <section>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(39,57,70,0.1)', backgroundColor: '#ffffff' }}>
          <div className="px-8 py-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}>
            <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Administrative & Financial</h2>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>account_balance_wallet</span>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <label className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Family Account</label>
              <div style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#273946' }}>{family.family_code || family.id?.substring(0, 8) || 'N/A'}</div>
              <p className="text-xs" style={{ color: '#54626C' }}>Adults in Account: {familyData.adults.length}</p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Ledger & Contracts</label>
              <div className="flex flex-col gap-2">
                {[
                  { icon: 'receipt_long', label: 'View Account Ledger' },
                  { icon: 'description', label: 'View Contracts' },
                  { icon: 'id_card', label: 'Account IDs' },
                ].map((item) => (
                  <a key={item.label} href="#" className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#273946' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Billing & Status</label>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#54626C' }}>Latest Invoice</span>
                  <span className="text-xs font-medium" style={{ color: '#1A242B' }}>Paid</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#54626C' }}>Outstanding</span>
                  <span className="text-xs font-medium" style={{ color: '#1A242B' }}>None</span>
                </div>
                <div className="mt-2 pt-2 flex justify-between items-center" style={{ borderTop: '1px solid rgba(39,57,70,0.05)' }}>
                  <span className="text-xs" style={{ color: '#54626C' }}>Status</span>
                  <span className="px-2 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, border: '1px solid rgba(232,160,32,0.2)' }}>Up to Date</span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-8 py-6 flex flex-wrap gap-4" style={{ borderTop: '1px solid rgba(39,57,70,0.05)' }}>
            <button className="px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider cursor-pointer"
              style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em' }}>Account Statements</button>
            <button className="px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider cursor-pointer"
              style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em' }}>School Desk Activity</button>
            <button className="px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider cursor-pointer"
              style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em' }}>Office Desk Activity</button>
            <button className="px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              Profile Download
            </button>
          </div>
        </div>
      </section>

      {/* Account Integrity & Siblings */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 rounded" style={{ backgroundColor: 'rgba(244,243,240,0.3)', border: '1px solid rgba(195,199,204,0.1)' }}>
                <p className="mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Account Integrity</p>
                <p className="text-sm" style={{ color: '#1A242B' }}>ID: {family.id?.substring(0, 8) || 'N/A'} • Good Standing</p>
              </div>
              <div className="p-4 rounded" style={{ backgroundColor: 'rgba(244,243,240,0.3)', border: '1px solid rgba(195,199,204,0.1)' }}>
                <p className="mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Siblings</p>
                <p className="text-sm" style={{ color: '#1A242B' }}>2 Enrolled (Theodore, Eleanor)</p>
              </div>
            </div>
            <div className="p-6 rounded" style={{ backgroundColor: 'rgba(244,243,240,0.3)', border: '1px solid rgba(195,199,204,0.1)' }}>
              <p className="mb-2 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Analytical Summary</p>
              <p className="text-xs" style={{ color: '#54626C' }}>
                Account is currently in good standing. All administrative paperwork for the current academic year is complete and verified by the Front Desk. No outstanding balances or pending disciplinary actions recorded.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ContactPanel
        isOpen={isContactPanelOpen}
        onClose={() => setIsContactPanelOpen(false)}
        profileName={family.family_code || family.name}
        profileType="Family"
        mainContact={{
          name: 'Sarah Montgomery',
          role: 'Primary Contact',
          email: 'sarah.montgomery@gmail.com',
          phone: '+44 7700 123456',
        }}
        activities={contactActivities}
      />
    </AdminLayout>
  );
}
