import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  const size = {
    width: 1179,
    height: 2556,
  };

  return new ImageResponse(
    (
      <div
        style={{
          background: '#022c22',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '180px',
            height: '180px',
            background: 'linear-gradient(to bottom right, #14b8a6, #059669)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 80px rgba(20, 184, 166, 0.6)',
          }}
        >
          <div
            style={{
              width: '70px',
              height: '70px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '50%',
              boxShadow: '0 0 40px rgba(255, 255, 255, 0.8)',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
