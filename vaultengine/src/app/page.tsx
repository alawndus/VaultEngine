import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32px',
      backgroundColor: '#050816',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 820, textAlign: 'center' }}>
        <p style={{ color: '#82aaff', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>VaultEngine</p>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 4rem)', margin: 0 }}>Secure asset delivery with cryptographic magic links.</h1>
        <p style={{ marginTop: 24, color: '#cbd5e1', lineHeight: 1.8 }}>Use ephemeral tokenized access to securely render protected assets without passwords, all backed by Supabase and the Next.js App Router.</p>
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/api/vault/content?assetId=test&token=test" style={{
            padding: '14px 22px',
            borderRadius: 9999,
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            Test API Endpoint
          </Link>
        </div>
      </div>
    </main>
  )
}
