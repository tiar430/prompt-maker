import { useState, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PromptForm from './components/PromptForm';
import PromptResult from './components/PromptResult';
import HistorySidebar from './components/HistorySidebar';
import TemplateGallery from './components/TemplateGallery';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { apiV2 } from './services/apiV2';
import type { Draft, HistoryItem } from './types';
import './index.css';

function App() {
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('generator');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ provider: '', model: '', userInput: '' });

  const handlePromptGenerated = useCallback((prompt: string) => {
    setGeneratedPrompt(prompt);
    if (draft.provider && draft.model && draft.userInput) {
      apiV2.history.add({
        provider: draft.provider,
        model: draft.model,
        userInput: draft.userInput,
        generatedPrompt: prompt,
        success: true,
      }).catch((err) => {
        console.error('Failed to save to history:', err);
      });
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [draft]);

  const tabs = useMemo(
    () => [
      { id: 'generator', label: 'Generator' },
      { id: 'templates', label: 'Templates' },
      { id: 'analytics', label: 'Analytics' },
    ],
    []
  );

  const handleSelectHistoryItem = useCallback((item: HistoryItem) => {
    setGeneratedPrompt(item.generated_prompt || item.generatedPrompt || '');
  }, []);

  const handleEditFromHistory = useCallback((item: HistoryItem) => {
    setActiveTab('generator');
    setDraft({ 
      provider: item.provider, 
      model: item.model, 
      userInput: item.user_input || item.userInput || '' 
    });
    setHistoryOpen(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }, []);

  const handleDraftChange = useCallback((d: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...d }));
  }, []);

  const handleUseTemplate = useCallback((templateText: string) => {
    setActiveTab('generator');
    setDraft((prev) => ({ ...prev, userInput: templateText }));
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white">
      <Header onOpenHistory={() => setHistoryOpen(true)} />

      <HistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectHistoryItem={handleSelectHistoryItem}
        onEditFromHistory={handleEditFromHistory}
      />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={
                  activeTab === t.id
                    ? 'btn-primary'
                    : 'btn-secondary'
                }
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setHistoryOpen(true)}>
              History
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              How It Works
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Select your preferred AI provider from the dropdown</li>
              <li>Choose the specific model you want to use</li>
              <li>Enter your API key (used for this request only, never stored)</li>
              <li>Describe what kind of prompt you need</li>
              <li>Get a professionally structured prompt ready to use</li>
            </ol>
          </div>

          {activeTab === 'generator' && (
            <>
              <PromptForm
                onPromptGenerated={handlePromptGenerated}
                initialDraft={draft}
                onDraftChange={handleDraftChange}
              />

              {generatedPrompt && <PromptResult prompt={generatedPrompt} />}
            </>
          )}

          {activeTab === 'templates' && (
            <TemplateGallery
              onUseTemplate={handleUseTemplate}
            />
          )}

          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
