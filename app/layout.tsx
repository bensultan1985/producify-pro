import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MIDI Composer UI',
  description: 'Upload a MIDI file, choose instruments/sections, and request AI-arranged tracks.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
