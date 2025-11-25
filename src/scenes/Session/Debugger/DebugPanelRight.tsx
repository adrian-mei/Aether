'use client';

import { useState, useEffect, useRef } from 'react';
import { logger, LogEntry } from '@/shared/lib/logger';
import { Search, Trash2, Copy, Check, ChevronRight, ChevronDown, Filter, Zap, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { useSession } from '../Session.context';

import { Loader2 } from 'lucide-react';

export function DebugPanelRight() {
  // Fix: Only destructure properties that exist in the current session context state
  const { state: { isMobileFlow } } = useSession();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // Lazy init state from localStorage
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

  useEffect(() => {
    localStorage.setItem('debug_verbose', String(showVerbose));
  }, [showVerbose]);

  // Auto-scroll to bottom
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
      const dataStr = l.data ? ` ${typeof l.data === 'object' ? JSON.stringify(l.data, null, 2) : String(l.data)}` : '';
      return `[${time}] [${l.category}] [${l.level.toUpperCase()}] ${l.message}${dataStr}`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="absolute right-6 top-24 bottom-24 w-[32rem] bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-right-4 hidden md:flex shadow-2xl">
      {/* Toolbar */}
      <div className="p-3 border-b border-white/5 bg-[#252526]/50 flex items-center justify-between gap-3">
        <div className="flex items-center bg-[#1a1a1a] rounded-lg px-3 py-1.5 border border-white/5 focus-within:border-indigo-500/50 flex-1 transition-all">
            <Search size={14} className="text-gray-500 mr-2" />
            <input 
                type="text" 
                placeholder="Filter logs..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-gray-200 placeholder-gray-600 font-mono"
            />
        </div>
        
        <div className="flex items-center gap-1">
            {/* Flow Mode Indicator */}
            <div 
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wider border ${
                    isMobileFlow 
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}
                title={isMobileFlow ? "Mobile Flow (Buffered Audio + Relaxed VAD)" : "Desktop Flow (Streaming Audio + Fast VAD)"}
            >
                {isMobileFlow ? <Smartphone size={12} /> : <Monitor size={12} />}
            </div>

            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            {/* Voice Mode Toggle Removed (Not in UI-only mode) */}

            <button 
                onClick={() => setShowVerbose(!showVerbose)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider transition-colors ${
                  showVerbose
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                    : 'text-gray-500 border border-transparent hover:bg-white/5'
                }`}
                title="Toggle Verbose Logging"
            >
                <Filter size={12} />
                {showVerbose ? 'ALL' : 'IMP'}
            </button>
            
            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            <button 
                onClick={handleCopyLogs} 
                className={`p-1.5 rounded-md transition-colors ${isCopied ? 'text-green-400 bg-green-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} 
                title="Copy Logs"
            >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            
            <button 
                onClick={clearLogs} 
                className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" 
                title="Clear Logs"
            >
                <Trash2 size={14} />
            </button>
        </div>
      </div>

      {/* Log List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs bg-[#1e1e1e]/50"
      >
        {getFilteredLogs().length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
            <Activity size={24} className="opacity-20" />
            <span className="text-xs">{filterText ? 'No matching logs found' : 'Waiting for activity...'}</span>
          </div>
        )}
        
        {getFilteredLogs().map((log, i) => (
          <LogItem key={i} log={log} />
        ))}
      </div>
    </div>
  );
}

import { Activity } from 'lucide-react';

function LogItem({ log }: { log: LogEntry }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasData = !!log.data;
    
    // Modernized Colors
    const getCategoryColor = (cat: string) => {
        switch(cat) {
            case 'VOICE': return 'text-orange-300'; 
            case 'AI': return 'text-blue-300'; 
            case 'APP': return 'text-emerald-300'; 
            case 'SESSION': return 'text-purple-300'; 
            default: return 'text-gray-400';
        }
    };

    const messageColor = log.level === 'error' ? 'text-red-400' : 
                         log.level === 'warn' ? 'text-yellow-400' : 
                         'text-gray-300';

    return (
        <div className={`group rounded px-2 py-1 transition-colors ${isExpanded ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
            <div 
                className="flex items-start gap-3 cursor-pointer select-none"
                onClick={() => hasData && setIsExpanded(!isExpanded)}
            >
                {/* Timestamp */}
                <span className="text-gray-600 text-[10px] pt-0.5 shrink-0 w-16 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>

                {/* Category Indicator */}
                <div className={`shrink-0 w-16 font-bold text-[10px] tracking-wide pt-0.5 ${getCategoryColor(log.category)}`}>
                    {log.category}
                </div>

                {/* Message */}
                <div className={`flex-1 break-words leading-relaxed ${messageColor}`}>
                    {log.message}
                </div>

                {/* Expand Icon */}
                {hasData && (
                    <span className={`shrink-0 pt-1 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown size={12} />
                    </span>
                )}
            </div>

            {/* Data View */}
            {hasData && isExpanded && (
                <div className="mt-2 mb-1 ml-[5.5rem] mr-2">
                    <pre className="text-blue-200/80 bg-black/30 p-3 rounded-lg border border-white/5 text-[10px] leading-relaxed whitespace-pre-wrap break-all shadow-inner">
                        {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : String(log.data)}
                    </pre>
                </div>
            )}
        </div>
    );
}
