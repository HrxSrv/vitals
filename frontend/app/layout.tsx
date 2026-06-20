import type { Metadata, Viewport } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';

// Public site origin used for absolute URLs (canonical, Open Graph, JSON-LD).
// Set NEXT_PUBLIC_SITE_URL in production (e.g. https://vithos.app).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vithos.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Vithos - Your Health Companion',
  description: 'Track your health biomarkers, upload reports, and get AI-powered insights.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Vithos',
    title: 'Vithos - Your Health Companion',
    description: 'Track your health biomarkers, upload reports, and get AI-powered insights.',
    url: SITE_URL,
    images: [{ url: '/logo.png', width: 1136, height: 435, alt: 'Vithos' }],
  },
};

// Organization structured data so Google can associate and display the Vithos logo.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vithos',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: 'Track your health biomarkers, upload reports, and get AI-powered insights.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3d9150',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
