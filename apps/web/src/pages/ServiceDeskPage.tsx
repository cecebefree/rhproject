import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityLogViewer } from '../components/ActivityLogViewer';
import { AdminLayout } from '../components/AdminLayout';
import {
  type DeskStats,
  type NewsArticle,
  type NewsCreateInput,
  fetchServiceDeskStats,
  createNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
} from '../lib/serviceDeskClient';

export default function ServiceDeskPage() {
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [loading, setLoading] = useState(true);

  // News CRUD state
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [newsForm, setNewsForm] = useState<NewsCreateInput>({
    title: '',
    content: '',
    content_group: 'general',
    category: 'general',
  });
  const [saving, setSaving] = useState(false);

  const refreshStats = () => {
    fetchServiceDeskStats(import.meta.env.VITE_DEFAULT_TENANT_ID)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshStats();
  }, []);

  if (loading)
    return (
      <AdminLayout activeDesk="school-desk">
        <div className="p-8 text-center">Loading...</div>
      </AdminLayout>
    );
  if (!stats)
    return (
      <AdminLayout activeDesk="school-desk">
        <div className="p-8 text-center text-red-600">Failed to load stats</div>
      </AdminLayout>
    );

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

  // ─── NEWS HANDLERS ──────────────────────────────────────────

  const openCreateModal = () => {
    setEditingArticle(null);
    setNewsForm({ title: '', content: '', content_group: 'general', category: 'general' });
    setShowNewsModal(true);
  };

  const openEditModal = (article: NewsArticle) => {
    setEditingArticle(article);
    setNewsForm({
      title: article.title,
      content: article.content,
      content_group: article.content_group,
      category: article.category,
    });
    setShowNewsModal(true);
  };

  const handleSaveNews = async () => {
    if (!newsForm.title.trim() || !newsForm.content.trim()) return;
    setSaving(true);

    try {
      if (editingArticle) {
        await updateNewsArticle({ ...newsForm, id: editingArticle.id });
      } else {
        await createNewsArticle(import.meta.env.VITE_DEFAULT_TENANT_ID, newsForm);
      }
      setShowNewsModal(false);
      refreshStats();
    } catch (err) {
      console.error('Failed to save news:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!window.confirm('Delete this article?')) return;
    const { error } = await deleteNewsArticle(id);
    if (!error) refreshStats();
  };

  return (
    <AdminLayout activeDesk="school-desk">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}
        >
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
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '24px', color: '#E8A020' }}
              >
                {desk.icon}
              </span>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#1A242B' }}>
                  {desk.label}
                </h3>
                <p className="text-xs" style={{ color: '#54626C' }}>
                  {desk.desc}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {desk.stats.map((stat) => (
                <div key={stat.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#54626C' }}>
                    {stat.label}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#1A242B' }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* School News — Unified newsletter for all desks */}
      <div className="mt-8 p-5 rounded-xl" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
            School Newsletters
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E8A020', color: '#1A242B', fontWeight: 600 }}>
              All Desks
            </span>
            <button
              onClick={openCreateModal}
              className="text-xs px-3 py-1 rounded font-medium transition-colors"
              style={{ backgroundColor: '#1A242B', color: '#ffffff' }}
            >
              + Add Article
            </button>
          </div>
        </div>
        {stats.news?.loading ? (
          <div className="p-4 text-center" style={{ color: '#54626C' }}>
            Loading newsletters...
          </div>
        ) : stats.news?.articles?.length > 0 ? (
          <div className="space-y-3">
            {stats.news.articles.map((article) => (
              <div
                key={article.id}
                className="p-4 rounded-lg transition-colors cursor-pointer hover:shadow-sm"
                style={{ backgroundColor: '#F8F7F4', border: '1px solid rgba(195,199,204,0.3)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate" style={{ color: '#1A242B' }}>
                        {article.title}
                      </h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          backgroundColor: article.content_group === 'junior' ? '#E8F5E9' :
                                         article.content_group === 'senior' ? '#E3F2FD' : '#FFF3E0',
                          color: article.content_group === 'junior' ? '#2E7D32' :
                                article.content_group === 'senior' ? '#1565C0' : '#E65100',
                          fontWeight: 500,
                        }}
                      >
                        {article.content_group === 'general' ? 'All Stages' :
                         article.content_group === 'junior' ? 'Junior' : 'Senior'}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          backgroundColor: '#F3E5F5',
                          color: '#7B1FA2',
                          fontWeight: 500,
                        }}
                      >
                        {article.category === 'general' ? 'General' :
                         article.category === 'school_desk' ? 'School Desk' :
                         article.category === 'student_body' ? 'Student Body' :
                         article.category === 'schoolboard' ? 'Schoolboard' :
                         article.category === 'hub' ? 'Hub' : article.category}
                      </span>
                    </div>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: '#54626C' }}>
                      {article.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs" style={{ color: '#54626C' }}>
                        {new Date(article.published_at ?? article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(article)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#54626C' }}>edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteNews(article.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#DC3545' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center" style={{ color: '#54626C' }}>
            No school newsletters published yet.
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <ActivityLogViewer limit={20} />

      {/* News Create/Edit Modal */}
      {showNewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="w-full max-w-lg rounded-xl shadow-xl p-6"
            style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.3)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: '"EB Garamond", serif', color: '#1A242B' }}>
              {editingArticle ? 'Edit Article' : 'New Article'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>Title</label>
                <input
                  type="text"
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: '#C7C7CC', color: '#1A242B' }}
                  placeholder="Article title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>Content</label>
                <textarea
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: '#C7C7CC', color: '#1A242B' }}
                  rows={4}
                  placeholder="Article content"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>Stage</label>
                  <select
                    value={newsForm.content_group}
                    onChange={(e) => setNewsForm({ ...newsForm, content_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#C7C7CC', color: '#1A242B' }}
                  >
                    <option value="general">All Stages</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#54626C' }}>Category</label>
                  <select
                    value={newsForm.category}
                    onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: '#C7C7CC', color: '#1A242B' }}
                  >
                    <option value="general">General</option>
                    <option value="school_desk">School Desk</option>
                    <option value="student_body">Student Body</option>
                    <option value="schoolboard">Schoolboard</option>
                    <option value="hub">Hub</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowNewsModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: '#54626C' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNews}
                disabled={saving || !newsForm.title.trim() || !newsForm.content.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#1A242B', color: '#ffffff' }}
              >
                {saving ? 'Saving...' : editingArticle ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
