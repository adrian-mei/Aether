import { Bug } from 'lucide-react';
import DebugOverlay from '@/shared/components/debug-overlay';
import { chatService } from '@/features/ai/services/chat-service';

interface DebugControlsProps {
  isOpen: boolean;
  onToggle: () => void;
  onSimulateInput: (text: string) => void;
}

export function DebugControls({ isOpen, onToggle, onSimulateInput }: DebugControlsProps) {
  return (
    <div className="hidden md:block">
      <DebugOverlay 
        isOpen={isOpen} 
        onClose={onToggle} 
        onTestApi={() => chatService.testApiConnection()}
        onSimulateInput={onSimulateInput}
      />

      {/* Debug Toggle - Bottom Right Corner */}
      <button
        onClick={onToggle}
        className={`fixed bottom-4 right-4 z-50 p-2 rounded-full transition-all duration-300 ${
          isOpen
            ? 'bg-emerald-500/20 text-emerald-400 scale-100'
            : 'bg-emerald-900/40 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-900/60 scale-90 opacity-30 hover:opacity-100'
        }`}
        aria-label="Toggle debug mode"
      >
        <Bug size={16} />
      </button>
    </div>
  );
}
