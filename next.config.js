/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración optimizada para Supabase y Vercel
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Evitar errores de hidratación
  reactStrictMode: true,
  // OCR del recibo (tesseract + sharp) en Server Actions
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js', 'sharp'],
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

