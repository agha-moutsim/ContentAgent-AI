import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Content Execution Agent',
  description: 'Transform one content idea into multi-platform content packages',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
