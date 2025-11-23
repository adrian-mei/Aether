'use client';

import { Network, MessageSquare, Activity, Mic, Shield, Database, Coins, Loader2, Zap, Sparkles } from 'lucide-react';
import { VoiceInteractionState } from '@/features/voice/hooks/core/use-voice-interaction';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus, VoiceMode } from '@/features/session/hooks/use-session-manager';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';
import type { TokenUsage } from '@/features/ai/types/chat.types';

interface DebugPanelLeftProps {
  voiceState: VoiceInteractionState;
  permissionStatus: PermissionStatus;
  sessionStatus: SessionStatus;
  modelCacheStatus: ModelCacheStatus;
  tokenUsage?: TokenUsage;
  voiceMode?: VoiceMode;
  isDownloadingNeural?: boolean;
  onToggleVoiceMode?: () => void;
  onTestApi: () => void;
  onSimulateInput: (text: string) => void;
}

export function DebugPanelLeft({
  voiceState,
  permissionStatus,
  sessionStatus,
  modelCacheStatus,
  tokenUsage,
  voiceMode,
  isDownloadingNeural,
  onToggleVoiceMode,
  onTestApi,
  onSimulateInput
}: DebugPanelLeftProps) {
  return (
    <div className="fixed inset-4 z-50 md:absolute md:left-6 md:top-24 md:bottom-24 md:w-64 md:inset-auto bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-4 md:slide-in-from-left-4 shadow-2xl">
      {/* Header */}
      <div className="p-3 border-b border-white/5 bg-[#252526]/50">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings & Controls</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Actions Section */}
        <div className="space-y-2">
          <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-wider pl-1">Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            {/* Voice Mode Toggle (Mobile Friendly) */}
            {onToggleVoiceMode && (
                <button
                    onClick={onToggleVoiceMode}
                    disabled={isDownloadingNeural}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        isDownloadingNeural 
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 cursor-wait'
                            : voiceMode === 'neural'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20'
                                : 'bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {isDownloadingNeural ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            voiceMode === 'neural' ? <Sparkles size={14} /> : <Zap size={14} />
                        )}
                        <span>Voice Mode</span>
                    </div>
                    <span className="opacity-75 font-bold tracking-wider text-[10px]">
                        {isDownloadingNeural ? 'DOWNLOADING...' : (voiceMode === 'neural' ? 'NEURAL (HQ)' : 'SYSTEM (LITE)')}
                    </span>
                </button>
            )}

            <button
              onClick={() => onSimulateInput("Hello Aether")}
              className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors border border-transparent hover:border-white/5 group"
            >
              <MessageSquare size={14} className="text-lime-400 opacity-80 group-hover:opacity-100" />
              <span>Simulate {'"Hello"'}</span>
            </button>
            <button
              onClick={onTestApi}
              className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors border border-transparent hover:border-white/5 group"
            >
              <Network size={14} className="text-emerald-400 opacity-80 group-hover:opacity-100" />
              <span>Test API Connection</span>
            </button>
          </div>
        </div>

        {/* State Monitors */}
        <div className="space-y-2">
          <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-wider pl-1">System State</h4>
          
          {/* Session Status */}
          <div className="bg-black/20 rounded-lg p-2.5 space-y-1.5 border border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              <Activity size={10} />
              <span>Session Status</span>
            </div>
            <div className="font-mono text-xs text-green-400 break-words pl-5">
              {sessionStatus}
            </div>
          </div>

          {/* Voice State */}
          <div className="bg-black/20 rounded-lg p-2.5 space-y-1.5 border border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              <Mic size={10} />
              <span>Voice State</span>
            </div>
            <div className="font-mono text-xs text-purple-300 break-words pl-5">
              {voiceState}
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-black/20 rounded-lg p-2.5 space-y-1.5 border border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              <Shield size={10} />
              <span>Permissions</span>
            </div>
            <div className={`font-mono text-xs break-words pl-5 ${
                permissionStatus === 'granted' ? 'text-green-400' : 
                permissionStatus === 'denied' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {permissionStatus}
            </div>
          </div>

          {/* Model Cache */}
          <div className="bg-black/20 rounded-lg p-2.5 space-y-1.5 border border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wide font-bold">
              <Database size={10} />
              <span>Model Cache</span>
            </div>
            <div className={`font-mono text-xs pl-5 ${
                modelCacheStatus === 'cached' ? 'text-green-400' : 
                modelCacheStatus === 'missing' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {modelCacheStatus}
            </div>
          </div>

          {/* Token Usage - Simplified View */}
          {tokenUsage && (
            <div className="bg-black/20 rounded-lg p-2.5 space-y-2 border border-white/5">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wide font-bold">
                <Coins size={10} />
                <span>Resources</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pl-1">
                <div className="flex flex-col">
                   <span className="text-[9px] text-gray-600">Tokens</span>
                   <span className="text-xs font-mono text-indigo-300">
                     {isNaN(tokenUsage.totalTokens) ? 0 : tokenUsage.totalTokens.toLocaleString()}
                   </span>
                </div>
                
                {tokenUsage.cost && (
                  <div className="flex flex-col">
                     <span className="text-[9px] text-gray-600">Est. Cost</span>
                     <span className="text-xs font-mono text-green-400">
                       {tokenUsage.cost}
                     </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
