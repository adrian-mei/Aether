'use client';

import { useState, useEffect, useRef } from 'react';
import { logger, LogEntry } from '@/shared/lib/logger';
import { Search, Trash2, Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';

export function DebugPanelRight() {
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
    <div className="absolute right-4 top-24 bottom-24 w-96 bg-[#1e1e1e] backdrop-blur-md border border-white/10 rounded-lg flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-right-4 hidden md:flex shadow-2xl">
      {/* Toolbar - "Monokai/Sublime" Header Style */}
      <div className="p-2 border-b border-white/5 bg-[#252526] flex items-center justify-between gap-2">
        <div className="flex items-center bg-[#3c3c3c] rounded px-2 py-1 border border-transparent focus-within:border-[#007acc] flex-1 transition-all">
            <Search size={12} className="text-gray-400 mr-2" />
            <input 
                type="text" 
                placeholder="Filter..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] w-full text-gray-200 placeholder-gray-500 font-mono"
            />
        </div>
        
        <div className="flex items-center gap-1">
            <button 
                onClick={() => setShowVerbose(!showVerbose)}
                className={`px-2 py-1 rounded text-[9px] font-bold font-mono border transition-colors ${
                  showVerbose
                    ? 'bg-[#0e639c] text-white border-[#0e639c]' 
                    : 'text-gray-400 border-transparent hover:bg-[#2d2d2d]'
                }`}
            >
                {showVerbose ? 'ALL' : 'IMP'}
            </button>
            
            <button 
                onClick={handleCopyLogs} 
                className={`p-1.5 rounded transition-colors ${isCopied ? 'text-green-400 bg-green-500/10' : 'text-gray-400 hover:text-white hover:bg-[#2d2d2d]'}`} 
                title="Copy Logs"
            >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            
            <button 
                onClick={clearLogs} 
                className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#2d2d2d] transition-colors" 
                title="Clear Logs"
            >
                <Trash2 size={12} />
            </button>
        </div>
      </div>

      {/* Log List - "Code Editor" Look */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-1 space-y-[1px] font-mono text-[10px] bg-[#1e1e1e]"
      >
        {getFilteredLogs().length === 0 && (
          <div className="text-gray-500 italic text-center py-8 text-[11px]">
            {filterText ? 'No matching logs' : 'No logs yet'}
          </div>
        )}
        
        {getFilteredLogs().map((log, i) => (
          <LogItem key={i} log={log} />
        ))}
      </div>
    </div>
  );
}

function LogItem({ log }: { log: LogEntry }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasData = !!log.data;
    
    // VS Code / Sublime Inspired Colors
    const timeColor = 'text-[#858585]'; // Comment gray
    
    // Category Colors
    const getCategoryColor = (cat: string) => {
        switch(cat) {
            case 'VOICE': return 'text-[#ce9178]'; // String/Orange
            case 'AI': return 'text-[#569cd6]'; // Keyword/Blue
            case 'APP': return 'text-[#4ec9b0]'; // Class/Teal
            case 'SESSION': return 'text-[#c586c0]'; // Control/Purple
            default: return 'text-[#d4d4d4]'; // Default text
        }
    };

    const messageColor = log.level === 'error' ? 'text-[#f44747]' : // Red
                         log.level === 'warn' ? 'text-[#cca700]' :  // Yellow
                         'text-[#d4d4d4]'; // Default Light

    return (
        <div className="group hover:bg-[#2a2d2e] rounded-sm px-1 py-0.5 transition-colors">
            <div 
                className="flex items-start gap-2 cursor-pointer"
                onClick={() => hasData && setIsExpanded(!isExpanded)}
            >
                {/* Timestamp */}
                <span className={`${timeColor} shrink-0 w-14 select-none`}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>

                {/* Expand Icon */}
                <span className={`shrink-0 w-3 mt-0.5 ${hasData ? 'text-gray-500' : 'opacity-0'}`}>
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </span>

                {/* Category */}
                <span className={`${getCategoryColor(log.category)} shrink-0 w-12 font-bold select-none`}>
                    {log.category}
                </span>

                {/* Message */}
                <div className={`flex-1 break-words ${messageColor}`}>
                    {log.message}
                </div>
            </div>

            {/* Data View - Subline/Expanded */}
            {hasData && isExpanded && (
                <div className="pl-[7.5rem] pr-2 py-1 overflow-x-auto">
                    <pre className="text-[#9cdcfe] bg-[#1e1e1e] p-1 rounded border-l-2 border-[#404040] text-[9px] leading-relaxed whitespace-pre-wrap break-all">
                        {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : String(log.data)}
                    </pre>
                </div>
            )}
        </div>
    );
}
