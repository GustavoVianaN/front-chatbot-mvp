const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https://*.facebook.com https://*.fbcdn.net",
      "font-src 'self' data:",
      // connect.facebook.net: SDK JS do "Conectar com a Meta" (Embedded
      // Signup), carregado em components/MetaEmbeddedSignupButton.tsx.
      `script-src 'self' 'unsafe-inline' https://connect.facebook.net${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://www.facebook.com https://graph.facebook.com",
      // O diálogo do Embedded Signup roda dentro de um iframe da própria Meta.
      "frame-src https://www.facebook.com https://web.facebook.com",
      ...(isDev ? [] : ['upgrade-insecure-requests']),
    ].join('; '),
  },
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
  {
    key: 'Permissions-Policy',
    // microphone=(self) libera a gravação de áudio usada no onboarding (Bella)
    // e na base de conhecimento; câmera, geolocalização e pagamento continuam bloqueados.
    value: 'camera=(), microphone=(self), geolocation=(), payment=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
