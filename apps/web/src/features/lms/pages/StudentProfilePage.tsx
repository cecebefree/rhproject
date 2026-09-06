// StudentProfilePage — consolidated view: enrollments, contracts, payments, debit orders

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  enrollment_status: string;
  email?: string;
  enrollment_date: string;
  user_id?: string | null;
}

interface Enrollment {
  id: string;
  course_id: string;
  purchased_at: string;
  courses: { title: string } | null;
}

interface Contract {
  id: string;
  status: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  created_at: string;
}

interface DebitOrder {
  id: string;
  amount: number;
  frequency: string;
  status: string;
  next_debit_date: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2)}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#e2e8f0',
  pending_signature: '#fef3c7',
  active: '#27ae60',
  expired: '#fee2e2',
  terminated: '#fee2e2',
  succeeded: '#27ae60',
  pending: '#fef3c7',
  failed: '#fee2e2',
  scheduled: '#e2e8f0',
  completed: '#d1fae5',
  cancelled: '#fee2e2',
};

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debitOrders, setDebitOrders] = useState<DebitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'enrollments' | 'contracts' | 'payments' | 'debit-orders'>('enrollments');

  useEffect(() => {
    if (!studentId) return;
    loadAll(studentId);
  }, [studentId]);

  async function loadAll(id: string) {
    setLoading(true);

    const [studentRes, enrollRes, contractRes, paymentRes, debitRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('enrollments' as any).select('id, course_id, purchased_at, programs!inner(title)').eq('student_id', id),
      supabase.from('contracts' as any).select('id, status, title, start_date, end_date, signed_at').eq('student_id', id),
      supabase.from('payments').select('id, amount, status, payment_type, created_at').eq('student_id', id).order('created_at', { ascending: false }),
      supabase.from('debit_orders').select('id, amount, frequency, status, next_debit_date').eq('student_id', id),
    ]);

    if (studentRes.data) setStudent(studentRes.data as Student);
    setEnrollments((enrollRes.data as any) ?? []);
    setContracts((contractRes.data as any) ?? []);
    setPayments((paymentRes.data as any) ?? []);
    setDebitOrders((debitRes.data as any) ?? []);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-xl" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff', minHeight: '500px' }}>
        <p className="text-sm" style={{ color: '#54626C' }}>Loading student profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-xl" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff', minHeight: '500px' }}>
        <p className="text-sm" style={{ color: '#54626C' }}>Student not found</p>
      </div>
    );
  }

  const tabs = [
    { key: 'enrollments', label: `Enrollments (${enrollments.length})` },
    { key: 'contracts', label: `Contracts (${contracts.length})` },
    { key: 'payments', label: `Payments (${payments.length})` },
    { key: 'debit-orders', label: `Debit Orders (${debitOrders.length})` },
  ] as const;

  return (
    <div>
      <button onClick={() => navigate('/service/school-desk')} className="text-sm mb-4" style={{ color: '#2563EB' }}>
        ← Back to School Desk
      </button>

      {/* Student Header */}
      <div className="p-6 rounded-xl" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
              {student.first_name} {student.last_name}
            </h1>
            <div className="flex gap-4 mt-2 text-sm" style={{ color: '#54626C' }}>
              <span>Email: {student.email || '—'}</span>
              <span>Grade: {student.grade || '—'}</span>
              <span>Status: {student.enrollment_status}</span>
              <span>Joined: {formatDate(student.enrollment_date)}</span>
            </div>
          </div>
          <span className="text-sm px-3 py-1 rounded-full font-medium"
            style={{ backgroundColor: student.enrollment_status === 'active' ? '#D1FAE5' : '#FEF3C7', color: '#1A242B' }}>
            {student.enrollment_status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-4 border-b" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 text-sm font-medium"
            style={{
              borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === tab.key ? '#2563EB' : '#54626C',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4 rounded-xl p-4" style={{ border: '1px solid rgba(195,199,204,0.3)', backgroundColor: '#ffffff', minHeight: '300px' }}>
        {activeTab === 'enrollments' && (
          <div>
            {enrollments.length === 0 ? (
              <p className="text-sm" style={{ color: '#54626C' }}>No enrollments</p>
            ) : (
              <div className="space-y-2">
                {enrollments.map((e) => (
                  <div key={e.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{e.programs?.title ?? 'Unknown Program'}</p>
                      <p className="text-xs" style={{ color: '#54626C' }}>Enrolled: {formatDate(e.purchased_at)}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div>
            {contracts.length === 0 ? (
              <p className="text-sm" style={{ color: '#54626C' }}>No contracts</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs" style={{ color: '#54626C' }}>
                        {formatDate(c.start_date)} — {formatDate(c.end_date)}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: STATUS_COLORS[c.status] ?? '#e2e8f0', color: '#1A242B' }}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            {payments.length === 0 ? (
              <p className="text-sm" style={{ color: '#54626C' }}>No payments</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                      <p className="text-xs" style={{ color: '#54626C' }}>
                        {p.payment_type} — {formatDate(p.created_at)}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: STATUS_COLORS[p.status] ?? '#e2e8f0', color: '#1A242B' }}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'debit-orders' && (
          <div>
            {debitOrders.length === 0 ? (
              <p className="text-sm" style={{ color: '#54626C' }}>No debit orders</p>
            ) : (
              <div className="space-y-2">
                {debitOrders.map((d) => (
                  <div key={d.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(d.amount)} / {d.frequency}</p>
                      <p className="text-xs" style={{ color: '#54626C' }}>
                        Next debit: {formatDate(d.next_debit_date)}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: STATUS_COLORS[d.status] ?? '#e2e8f0', color: '#1A242B' }}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
