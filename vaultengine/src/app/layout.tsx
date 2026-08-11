import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'VaultEngine Secure Viewer',
  description: 'Ephemeral digital asset access via cryptographic magic links.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
