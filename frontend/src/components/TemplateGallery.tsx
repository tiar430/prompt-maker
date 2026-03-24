import { useEffect, useMemo, useState, useCallback } from 'react';
import { apiV2, type Template } from '../services/apiV2';

const CATEGORIES = [
  'Content Writing',
  'Code Review',
  'Data Analysis',
  'Creative Writing',
  'Business',
  'Education',
  'Database',
  'Financing',
];

interface TemplateGalleryProps {
  onUseTemplate: (templateText: string) => void;
}

interface NewTemplate {
  name: string;
  category: string;
  tags: string;
  prompt: string;
}

export default function TemplateGallery({ onUseTemplate }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTpl, setNewTpl] = useState<NewTemplate>({ name: '', category: 'Content Writing', tags: '', prompt: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiV2.templates.list();
      setTemplates(res.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tags = typeof templates[0]?.tags === 'string' 
      ? (t: Template) => (t.tags || '').toLowerCase()
      : (t: Template) => ((t.tags as unknown as string[]) || []).join(' ').toLowerCase();
    
    return templates.filter((t) => {
      if (category && t.category !== category) return false;
      if (!q) return true;
      const tagStr = typeof t.tags === 'string' ? t.tags : (t.tags as unknown as string[])?.join(' ') || '';
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.prompt || '').toLowerCase().includes(q) ||
        tagStr.toLowerCase().includes(q)
      );
    });
  }, [templates, query, category]);

  const saveNew = async () => {
    if (!newTpl.name.trim() || !newTpl.prompt.trim()) return;
    await apiV2.templates.upsert({
      name: newTpl.name.trim(),
      category: newTpl.category,
      tags: newTpl.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      prompt: newTpl.prompt,
      is_public: false,
    });
    await refresh();
    setShowCreate(false);
    setNewTpl({ name: '', category: 'Content Writing', tags: '', prompt: '' });
  };

  const handleRate = async (id: string, rating: number) => {
    await apiV2.templates.rate({ template_id: id, rating });
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this custom template?')) {
      await apiV2.templates.remove(id);
      await refresh();
    }
  };

  const getTagsString = (t: Template): string => {
    if (typeof t.tags === 'string') return t.tags;
    const arr = t.tags as unknown as string[];
    return arr?.length ? arr.join(', ') : '-';
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg shadow-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Template Library</h2>
          <p className="text-sm text-white/70">Pick a template, preview it, and apply to your prompt input.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Close' : 'Create Template'}
        </button>
      </div>

      {showCreate && (
        <div className="border border-white/10 rounded-lg p-4 mb-6 bg-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Template name"
              value={newTpl.name}
              onChange={(e) => setNewTpl((p) => ({ ...p, name: e.target.value }))}
            />
            <select
              className="select-field"
              value={newTpl.category}
              onChange={(e) => setNewTpl((p) => ({ ...p, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <input
            className="input-field mt-3"
            placeholder="Tags (comma separated)"
            value={newTpl.tags}
            onChange={(e) => setNewTpl((p) => ({ ...p, tags: e.target.value }))}
          />
          <textarea
            className="input-field mt-3 min-h-32"
            placeholder="Template prompt (use placeholders like {topic}, {code}, {context})"
            value={newTpl.prompt}
            onChange={(e) => setNewTpl((p) => ({ ...p, prompt: e.target.value }))}
          />
          <div className="flex gap-2 mt-3">
            <button type="button" className="btn-primary" onClick={saveNew}>
              Save
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <input
          className="input-field"
          placeholder="Search templates by name, tag, or content"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-white/70">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-white/70">No templates found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="border border-white/10 rounded-lg p-4 hover:shadow-sm transition-shadow bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{t.name}</div>
                  <div className="text-xs text-white/60">{t.category}</div>
                  <div className="text-xs text-white/60 mt-1">
                    Tags: {getTagsString(t)}
                  </div>
                </div>
                <div className="text-xs text-white/70 whitespace-nowrap">
                  Rating: {t.rating ?? '—'}
                </div>
              </div>

              <div className="mt-3 bg-white/5 border border-white/10 rounded p-3">
                <pre className="text-xs whitespace-pre-wrap text-white/80 font-mono">
                  {(t.prompt || '').slice(0, 300)}{t.prompt && t.prompt.length > 300 ? '…' : ''}
                </pre>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <button type="button" className="btn-primary" onClick={() => onUseTemplate(t.prompt)}>
                  Use
                </button>

                {t.is_public && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/60">Rate:</span>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="btn-secondary px-2 py-1"
                        onClick={() => handleRate(t.id, r)}
                        title={`Rate ${r}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {!t.is_public && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDelete(t.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
