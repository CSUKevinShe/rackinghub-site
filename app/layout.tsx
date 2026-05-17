import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'RackingHub — Free Warehouse Racking Planner',
    template: '%s | RackingHub',
  },
  description: 'Design your warehouse racking system in minutes. Get instant layout diagrams, cost estimates, and bill of materials.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
