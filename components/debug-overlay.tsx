'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger, LogEntry } from '../lib/logger';
import { X, Trash2, Filter, PanelBottom, PanelLeft, PanelRight, Network } from 'lucide-react';

interface DebugOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onTestApi?: () => void;
}

type Position = 'bottom' | 'left' | 'right';

export default function DebugOverlay({ isOpen, onClose, onTestApi }: DebugOverlayProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activePanes, setActivePanes] = useState<string[]>(['VOICE', 'API', 'APP', 'error']);
  const [position, setPosition] = useState<Position>('bottom');
  const [size, setSize] = useState(400); // height for bottom, width for sides
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for auto-scrolling each pane
  const paneRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const setPaneRef = (key: string, el: HTMLDivElement | null) => {
    paneRefs.current[key] = el;
  };

  useEffect(() => {
    // Load preferences
    const savedPos = localStorage.getItem('debug_position') as Position;
    const savedSize = localStorage.getItem('debug_size');
    const savedPanes = localStorage.getItem('debug_panes');
    
    if (savedPos) setPosition(savedPos);
    if (savedSize) setSize(parseInt(savedSize));
    if (savedPanes) {
      try {
        setActivePanes(JSON.parse(savedPanes));
      } catch (e) {
        // ignore invalid json
      }
    }

    // Load initial logs
    setLogs(logger.getLogs());

    // Subscribe to new logs
    const unsubscribe = logger.subscribe((entry) => {
      setLogs((prev) => [...prev, entry]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('debug_position', position);
    localStorage.setItem('debug_size', size.toString());
    localStorage.setItem('debug_panes', JSON.stringify(activePanes));
  }, [position, size, activePanes]);

  // Auto-scroll all active panes
  useEffect(() => {
    Object.values(paneRefs.current).forEach(ref => {
      if (ref) {
        ref.scrollTop = ref.scrollHeight;
      }
    });
  }, [logs, isOpen, activePanes]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    if (position === 'bottom') {
      const newHeight = window.innerHeight - e.clientY;
      setSize(Math.max(200, Math.min(newHeight, window.innerHeight - 100)));
    } else if (position === 'left') {
      setSize(Math.max(200, Math.min(e.clientX, window.innerWidth - 100)));
    } else if (position === 'right') {
      const newWidth = window.innerWidth - e.clientX;
      setSize(Math.max(200, Math.min(newWidth, window.innerWidth - 100)));
    }
  }, [isResizing, position]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResize, handleResizeEnd]);

  if (!isOpen) return null;

  const togglePane = (pane: string) => {
    setActivePanes(prev => 
      prev.includes(pane) 
        ? prev.filter(p => p !== pane)
        : [...prev, pane]
    );
  };

  const getPaneLogs = (pane: string) => {
    return logs.filter(l => l.category === pane || l.level === pane);
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const getContainerStyle = () => {
    const base = "fixed bg-slate-900/95 shadow-2xl backdrop-blur-md z-50 flex flex-col text-xs font-mono text-slate-300";
    switch (position) {
      case 'bottom':
        return `${base} bottom-0 left-0 right-0 border-t border-white/10`;
      case 'left':
        return `${base} top-0 left-0 bottom-0 border-r border-white/10`;
      case 'right':
        return `${base} top-0 right-0 bottom-0 border-l border-white/10`;
    }
  };

  const getResizeHandleStyle = () => {
    const base = "absolute bg-transparent hover:bg-indigo-500/50 transition-colors z-51";
    switch (position) {
      case 'bottom':
        return `${base} top-0 left-0 right-0 h-1 cursor-ns-resize`;
      case 'left':
        return `${base} top-0 right-0 bottom-0 w-1 cursor-ew-resize`;
      case 'right':
        return `${base} top-0 left-0 bottom-0 w-1 cursor-ew-resize`;
    }
  };

  return (
    <div 
      ref={containerRef}
      className={getContainerStyle()}
      style={{ 
        [position === 'bottom' ? 'height' : 'width']: size 
      }}
    >
      {/* Resize Handle */}
      <div 
        className={getResizeHandleStyle()}
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-indigo-400 hidden sm:inline">Aether Debugger</span>
          <span className="font-bold text-indigo-400 sm:hidden">Debug</span>
          
          {/* Position Controls */}
          <div className="flex gap-1 bg-black/20 p-0.5 rounded border border-white/5">
            <button 
              onClick={() => setPosition('left')}
              className={`p-1 rounded hover:bg-white/10 ${position === 'left' ? 'text-indigo-400 bg-white/10' : 'text-slate-500'}`}
              title="Dock Left"
            >
              <PanelLeft size={14} />
            </button>
            <button 
              onClick={() => setPosition('bottom')}
              className={`p-1 rounded hover:bg-white/10 ${position === 'bottom' ? 'text-indigo-400 bg-white/10' : 'text-slate-500'}`}
              title="Dock Bottom"
            >
              <PanelBottom size={14} />
            </button>
            <button 
              onClick={() => setPosition('right')}
              className={`p-1 rounded hover:bg-white/10 ${position === 'right' ? 'text-indigo-400 bg-white/10' : 'text-slate-500'}`}
              title="Dock Right"
            >
              <PanelRight size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {['VOICE', 'API', 'APP', 'error'].map(cat => (
              <button 
                key={cat}
                onClick={() => togglePane(cat)}
                className={`px-2 py-1 rounded whitespace-nowrap text-[10px] font-medium border transition-colors ${
                  activePanes.includes(cat) 
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                    : 'text-slate-500 border-transparent hover:bg-white/5'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pl-2">
          {onTestApi && (
            <button 
              onClick={onTestApi} 
              className="p-1 hover:text-emerald-400 flex items-center gap-1" 
              title="Test API Connection"
            >
              <Network size={14} />
              <span className="text-[10px] font-medium hidden sm:inline">Test API</span>
            </button>
          )}
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button onClick={clearLogs} className="p-1 hover:text-red-400" title="Clear Logs">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Panes Container */}
      <div className={`flex-1 flex overflow-hidden ${position === 'bottom' ? 'flex-row divide-x divide-white/10' : 'flex-col divide-y divide-white/10'}`}>
        {activePanes.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-slate-600 italic">
            Select a category to view logs...
          </div>
        )}
        
        {activePanes.map(pane => {
          const paneLogs = getPaneLogs(pane);
          return (
            <div key={pane} className="flex-1 flex flex-col min-w-0 min-h-0">
              {/* Pane Header */}
              <div className="px-3 py-1 bg-white/5 border-b border-white/5 text-[10px] font-bold text-indigo-300 uppercase tracking-wider sticky top-0">
                {pane}
              </div>
              
              {/* Pane Content */}
              <div 
                ref={el => setPaneRef(pane, el)}
                className="flex-1 overflow-y-auto p-2 space-y-0.5"
              >
                {paneLogs.length === 0 && (
                  <div className="text-slate-700 italic text-center py-4 text-[10px]">Empty</div>
                )}
                {paneLogs.map((log, i) => (
                  <div key={i} className="flex flex-col gap-0.5 hover:bg-white/5 p-1 rounded group">
                    <div className="flex items-baseline gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <span className="text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}
                      </span>
                      {pane === 'error' && (
                         <span className="text-purple-400">[{log.category}]</span>
                      )}
                    </div>
                    <span className={`break-all ${
                      log.level === 'error' ? 'text-red-400' : 
                      log.level === 'warn' ? 'text-amber-400' : 
                      'text-slate-300'
                    }`}>
                      {log.message}
                      {log.data && (
                        <span className="text-slate-500 ml-1 block text-[10px]">
                          {typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
