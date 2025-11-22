'use client';

import { Network, MessageSquare, Activity, Mic, Shield, Database } from 'lucide-react';
import { VoiceAgentState } from '@/features/voice/hooks/use-voice-agent';
import { PermissionStatus } from '@/features/voice/utils/permissions';
import { SessionStatus } from '@/features/session/hooks/use-session-manager';
import { ModelCacheStatus } from '@/features/voice/utils/model-cache';
<<<<<<< Updated upstream
=======
import type { TokenUsage } from '@/features/ai/types/chat.types';
>>>>>>> Stashed changes

interface DebugPanelLeftProps {
  voiceState: VoiceAgentState;
  permissionStatus: PermissionStatus;
  sessionStatus: SessionStatus;
  modelCacheStatus: ModelCacheStatus;
<<<<<<< Updated upstream
=======
  tokenUsage?: TokenUsage;
>>>>>>> Stashed changes
  onTestApi: () => void;
  onSimulateInput: (text: string) => void;
}

export function DebugPanelLeft({
  voiceState,
  permissionStatus,
  sessionStatus,
  modelCacheStatus,
<<<<<<< Updated upstream
=======
  tokenUsage,
>>>>>>> Stashed changes
  onTestApi,
  onSimulateInput
}: DebugPanelLeftProps) {
  return (
    <div className="absolute left-4 top-24 bottom-24 w-64 bg-black/20 backdrop-blur-sm border border-white/5 rounded-lg flex flex-col overflow-hidden transition-all duration-300 animate-in slide-in-from-left-4 hidden md:flex">
      {/* Header */}
      <div className="p-3 border-b border-white/5 bg-black/20">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Controls & State</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Actions Section */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase">Actions</h4>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onSimulateInput("Hello Aether")}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-300 transition-colors"
            >
              <MessageSquare size={14} className="text-lime-400" />
              <span>Simulate {'"Hello"'}</span>
            </button>
            <button
              onClick={onTestApi}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-300 transition-colors"
            >
              <Network size={14} className="text-emerald-400" />
              <span>Test API Connection</span>
            </button>
          </div>
        </div>

        {/* State Monitors */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase">System State</h4>
          
          {/* Session Status */}
          <div className="bg-black/20 rounded p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Activity size={12} />
              <span>Session Status</span>
            </div>
<<<<<<< Updated upstream
            <div className="font-mono text-xs text-indigo-300 break-words">
=======
            <div className="font-mono text-xs text-green-400 break-words">
>>>>>>> Stashed changes
              {sessionStatus}
            </div>
          </div>

          {/* Voice State */}
          <div className="bg-black/20 rounded p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mic size={12} />
              <span>Voice State</span>
            </div>
            <div className="font-mono text-xs text-purple-300 break-words">
              {voiceState}
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-black/20 rounded p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield size={12} />
              <span>Permissions</span>
            </div>
            <div className={`font-mono text-xs break-words ${
                permissionStatus === 'granted' ? 'text-green-400' : 
                permissionStatus === 'denied' ? 'text-red-400' : 'text-amber-400'
            }`}>
              {permissionStatus}
            </div>
          </div>

          {/* Model Cache */}
          <div className="bg-black/20 rounded p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Database size={12} />
              <span>Model Cache</span>
            </div>
            <div className={`font-mono text-xs ${
                modelCacheStatus === 'cached' ? 'text-green-400' : 
                modelCacheStatus === 'missing' ? 'text-red-400' : 'text-slate-400'
            }`}>
              {modelCacheStatus}
            </div>
          </div>
<<<<<<< Updated upstream
=======

          {/* Token Usage */}
          {tokenUsage && (
            <div className="bg-black/20 rounded p-2 space-y-1">
              <h5 className="text-[9px] font-bold text-slate-500 uppercase">Token Usage</h5>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono">
                <span className="text-slate-400">Input:</span>
                <span className="text-slate-300 text-right">{tokenUsage.promptTokens}</span>
                
                <span className="text-slate-400">Output:</span>
                <span className="text-slate-300 text-right">{tokenUsage.completionTokens}</span>
                
                <span className="text-slate-400">Total:</span>
                <span className="text-indigo-300 text-right">{tokenUsage.totalTokens}</span>
                
                {tokenUsage.cost && (
                  <>
                    <span className="text-slate-400">Cost:</span>
                    <span className="text-green-400 text-right">{tokenUsage.cost}</span>
                  </>
                )}
              </div>
            </div>
          )}
>>>>>>> Stashed changes
        </div>
      </div>
    </div>
  );
}
