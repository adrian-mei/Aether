import { useState, useEffect } from 'react';

export const useTypewriter = (text: string | undefined, speed: number = 30, delay: number = 0) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) {
        setDisplayedText('');
        return;
    }

    let i = 0;
    
    let intervalId: NodeJS.Timeout;
    const timeoutId = setTimeout(() => {
      setDisplayedText(''); // Clear previous text only when ready to start new one
      
      intervalId = setInterval(() => {
        if (i >= text.length) {
            clearInterval(intervalId);
            return;
        }
        
        const nextChar = text.charAt(i);
        setDisplayedText((prev) => prev + nextChar);
        i++;
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, delay]);

  return displayedText;
};
