import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MiniGPT',
  description: 'A training platform for neural networks',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
