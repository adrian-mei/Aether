'use client';

import { useState, useEffect, useRef } from 'react';
import { logger, LogEntry } from '@/shared/lib/logger';
import { Search, Trash2, Copy, Check } from 'lucide-react';

export function DebugPanelRight() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // Lazy init state from localStorage (safe because this component is only mounted on client when debug mode is active)
  const [showVerbose, setShowVerbose] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('debug_verbose') === 'true';
    }
    return false;
  });
  const [filterText, setFilterText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleNewLog = () => {
        setLogs([...logger.getLogs()]);
    };
    handleNewLog();
    const unsubscribe = logger.subscribe(handleNewLog);
    return () => unsubscribe();
  }, []);

  // Persist verbose setting
  useEffect(() => {
    localStorage.setItem('debug_verbose', String(showVerbose));
  }, [showVerbose]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, showVerbose]);

  const getFilteredLogs = () => {
    return logs.filter(l => {
      if (!showVerbose) {
          const isImportant = 
            l.level === 'error' || 
            l.level === 'warn' || 
            l.category === 'APP' || 
            l.category === 'API' ||
            l.message.includes('State');
          
          if (!isImportant) return false;
      }

      if (!filterText) return true;
      const content = `${l.category} ${l.message} ${JSON.stringify(l.data || '')}`.toLowerCase();
      return content.includes(filterText.toLowerCase());
    });
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const handleCopyLogs = () => {
    const filtered = getFilteredLogs();
    const text = filtered.map(l => {
      const time = new Date(l.timestamp).toLocaleTimeString();
      const dataStr = l.data ? ` ${typeof l.data === 'object' ? JSON.stringify(l.data) : String(l.data)}` : '';
      return `[${time}] [${l.category}] [${l.level.toUpperCase()}] ${l.message}${dataStr}`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="absolute right-4 top-24 bottom-24 w-80 bg-black/20 backdrop-blur-sm border border-white/5 rounded-lg flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-right-4 hidden md:flex">
      {/* Toolbar */}
      <div className="p-2 border-b border-white/5 bg-black/20 flex items-center justify-between gap-2">
        <div className="flex items-center bg-black/20 rounded px-2 py-1 border border-white/5 flex-1">
            <Search size={12} className="text-slate-500 mr-2" />
            <input 
                type="text" 
                placeholder="Filter logs..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] w-full text-slate-300 placeholder-slate-600 transition-all"
            />
        </div>
        
        <div className="flex items-center gap-1">
            <button 
                onClick={() => setShowVerbose(!showVerbose)}
                className={`px-2 py-1 rounded text-[9px] font-medium border transition-colors ${
                  showVerbose
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                    : 'text-slate-500 border-transparent hover:bg-white/5'
                }`}
            >
                {showVerbose ? 'ALL' : 'IMP'}
            </button>
            
            <button 
                onClick={handleCopyLogs} 
                className={`p-1.5 rounded transition-colors ${isCopied ? 'text-green-400 bg-green-500/10' : 'text-slate-500 hover:text-blue-400 hover:bg-white/5'}`} 
                title="Copy Logs"
            >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            
            <button 
                onClick={clearLogs} 
                className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors" 
                title="Clear Logs"
            >
                <Trash2 size={12} />
            </button>
        </div>
      </div>

      {/* Log List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5"
      >
        {getFilteredLogs().length === 0 && (
          <div className="text-slate-600 italic text-center py-8 text-[10px]">
            {filterText ? 'No matching logs' : 'No logs yet'}
          </div>
        )}
        
        {getFilteredLogs().map((log, i) => (
          <div key={i} className="flex items-start gap-2 hover:bg-white/5 p-1 rounded group text-[10px] leading-tight font-mono transition-colors">
             <span className="text-slate-600 shrink-0 w-12 text-[9px] pt-0.5">
                {new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}
             </span>
             
             <span className={`shrink-0 w-10 text-center font-bold rounded px-1 py-0.5 text-[8px] uppercase ${
                 log.category === 'VOICE' ? 'bg-purple-900/30 text-purple-400' :
                 log.category === 'API' ? 'bg-blue-900/30 text-blue-400' :
                 log.category === 'APP' ? 'bg-green-900/30 text-green-400' :
                 'bg-slate-800 text-slate-400'
             }`}>
                 {log.category}
             </span>

             <div className="flex-1 min-w-0 break-words">
                <span className={`${
                  log.level === 'error' ? 'text-red-400 font-bold' : 
                  log.level === 'warn' ? 'text-amber-400' : 
                  'text-slate-300'
                }`}>
                  {log.message}
                </span>
                {!!log.data && (
                  <div className="text-slate-500 mt-0.5 pl-2 border-l border-slate-700/50 overflow-hidden text-ellipsis whitespace-nowrap group-hover:whitespace-normal">
                    {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
