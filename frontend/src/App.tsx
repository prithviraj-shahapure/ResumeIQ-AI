import React, { useState, useEffect } from 'react';
import { Sparkles, Moon, Sun, History, Trash2, ChevronRight, FileText } from 'lucide-react';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { api } from './services/api';

interface HistoryItem {
  filename: string;
  name: string;
  category: string;
  score: number;
  date: string;
}

export const App: React.FC = () => {
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history and theme on startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
    }
    
    const savedHistory = localStorage.getItem('resume_screener_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  // Sync theme changes with body element classes
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleUploadSuccess = async (filename: string, extractedData: any) => {
    // Attempt to pre-calculate history details
    try {
      const [section, resumeDetails, ats] = await Promise.all([
        api.getOverallScore(filename),
        api.getResumeData(filename),
        api.getAtsRecommendations(filename)
      ]);
      
      const detectedSkills = resumeDetails.filename.skills || [];
      const resumeSectionScore = section.resume_score || 0;
      const formattingScore = Math.max(10, 100 - ats.suggestions.length * 15);
      const skillRichnessScore = Math.min(100, detectedSkills.length * 5);
      const overallScore = Math.round(
        (resumeSectionScore * 0.45) + (formattingScore * 0.35) + (skillRichnessScore * 0.20)
      );

      const newHistoryItem: HistoryItem = {
        filename,
        name: resumeDetails.filename.name || 'Candidate Profile',
        category: resumeDetails.category || 'Software Engineer',
        score: overallScore,
        date: new Date().toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      setHistory(prev => {
        const filtered = prev.filter(item => item.filename !== filename);
        const updated = [newHistoryItem, ...filtered].slice(0, 5); // Keep up to 5 uploads
        localStorage.setItem('resume_screener_history', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Failed to compile history meta:", e);
      // Fallback history item
      const fallbackItem: HistoryItem = {
        filename,
        name: extractedData?.name || 'Resume',
        category: 'Software Developer',
        score: 65,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
      setHistory(prev => {
        const filtered = prev.filter(item => item.filename !== filename);
        const updated = [fallbackItem, ...filtered];
        localStorage.setItem('resume_screener_history', JSON.stringify(updated));
        return updated;
      });
    }

    setCurrentFilename(filename);
  };

  const clearHistoryItem = (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.filename !== filename);
      localStorage.setItem('resume_screener_history', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="no-print w-full glass-panel sticky top-0 z-50 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentFilename(null)}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ResumeIQ AI
          </span>
        </div>

        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-900/60 dark:bg-slate-900/60 light:bg-white border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 hover:scale-105 transition-all text-slate-300 dark:text-slate-300 light:text-slate-700"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-grow py-8 px-4 flex flex-col items-center">
        {currentFilename ? (
          <Dashboard 
            filename={currentFilename} 
            onBack={() => setCurrentFilename(null)} 
          />
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Upload Area */}
            <Home onUploadSuccess={handleUploadSuccess} />

            {/* Local History Section (Non-Printable, shown only when uploader is visible) */}
            {history.length > 0 && (
              <div className="w-full max-w-xl mt-12 px-2">
                <div className="flex items-center gap-2 text-slate-400 mb-4 font-bold text-sm">
                  <History className="w-4 h-4" />
                  <span>Recent Upload History</span>
                </div>
                <div className="space-y-3">
                  {history.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setCurrentFilename(item.filename)}
                      className="glass-card p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-purple-500/30"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900/60 flex items-center justify-center text-slate-400 group-hover:text-purple-400 border border-slate-800/80 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-semibold">
                            <span>{item.category}</span>
                            <span>•</span>
                            <span>{item.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-xs font-extrabold rounded-lg ${
                          item.score >= 80 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                            : item.score >= 50 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                              : 'bg-red-500/10 text-red-400 border border-red-500/15'
                        }`}>
                          {item.score}%
                        </span>
                        <button
                          onClick={(e) => clearHistoryItem(e, item.filename)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print w-full py-6 text-center text-xs text-slate-500 dark:text-slate-500 light:text-slate-400 border-t border-slate-900/40 mt-12">
        <p>© 2026 Resume Evaluator. All rights reserved.</p>
      </footer>
    </div>
  );
};
export default App;
