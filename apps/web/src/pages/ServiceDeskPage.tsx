import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ActivityLogViewer } from '../components/ActivityLogViewer';
import { fetchServiceDeskStats, type DeskStats } from '../lib/serviceDeskClient';

export default function ServiceDeskPage() {
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServiceDeskStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout activeDesk="school-desk"><div className="p-8 text-center">Loading...</div></AdminLayout>;
  if (!stats) return <AdminLayout activeDesk="school-desk"><div className="p-8 text-center text-red-600">Failed to load stats</div></AdminLayout>;

  const DESK_SUMMARIES = [
    {
      key: 'front-desk',
      label: 'Front Desk',
      icon: 'concierge',
      href: '/service/front-desk',
      desc: 'Inquiries, leads, and intake',
      stats: [
        { label: 'Open Inquiries', value: String(stats.frontDesk.openInquiries) },
        { label: 'New Today', value: String(stats.frontDesk.newToday) },
        { label: 'Pending Callback', value: String(stats.frontDesk.pendingCallback) },
      ],
    },
    {
      key: 'office-desk',
      label: 'Office Desk',
      icon: 'business_center',
      href: '/service/office-desk',
      desc: 'Billing, families, and registrations',
      stats: [
        { label: 'Active Families', value: String(stats.officeDesk.activeFamilies) },
        { label: 'Pending Invoices', value: String(stats.officeDesk.pendingInvoices) },
        { label: 'New Registrations', value: String(stats.officeDesk.newRegistrations) },
      ],
    },
    {
      key: 'school-desk',
      label: 'School Desk',
      icon: 'school',
      href: '/service/school-desk',
      desc: 'Students, attendance, and grades',
      stats: [
        { label: 'Total Students', value: String(stats.schoolDesk.totalStudents) },
        { label: 'Present Today', value: String(stats.schoolDesk.presentToday) },
        { label: 'Pending Grades', value: String(stats.schoolDesk.pendingGrades) },
      ],
    },
    {
      key: 'crm',
      label: 'CRM',
      icon: 'person_search',
      href: '/service/crm',
      desc: 'Unified client relations',
      stats: [
        { label: 'Total Families', value: String(stats.crm.totalFamilies) },
        { label: 'Active Enrollments', value: String(stats.crm.activeEnrollments) },
        { label: 'Pending Follow-ups', value: String(stats.crm.pendingFollowups) },
      ],
    },
  ];

  return (
    <AdminLayout activeDesk="school-desk">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
          Service Desk
        </h1>
        <p className="text-sm mt-1" style={{ color: '#54626C' }}>
          Super admin overview — all desks at a glance.
        </p>
      </div>

      {/* Desk Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DESK_SUMMARIES.map((desk) => (
          <Link
            key={desk.key}
            to={desk.href}
            className="block p-5 rounded-xl transition-all duration-200 hover:shadow-lg no-underline"
            style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.3)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#E8A020' }}>{desk.icon}</span>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#1A242B' }}>{desk.label}</h3>
                <p className="text-xs" style={{ color: '#54626C' }}>{desk.desc}</p>
              </div>
            </div>
            <div className="space-y-2">
              {desk.stats.map((stat) => (
                <div key={stat.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#54626C' }}>{stat.label}</span>
                  <span className="text-sm font-semibold" style={{ color: '#1A242B' }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <ActivityLogViewer limit={20} />
    </AdminLayout>
  );
}
