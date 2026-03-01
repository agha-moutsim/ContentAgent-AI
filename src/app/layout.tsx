import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'ContentAgent AI - Premium Content Orchestration',
  description: 'Pro-level AI agent transforming ideas into multi-platform content packages',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased text-slate-200">
        <div className="aurora-bg" />
        {children}
      </body>
    </html>
  )
}
