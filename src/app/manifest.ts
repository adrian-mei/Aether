import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aether',
    short_name: 'Aether',
    description: 'Voice-First Empathetic Companion',
    start_url: '/',
    display: 'standalone',
    background_color: '#022c22',
    theme_color: '#022c22',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
