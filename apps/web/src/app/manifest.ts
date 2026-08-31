import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Kro for Web',
        short_name: 'Kro',
        description: 'Control your time, do not let time control you',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icons/Kro192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icons/Kro512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}