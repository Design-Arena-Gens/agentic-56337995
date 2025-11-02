import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NOC Monitoring Dashboard',
  description: 'PRTG Network Monitoring Dashboard',
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
