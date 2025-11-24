'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, X, Key } from 'lucide-react';

interface WaitlistModalProps {
  isOpen: boolean;
  onJoin: (email: string) => void;
  onClose: () => void;
  onBypass: (code: string) => Promise<boolean>;
}

export const WaitlistModal = ({ isOpen, onJoin, onClose, onBypass }: WaitlistModalProps) => {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [mode, setMode] = useState<'waitlist' | 'access'>('waitlist');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (mode === 'waitlist') {
        if (!email) return;
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        onJoin(email);
        setSubmitted(true);
        setIsSubmitting(false);
    } else {
        if (!accessCode) return;
        const success = await onBypass(accessCode);
        setIsSubmitting(false);
        if (success) {
            onClose(); // Close modal on success
        } else {
            setError('Invalid access code');
        }
    }
  };

  const toggleMode = () => {
      setMode(prev => prev === 'waitlist' ? 'access' : 'waitlist');
      setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-500" />

      {/* Modal Content */}
      <div className="relative w-full max-w-md transform transition-all duration-500 scale-100 opacity-100">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/90 to-teal-950/90 p-8 shadow-2xl shadow-emerald-900/20">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-emerald-900/50 text-emerald-400/50 hover:text-emerald-300 transition-colors z-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              {submitted ? (
                <Check className="w-8 h-8 text-emerald-300" />
              ) : (
                <Sparkles className="w-8 h-8 text-emerald-300" />
              )}
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-2xl font-light tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-200">
                {submitted ? "You're on the list" : (mode === 'access' ? "Enter Access Code" : "Demo Limit Reached")}
              </h2>
              <p className="text-emerald-100/60 text-sm leading-relaxed">
                {submitted 
                  ? "Thank you for your interest in Aether. We'll notify you when early access opens."
                  : (mode === 'access' 
                      ? "Enter your code to unlock unlimited sessions."
                      : "Please come back in 12 hours to continue chatting, or join the waitlist for unlimited access.")
                }
              </p>
            </div>

            {/* Unlock Option after Submission */}
            {submitted && (
                <button 
                    onClick={() => {
                        setSubmitted(false);
                        setMode('access');
                    }}
                    className="text-emerald-300 hover:text-emerald-200 text-sm underline underline-offset-4 transition-colors"
                >
                    Have an access code? Unlock now
                </button>
            )}

            {/* Form */}
            {!submitted && (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="relative group">
                  {mode === 'waitlist' ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full px-5 py-3.5 rounded-xl bg-emerald-950/50 border border-emerald-400/20 text-emerald-100 placeholder-emerald-400/30 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/50 transition-all"
                        required
                      />
                  ) : (
                      <input
                        type="password"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="Enter access code"
                        className="w-full px-5 py-3.5 rounded-xl bg-emerald-950/50 border border-emerald-400/20 text-emerald-100 placeholder-emerald-400/30 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/50 transition-all"
                        required
                      />
                  )}
                </div>
                
                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium tracking-wide transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === 'waitlist' ? 'Join Waitlist' : 'Unlock Access'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                <button 
                    type="button"
                    onClick={toggleMode}
                    className="text-emerald-400/50 hover:text-emerald-300 text-sm transition-colors flex items-center justify-center gap-2 w-full"
                >
                    {mode === 'waitlist' ? (
                        <>
                            <Key className="w-3 h-3" />
                            Have an access code?
                        </>
                    ) : "Back to Waitlist"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
