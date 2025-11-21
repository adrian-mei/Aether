'use client';

interface WelcomeScreenProps {
  onBegin: () => void;
}

export function WelcomeScreen({ onBegin }: WelcomeScreenProps) {
  return (
    <button
      onClick={onBegin}
      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-all duration-300 shadow-lg shadow-indigo-900/20 text-white font-medium cursor-pointer"
    >
      Begin Session
    </button>
  );
}
