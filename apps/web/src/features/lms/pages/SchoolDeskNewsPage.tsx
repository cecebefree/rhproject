// SchoolDeskNewsPage — School news with category tabs: Junior, Senior, Staff, Adult, General
// Only enrolled profiles can be targeted

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseUntyped as supabase } from '../services/supabase';
import {
  type News,
  type NewsCategory,
  NEWS_CATEGORY_LABELS,
  NEWS_CATEGORY_COLORS,
  selectNews,
} from '../services/supabase';
import { NewsForm } from '../components/NewsForm';

const CATEGORIES: NewsCategory[] = ['general_news', 'junior_news', 'senior_news', 'staff_news', 'adult_news'];

export default function SchoolDeskNewsPage() {
  const { deskId } = useParams<{ deskId: string }>();
  const tenantId = deskId || import.meta.env.VITE_DEFAULT_TENANT_ID;

  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');

  // Compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await selectNews(tenantId, search || undefined, {
      category: activeCategory === 'all' ? undefined : activeCategory,
    });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setNews((data ?? []) as News[]);
    }
    setLoading(false);
  }, [tenantId, search, activeCategory]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('school-news-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'school_desk', table: 'news', filter: `tenant_id=eq.${tenantId}` },
        () => { fetchNews(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchNews]);

  function handleEditNews(item: News) {
    setEditingNews(item);
    setShowCompose(true);
  }

  function handleComposeSuccess() {
    setShowCompose(false);
    setEditingNews(null);
    fetchNews();
  }

  const filteredNews = activeCategory === 'all'
    ? news
    : news.filter((n) => n.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">School News</h1>
              <p className="mt-1 text-sm text-gray-500">Send news to Junior, Senior, Staff, Adult, or General audiences</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="px-4 py-2 bg-[#273946] text-white rounded text-sm font-medium hover:bg-[#112430]"
            >
              + Compose News
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeCategory === 'all'
                  ? 'border-[#E8A020] text-[#273946]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All News
            </button>
            {CATEGORIES.map((cat) => {
              const colors = NEWS_CATEGORY_COLORS[cat];
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-[#E8A020] text-[#273946]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: colors.text }}
                  />
                  {NEWS_CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <input
          type="text"
          placeholder="Search news..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#E8A020] focus:border-transparent"
        />
      </div>

      {/* News List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading news...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">Error: {error}</div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No news articles {activeCategory !== 'all' ? `in ${NEWS_CATEGORY_LABELS[activeCategory]}` : ''}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNews.map((item) => {
              const colors = NEWS_CATEGORY_COLORS[item.category] || NEWS_CATEGORY_COLORS.general_news;
              return (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-1 text-xs font-semibold rounded-full"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {NEWS_CATEGORY_LABELS[item.category] || 'General'}
                        </span>
                        {item.target_audience && !item.target_audience.includes('all') && (
                          <span className="text-xs text-gray-500">
                            → {item.target_audience.join(', ')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{item.content}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                        <span>Published {new Date(item.published_at || item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShowCompose(false); setEditingNews(null); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6">
            <NewsForm
              tenantId={tenantId}
              userId={userId}
              news={editingNews}
              onSuccess={handleComposeSuccess}
              onCancel={() => { setShowCompose(false); setEditingNews(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
