export type FillerCategory = 'neutral' | 'agreement' | 'empathy' | 'encouragement';

export interface FillerPhrase {
  text: string;
  category: FillerCategory;
  weight: number; // 0-1, likelihood of selection
}

export const FILLER_PHRASES: FillerPhrase[] = [
  // Neutral (Short acknowledgments)
  { text: "Ah.", category: 'neutral', weight: 1.0 },
  { text: "Mhm.", category: 'neutral', weight: 1.0 },
  { text: "I see.", category: 'neutral', weight: 0.8 },
  { text: "Okay.", category: 'neutral', weight: 0.8 },

  // Agreement
  { text: "Right.", category: 'agreement', weight: 0.8 },
  { text: "Gotcha.", category: 'agreement', weight: 0.6 },
  { text: "Exactly.", category: 'agreement', weight: 0.5 },
  { text: "Makes sense.", category: 'agreement', weight: 0.6 },

  // Empathy (Validation)
  { text: "I know that feeling.", category: 'empathy', weight: 0.4 },
  { text: "That sounds tough.", category: 'empathy', weight: 0.4 },
  { text: "I understand.", category: 'empathy', weight: 0.5 },

  // Encouragement (Keep talking)
  { text: "Go on.", category: 'encouragement', weight: 0.7 },
  { text: "I'm listening.", category: 'encouragement', weight: 0.6 },
  { text: "Tell me more.", category: 'encouragement', weight: 0.5 },
];
