import { useEffect, useMemo, useState, useCallback } from 'react';
import { analytics } from '../services/analytics';
import { apiV2 } from '../services/apiV2';
import { migrateLocalToDb } from '../services/migrateLocalToDb';
import type { HistoryItem } from '../types';

interface HistorySidebarProps {
  open: boolean;
  onClose: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
  onEditFromHistory: (item: HistoryItem) => void;
}

const downloadFile = ({ content, filename, mime }: { content: string; filename: string; mime: string }) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function HistorySidebar({
  open,
  onClose,
  onSelectHistoryItem,
  onEditFromHistory,
}: HistorySidebarProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiV2.history.list({
        provider: provider || undefined,
        q: query || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 500,
      });
      if (response && response.data && Array.isArray(response.data)) {
        setItems(response.data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, provider, query, dateFrom, dateTo]);

  const providers = useMemo(() => {
    const set = new Set(items.map((x) => x.provider));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return items.filter((x) => {
      if (provider && x.provider !== provider) return false;
      const ts = new Date(x.created_at || x.createdAt || '').getTime();
      if (fromMs != null && ts < fromMs) return false;
      if (toMs != null && ts > toMs) return false;

      if (!q) return true;
      const userInput = x.user_input || x.userInput || '';
      const generatedPrompt = x.generated_prompt || x.generatedPrompt || '';
      return (
        userInput.toLowerCase().includes(q) ||
        generatedPrompt.toLowerCase().includes(q) ||
        (x.model || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, provider, dateFrom, dateTo]);

  const handleExport = (format: 'json' | 'txt' | 'csv') => {
    const { content, filename, mime } = analytics.exportHistory(format, items);
    downloadFile({ content, filename, mime });
  };

  const handleMigrate = async () => {
    if (!confirm('Migrate localStorage history/templates to SQLite DB?')) return;
    const h = await migrateLocalToDb.migrateHistory();
    const t = await migrateLocalToDb.migrateTemplates();
    migrateLocalToDb.clearLocal();
    alert(`Migration done. History: ${h.migrated}, Templates: ${t.migrated}`);
    await refresh();
  };

  const handleClear = async () => {
    if (confirm('Clear all history in DB?')) {
      try {
        await apiV2.history.clear();
        await refresh();
      } catch (err) {
        console.error('Failed to clear history:', err);
        alert('Failed to clear history');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiV2.history.remove(id);
      await refresh();
    } catch (err) {
      console.error('Failed to delete history item:', err);
      alert('Failed to delete history item');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-space-800 text-white shadow-xl flex flex-col border-l border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Prompt History</h2>
            <p className="text-xs text-white/60">Stored in backend SQLite (this device)</p>
          </div>
          <button className="btn-secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-white/10">
          <input
            className="input-field"
            placeholder="Search keyword, model, prompt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select className="select-field" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="">All providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button type="button" className="btn-secondary w-full" onClick={() => { setProvider(''); setQuery(''); setDateFrom(''); setDateTo(''); }}>
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-field"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              className="input-field"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={handleMigrate}>
              Migrate from localStorage
            </button>
            <button type="button" className="btn-secondary" onClick={() => handleExport('json')}>Export JSON</button>
            <button type="button" className="btn-secondary" onClick={() => handleExport('txt')}>Export TXT</button>
            <button type="button" className="btn-secondary" onClick={() => handleExport('csv')}>Export CSV</button>
            <button type="button" className="btn-secondary" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-6 text-sm text-white/70">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-white/70">No history items match your filters.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((x) => (
                <li key={x.id} className="p-4 hover:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-white/60">
                        {new Date(x.created_at || x.createdAt || '').toLocaleString()} • {x.provider} • {x.model}
                      </div>
                      <div className="text-sm font-medium text-white truncate">
                        {(x.user_input || x.userInput || '').slice(0, 120) || '(no input)'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('View clicked:', x.id);
                          onSelectHistoryItem(x);
                        }}
                      >
                        View
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Edit clicked:', x.id);
                          onEditFromHistory(x);
                        }}
                      >
                        Edit/Regenerate
                      </button>
                      <button type="button" className="btn-secondary" onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(x.id);
                      }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
