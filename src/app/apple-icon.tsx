import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          background: 'linear-gradient(to bottom right, #022c22, #0f766e)', // Emerald-950 to Teal-700
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%', // iOS Icon standard squircle-ish
        }}
      >
        {/* Glowing Orb */}
        <div
          style={{
            width: '100px',
            height: '100px',
            background: 'linear-gradient(to bottom right, #14b8a6, #059669)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(20, 184, 166, 0.4)',
          }}
        >
          {/* Inner Light */}
          <div
             style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '50%',
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
             }}
          />
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  )
}
