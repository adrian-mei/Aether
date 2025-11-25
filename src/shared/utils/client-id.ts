export function getOrCreateClientId(): string {
  const COOKIE_NAME = 'aether_client_id';
  
  // Try to find existing cookie
  const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
  if (match) {
    return match[2];
  }

  // Generate new UUID
  const newId = crypto.randomUUID();
  
  // Set cookie for 1 year
  const date = new Date();
  date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  
  document.cookie = COOKIE_NAME + "=" + newId + expires + "; path=/; SameSite=Lax";
  
  return newId;
}
