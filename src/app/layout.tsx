import type { Metadata, Viewport } from 'next';
import { Michroma, Inter } from 'next/font/google';
import './globals.css';

const michroma = Michroma({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-michroma',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZTOI TECH | Business Management System',
  description: 'Clean, professional project, EMI, ledger, salary and expense management system.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF4D00',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${michroma.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white text-gray-900 antialiased selection:bg-[#FF4D00] selection:text-white">
        {children}
      </body>
    </html>
  );
}
