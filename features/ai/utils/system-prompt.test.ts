import { buildSystemPrompt, buildDynamicPrompt } from '@/features/ai/utils/system-prompt';

describe('System Prompt Builder', () => {
  it('should include the static prompt base', () => {
    const result = buildSystemPrompt({ interactionCount: 0 });
    expect(result).toContain('You are Aether, a voice companion.');
    expect(result).toContain('Connection > Correction');
  });

  it('should adapt warmth based on interaction count', () => {
    // Early stage
    const early = buildDynamicPrompt({ interactionCount: 1 });
    expect(early).toContain('Warmth: Welcoming and gentle');

    // Middle stage
    const mid = buildDynamicPrompt({ interactionCount: 4 });
    expect(mid).toContain('Warmth: Deepening');

    // Late stage
    const late = buildDynamicPrompt({ interactionCount: 8 });
    expect(late).toContain('Warmth: Established trust');

    // Deep stage
    const deep = buildDynamicPrompt({ interactionCount: 20 });
    expect(deep).toContain('Warmth: Deep attunement');
  });

  it('should include specific mood guidance', () => {
    const result = buildDynamicPrompt({ interactionCount: 5, recentUserMood: 'anxious' });
    expect(result).toContain('Mood: Anxiety wants certainty you can\'t give');
  });

  it('should fallback for unknown moods', () => {
    const result = buildDynamicPrompt({ interactionCount: 5, recentUserMood: 'confused' });
    expect(result).toContain('Mood: confused—attune to their specific version of this');
  });

  it('should handle context signals', () => {
    // Topic shift
    const shift = buildDynamicPrompt({ interactionCount: 5, lastTopicShift: true });
    expect(shift).toContain('Topic shift—follow their lead');

    // Silence
    const silence = buildDynamicPrompt({ interactionCount: 5, silenceDuration: 15 });
    expect(silence).toContain('15sec silence');
  });

  it('should combine multiple signals', () => {
    const result = buildDynamicPrompt({ 
        interactionCount: 10, 
        recentUserMood: 'grief',
        lastTopicShift: true
    });
    
    expect(result).toContain('Warmth: Established trust');
    expect(result).toContain('Mood: Grief needs witness');
    expect(result).toContain('Topic shift—follow their lead');
  });
});
