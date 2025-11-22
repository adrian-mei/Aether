import React from 'react';
import { ThumbsUp, Minus } from 'lucide-react';

interface ResponseFeedbackProps {
  onFeedback: (type: 'positive' | 'neutral') => void;
}

export const ResponseFeedback = ({ onFeedback }: ResponseFeedbackProps) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-4 animate-fade-in">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFeedback('positive');
        }}
        className="p-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="Helpful response"
      >
        <ThumbsUp className="w-5 h-5 md:w-6 md:h-6 opacity-70 group-hover:opacity-100" />
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFeedback('neutral');
        }}
        className="p-2 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 transition-all duration-300 hover:scale-110 active:scale-95 group"
        aria-label="Neutral response"
      >
        <Minus className="w-5 h-5 md:w-6 md:h-6 opacity-70 group-hover:opacity-100" />
      </button>
    </div>
  );
};
