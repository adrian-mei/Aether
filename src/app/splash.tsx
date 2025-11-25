import React from 'react';

const SplashScreen = () => {
  return (
    <div
      style={{
        background: '#022c22',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '120px',
          height: '120px',
          background: 'linear-gradient(to bottom right, #14b8a6, #059669)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 50px rgba(20, 184, 166, 0.5)',
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '50%',
            boxShadow: '0 0 25px rgba(255, 255, 255, 0.8)',
          }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
