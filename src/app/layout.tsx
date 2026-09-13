import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIBOT — AI lead engagement',
  description: 'Turn leads into conversations with AI calling and WhatsApp follow-up.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
