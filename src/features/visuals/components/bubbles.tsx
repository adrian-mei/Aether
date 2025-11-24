import React, { useState, useEffect } from 'react';

export const Bubbles = () => {
  const [bubbles, setBubbles] = useState<Array<{
    width: string;
    height: string;
    left: string;
    animationDuration: string;
    animationDelay: string;
  }>>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBubbles([...Array(3)].map(() => ({
      width: Math.random() * 20 + 10 + 'px',
      height: Math.random() * 20 + 10 + 'px',
      left: Math.random() * 100 + '%',
      animationDuration: Math.random() * 2 + 2 + 's',
      animationDelay: Math.random() * 1 + 's'
    })));
  }, []);

  return (
    <>
      {bubbles.map((style, i) => (
        <div 
            key={i}
            className="absolute bg-teal-300/30 rounded-full animate-floatSmooth"
            style={{
                ...style,
                bottom: '-20px'
            }}
        />
      ))}
    </>
  );
};
