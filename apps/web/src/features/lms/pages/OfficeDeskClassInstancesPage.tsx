/**
 * ClassInstanceManagement — CRUD for class_instances (term-based class schedule slots).
 */

import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../office-desk/services/supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ClassInstance {
  id: string;
  tenant_id: string;
  program_id: string;
  teacher_id: string | null;
  term: string;
  grade: string;
  class_section: string;
  intake_group: string | null;
  zone: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_students: number;
  current_students: number;
  status: string;
  created_at: string;
  updated_at: string;
  program?: { title: string } | null;
  teacher?: { name: string } | null;
}

interface Program {
  id: string;
  title: string;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

const STATUS_OPTIONS = ['draft', 'published', 'active', 'completed', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

// ═══════════════════════════════════════════════════════════
// EMPTY FORM
// ═══════════════════════════════════════════════════════════

const EMPTY_FORM = {
  program_id: '',
  teacher_id: '',
  term: '',
  grade: '',
  class_section: '',
  intake_group: '',
  zone: '',
  day_of_week: 1,
  start_time: '08:00',
  end_time: '09:00',
  max_students: 30,
  status: 'draft',
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface DeskContext {
  tenantId: string;
}

export default function OfficeDeskClassInstancesPage() {
  const { tenantId } = useOutletContext<DeskContext>();
  const [instances, setInstances] = useState<ClassInstance[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('office_desk.class_instances')
        .select(`
          *,
          program:school_desk.programs(title),
          teacher:profiles(name)
        `)
        .eq('tenant_id', tenantId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (filter) {
        query = query.or(`grade.ilike.%${filter}%,class_section.ilike.%${filter}%,term.ilike.%${filter}%`);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Failed to fetch class instances:', error);
        return;
      }
      setInstances((data as unknown as ClassInstance[]) || []);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filter, statusFilter]);

  const fetchPrograms = useCallback(async () => {
    const { data } = await supabase
      .from('school_desk.programs')
      .select('id, title')
      .order('title');
    setPrograms((data as Program[]) || []);
  }, []);

  useEffect(() => {
    fetchInstances();
    fetchPrograms();
  }, [fetchInstances, fetchPrograms]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(instance: ClassInstance) {
    setForm({
      program_id: instance.program_id,
      teacher_id: instance.teacher_id || '',
      term: instance.term,
      grade: instance.grade,
      class_section: instance.class_section,
      intake_group: instance.intake_group || '',
      zone: instance.zone || '',
      day_of_week: instance.day_of_week,
      start_time: instance.start_time,
      end_time: instance.end_time,
      max_students: instance.max_students,
      status: instance.status,
    });
    setEditingId(instance.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.program_id || !form.term || !form.grade || !form.class_section) {
      alert('Program, Term, Grade, and Class Section are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        program_id: form.program_id,
        teacher_id: form.teacher_id || null,
        term: form.term,
        grade: form.grade,
        class_section: form.class_section,
        intake_group: form.intake_group || null,
        zone: form.zone || null,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        max_students: form.max_students,
        status: form.status,
      };

      if (editingId) {
        const { error } = await supabase
          .from('office_desk.class_instances')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('office_desk.class_instances')
          .insert(payload);
        if (error) throw error;
      }

      setShowForm(false);
      fetchInstances();
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this class instance?')) return;
    const { error } = await supabase
      .from('office_desk.class_instances')
      .delete()
      .eq('id', id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    fetchInstances();
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Class Instances</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search grade, section, term..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-48"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={openCreate}
              className="bg-[#273946] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-[#112430]"
            >
              + New Class
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {instances.length} class instance(s)
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Class Instance' : 'New Class Instance'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                  <select
                    value={form.program_id}
                    onChange={(e) => setForm({ ...form, program_id: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="">Select program</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                  <input
                    type="text"
                    value={form.term}
                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                    placeholder="e.g. Term 1 2026"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                  <input
                    type="text"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    placeholder="e.g. Grade 8"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Section *</label>
                  <input
                    type="text"
                    value={form.class_section}
                    onChange={(e) => setForm({ ...form, class_section: e.target.value })}
                    placeholder="e.g. 8A"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intake Group</label>
                  <input
                    type="text"
                    value={form.intake_group}
                    onChange={(e) => setForm({ ...form, intake_group: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                  <input
                    type="text"
                    value={form.zone}
                    onChange={(e) => setForm({ ...form, zone: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={form.day_of_week}
                    onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    value={form.max_students}
                    onChange={(e) => setForm({ ...form, max_students: parseInt(e.target.value) || 30 })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-[#273946] text-white rounded hover:bg-[#112430] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      ) : instances.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No class instances found. Create one to get started.
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium">Program</th>
                <th className="text-left p-3 font-medium">Grade</th>
                <th className="text-left p-3 font-medium">Section</th>
                <th className="text-left p-3 font-medium">Schedule</th>
                <th className="text-left p-3 font-medium">Term</th>
                <th className="text-left p-3 font-medium">Students</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {instances.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{inst.program?.title || '—'}</td>
                  <td className="p-3">{inst.grade}</td>
                  <td className="p-3">{inst.class_section}</td>
                  <td className="p-3">
                    <div className="text-xs">{DAYS[inst.day_of_week]}</div>
                    <div className="text-xs text-gray-500">
                      {formatTime(inst.start_time)} – {formatTime(inst.end_time)}
                    </div>
                  </td>
                  <td className="p-3 text-xs">{inst.term}</td>
                  <td className="p-3">
                    <span className="text-xs">
                      {inst.current_students}/{inst.max_students}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inst.status] || 'bg-gray-100'}`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(inst)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(inst.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
