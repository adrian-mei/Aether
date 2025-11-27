import { ImageResponse } from 'next/og';

export function GET() {
  const size = {
    width: 32,
    height: 32,
  };

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #14b8a6, #059669)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          boxShadow: '0 0 10px rgba(20, 184, 166, 0.5)',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
