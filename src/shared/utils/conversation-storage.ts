import { Message } from '@/scenes/Session/Session.logic';

const CONVERSATION_KEY = 'aether-conversation';

export function saveConversation(messages: Message[]): void {
  try {
    const serializedMessages = JSON.stringify(messages);
    localStorage.setItem(CONVERSATION_KEY, serializedMessages);
  } catch (error) {
    console.error('Failed to save conversation to localStorage', error);
  }
}

export function loadConversation(): Message[] | null {
  try {
    const serializedMessages = localStorage.getItem(CONVERSATION_KEY);
    if (serializedMessages === null) {
      return null;
    }
    return JSON.parse(serializedMessages);
  } catch (error) {
    console.error('Failed to load conversation from localStorage', error);
    return null;
  }
}
