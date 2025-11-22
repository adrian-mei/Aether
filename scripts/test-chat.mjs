// Interactive test script for Aether Chat API
// Usage: node scripts/test-chat.mjs

import readline from 'readline';

const API_URL = 'http://localhost:3000/api/gemini';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m%s\x1b[0m', '--- Aether Chat CLI Debugger ---');
console.log('Type a message and press Enter. Type "exit" to quit.\n');

// Conversation history for context
let history = [];

async function chat(userInput) {
  if (!userInput.trim()) return;

  if (userInput.toLowerCase() === 'exit') {
    console.log('Goodbye!');
    process.exit(0);
  }

  // Add user message to history
  history.push({ role: 'user', content: userInput });

  try {
    process.stdout.write('\x1b[32mAether: \x1b[0m'); // Green prompt

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history // Send full history context
      })
    });

    if (!response.ok) {
      console.error(`\nError: ${response.status} ${response.statusText}`);
      console.error(await response.text());
      return;
    }

    if (!response.body) {
        console.log(await response.text());
        return;
    }

    // Streaming response handling
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      
      // The API might send structured data (data: {...}) or raw text depending on implementation.
      // For the Universal API we built, it sends SSE format.
      // Let's parse the SSE lines.
      
      const lines = chunk.split('\n');
      for (const line of lines) {
          if (line.startsWith('data: ')) {
              try {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') continue;
                  
                  const data = JSON.parse(jsonStr);
                  if (data.text) {
                      process.stdout.write(data.text);
                      fullResponse += data.text;
                  }
              } catch {
                  // Ignore parse errors for partial chunks
              }
          }
      }
    }
    
    // Add assistant response to history
    history.push({ role: 'assistant', content: fullResponse });
    console.log('\n'); // Newline after response

  } catch (error) {
    console.error('\nConnection Failed:', error.message);
  }
  
  prompt();
}

function prompt() {
  rl.question('\x1b[33mYou: \x1b[0m', (input) => {
    chat(input).then(prompt);
  });
}

// Start loop
prompt();
