/**
 * Memory Extractor
 *
 * Extracts memorable facts from conversation turns using rule-based heuristics.
 * Avoids making additional LLM calls to keep extraction fast and cost-effective.
 */

import type { ConversationTurn } from '../types/memory.types';

/**
 * Patterns that indicate important information worth remembering
 */
const MEMORABLE_PATTERNS = {
  // Goals and intentions
  goals: [
    /\b(want to|planning to|trying to|working on|goal is|hoping to|aiming to)\b/i,
    /\b(my goal|my plan|my objective)\b/i,
  ],

  // Personal information
  personal: [
    /\b(my name is|i'm|i am|call me)\s+(\w+)/i,
    /\b(i live in|i'm from|based in)\s+([\w\s]+)/i,
    /\b(i work as|i'm a|my job)\s+([\w\s]+)/i,
    /\b(i study|i'm studying|my major)\s+([\w\s]+)/i,
  ],

  // Preferences
  preferences: [
    /\b(i like|i love|i enjoy|i prefer|favorite)\b/i,
    /\b(i don't like|i hate|i dislike)\b/i,
  ],

  // Challenges and struggles
  challenges: [
    /\b(struggling with|having trouble|difficult|hard time|challenge)\b/i,
    /\b(problem|issue|concern|worried about)\b/i,
  ],

  // Achievements and milestones
  achievements: [
    /\b(completed|finished|achieved|accomplished|succeeded)\b/i,
    /\b(got|received|won|earned)\b/i,
  ],
};

/**
 * Extract memorable facts from a conversation turn
 * Returns an array of fact strings
 */
export function extractMemorableFacts(turn: ConversationTurn): string[] {
  const facts: string[] = [];
  const { userMessage, assistantMessage } = turn;

  // Extract from user message (primary source of new information)
  facts.push(...extractFromUserMessage(userMessage));

  // Extract confirmations or important details from assistant message
  facts.push(...extractFromAssistantMessage(assistantMessage, userMessage));

  // Deduplicate and clean
  return deduplicateFacts(facts);
}

/**
 * Extract facts from user's message
 */
function extractFromUserMessage(message: string): string[] {
  const facts: string[] = [];

  // Check for goals and intentions
  for (const pattern of MEMORABLE_PATTERNS.goals) {
    if (pattern.test(message)) {
      facts.push(`User goal: ${cleanText(message)}`);
      break; // Only add once per category
    }
  }

  // Check for personal information
  for (const pattern of MEMORABLE_PATTERNS.personal) {
    const match = message.match(pattern);
    if (match) {
      facts.push(`Personal info: ${cleanText(message)}`);
      break;
    }
  }

  // Check for preferences
  for (const pattern of MEMORABLE_PATTERNS.preferences) {
    if (pattern.test(message)) {
      facts.push(`User preference: ${cleanText(message)}`);
      break;
    }
  }

  // Check for challenges
  for (const pattern of MEMORABLE_PATTERNS.challenges) {
    if (pattern.test(message)) {
      facts.push(`User challenge: ${cleanText(message)}`);
      break;
    }
  }

  // Check for achievements
  for (const pattern of MEMORABLE_PATTERNS.achievements) {
    if (pattern.test(message)) {
      facts.push(`User achievement: ${cleanText(message)}`);
      break;
    }
  }

  return facts;
}

/**
 * Extract facts from assistant's response
 * Look for confirmations or summaries of user information
 */
function extractFromAssistantMessage(
  assistantMessage: string,
  userMessage: string
): string[] {
  const facts: string[] = [];

  // If assistant is acknowledging/summarizing user's goal or plan
  if (
    /\b(so you're|sounds like you're|you mentioned|you're working on)\b/i.test(
      assistantMessage
    )
  ) {
    // Extract the context from user message
    if (MEMORABLE_PATTERNS.goals.some((p) => p.test(userMessage))) {
      facts.push(`Context: ${cleanText(userMessage)}`);
    }
  }

  return facts;
}

/**
 * Clean and normalize text for storage
 * Remove extra whitespace, trim, limit length
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .slice(0, 200); // Limit to 200 characters
}

/**
 * Remove duplicate or very similar facts
 */
function deduplicateFacts(facts: string[]): string[] {
  const unique = new Set<string>();
  const result: string[] = [];

  for (const fact of facts) {
    const normalized = fact.toLowerCase().trim();

    // Check if this fact is too similar to existing ones
    let isDuplicate = false;
    for (const existing of unique) {
      if (areSimilarStrings(normalized, existing)) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.add(normalized);
      result.push(fact);
    }
  }

  return result;
}

/**
 * Check if two strings are very similar (simple heuristic)
 */
function areSimilarStrings(a: string, b: string): boolean {
  // Exact match
  if (a === b) return true;

  // Substring match
  if (a.includes(b) || b.includes(a)) return true;

  // Calculate simple similarity score
  const words1 = new Set(a.split(/\s+/));
  const words2 = new Set(b.split(/\s+/));

  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) overlap++;
  }

  const similarity = overlap / Math.max(words1.size, words2.size);
  return similarity > 0.7; // 70% word overlap
}

/**
 * Combine multiple conversation turns into a single memorable summary
 * Useful for extracting context from multiple related messages
 */
export function extractSessionSummary(turns: ConversationTurn[]): string[] {
  const allFacts: string[] = [];

  for (const turn of turns) {
    allFacts.push(...extractMemorableFacts(turn));
  }

  return deduplicateFacts(allFacts);
}

/**
 * Score the importance of a fact (0-1)
 * Higher scores indicate more important information to remember
 */
export function scoreFactImportance(fact: string): number {
  let score = 0.5; // Base score

  // Personal info is very important
  if (fact.toLowerCase().includes('personal info')) {
    score += 0.3;
  }

  // Goals are important
  if (
    fact.toLowerCase().includes('goal') ||
    fact.toLowerCase().includes('plan')
  ) {
    score += 0.2;
  }

  // Achievements are moderately important
  if (fact.toLowerCase().includes('achievement')) {
    score += 0.15;
  }

  // Preferences are moderately important
  if (fact.toLowerCase().includes('preference')) {
    score += 0.1;
  }

  // Challenges are important for support
  if (fact.toLowerCase().includes('challenge')) {
    score += 0.15;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}
