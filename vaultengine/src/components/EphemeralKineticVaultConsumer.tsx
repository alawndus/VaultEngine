'use client'

import { useEffect, useRef, useState } from 'react'

type VaultAsset = {
  id: string
  title: string
  description: string | null
  contentUrl: string
  contentType: string
}

interface EphemeralKineticVaultConsumerProps {
  magicToken: string
  assetId: string
  buyerDisplayName?: string
  watermarkText?: string
  sessionSeconds?: number
}

export default function EphemeralKineticVaultConsumer({
  magicToken,
  assetId,
  buyerDisplayName,
  watermarkText,
  sessionSeconds = 15 * 60,
}: EphemeralKineticVaultConsumerProps) {
  const [asset, setAsset] = useState<VaultAsset | null>(null)
  const [statusMessage, setStatusMessage] = useState('Initializing secure viewer...')
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(sessionSeconds)
  const sessionExpiryTimer = useRef<number | null>(null)
  const lockTimer = useRef<number | null>(null)

  function lockSession(message: string) {
    setLocked(true)
    setError(message)
    setAsset(null)
    setStatusMessage('Session locked due to suspicious activity.')
    cleanupListeners()
  }

  function cleanupListeners() {
    if (sessionExpiryTimer.current) {
      clearInterval(sessionExpiryTimer.current)
      sessionExpiryTimer.current = null
    }
    if (lockTimer.current) {
      clearTimeout(lockTimer.current)
      lockTimer.current = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('copy', handleCopy)
    document.removeEventListener('contextmenu', handleContextMenu)
    window.removeEventListener('blur', handleWindowBlur)
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('selectstart', handleSelectStart)
  }

  function handleCopy(event: ClipboardEvent) {
    event.preventDefault()
    lockSession('Copying content is prohibited in this secure viewer.')
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault()
    lockSession('Right-click access is blocked inside the secure vault.')
  }

  function handleKeyDown(event: KeyboardEvent) {
    const isModifier = event.ctrlKey || event.metaKey
    const blockedKeys = ['c', 'p', 's', 'u']
    const isPrintScreen = event.key === 'PrintScreen' || event.key === 'Print'

    if (isPrintScreen || (isModifier && blockedKeys.includes(event.key.toLowerCase()))) {
      event.preventDefault()
      lockSession('Screen capture and keyboard exporting are blocked.')
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      lockTimer.current = window.setTimeout(() => {
        lockSession('The viewer locked because the window lost focus.')
      }, 500)
    }
  }

  function handleWindowBlur() {
    lockTimer.current = window.setTimeout(() => {
      lockSession('The secure vault locked after the browser window lost focus.')
    }, 500)
  }

  function handleSelectStart(event: Event) {
    event.preventDefault()
    lockSession('Selection is disabled inside the secure vault.')
  }

  useEffect(() => {
    let abortController = new AbortController()

    async function fetchAsset() {
      setStatusMessage('Verifying access token and loading protected content...')
      setError(null)

      try {
        const response = await fetch(`/api/vault/content?assetId=${encodeURIComponent(assetId)}`, {
          method: 'GET',
          headers: {
            'x-vault-magic-token': magicToken,
          },
          signal: abortController.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'Unable to authorize the secure asset.')
        }

        const payload = await response.json()

        setAsset({
          id: payload.asset.id,
          title: payload.asset.title,
          description: payload.asset.description,
          contentUrl: payload.asset.contentUrl,
          contentType: payload.asset.contentType,
        })
        setStatusMessage('Secure content loaded in a kinetic vault wrapper.')
      } catch (exception) {
        if (abortController.signal.aborted) {
          return
        }
        setError(exception instanceof Error ? exception.message : 'Failed to load content.')
        setStatusMessage('Unable to load secure content.')
      }
    }

    fetchAsset()

    return () => {
      abortController.abort()
      cleanupListeners()
    }
  }, [assetId, magicToken])

  useEffect(() => {
    if (locked || error) {
      cleanupListeners()
      return
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('selectstart', handleSelectStart)

    sessionExpiryTimer.current = window.setInterval(() => {
      setSessionSecondsRemaining((current) => {
        if (current <= 1) {
          cleanupListeners()
          lockSession('The secure session expired automatically.')
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => cleanupListeners()
  }, [locked, error])

  const watermarkContent = watermarkText || `Secure Vault • ${buyerDisplayName ?? 'Authorized Viewer'}`
  const elapsedMinutes = Math.floor((sessionSeconds - sessionSecondsRemaining) / 60)

  return (
    <div className="vault-viewer-shell" style={{ position: 'relative', minHeight: '420px', borderRadius: '24px', overflow: 'hidden', backgroundColor: '#090b12', color: '#f8f9fb' }}>
      <div className="vault-watermark" style={{
        pointerEvents: 'none',
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(45deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }} />

      <div className="vault-watermark-label" style={{
        pointerEvents: 'none',
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.14,
        fontSize: 'clamp(16px, 2.4vw, 42px)',
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        color: '#ffffff',
      }}>
        {watermarkContent}
      </div>

      <div className="vault-viewer-content" style={{
        position: 'relative',
        zIndex: 1,
        padding: '24px',
        minHeight: '420px',
        display: 'grid',
        placeItems: 'center',
      }}>
        {error ? (
          <div style={{ maxWidth: 700, textAlign: 'center' }}>
            <h2 style={{ marginBottom: 12 }}>Secure viewer locked</h2>
            <p style={{ marginBottom: 16 }}>{error}</p>
            <p style={{ color: '#8892b0', fontSize: '0.95rem' }}>This session can no longer be resumed for security reasons.</p>
          </div>
        ) : !asset ? (
          <div style={{ maxWidth: 640, textAlign: 'center' }}>
            <p>{statusMessage}</p>
          </div>
        ) : locked ? (
          <div style={{ maxWidth: 700, textAlign: 'center' }}>
            <h2>Session terminated</h2>
            <p>Content access is no longer available because the session was locked automatically.</p>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 1080, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 68px rgba(0,0,0,0.38)', backgroundColor: '#0f1724' }}>
            <header style={{ padding: '20px 26px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,11,20,0.95)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '0.12em', color: '#7b86a1' }}>VaultEngine Secure Session</p>
                  <h1 style={{ margin: '6px 0 0', fontSize: '1.35rem' }}>{asset.title}</h1>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#9ba6d6' }}>Expires in {sessionSecondsRemaining}s</p>
                  <p style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: '0.95rem' }}>Safeguarded for buyer {buyerDisplayName ?? 'anonymous'}</p>
                </div>
              </div>
            </header>

            <section style={{ position: 'relative', minHeight: '360px', backgroundColor: '#06080f' }}>
              {asset.contentType.startsWith('image') ? (
                <img
                  src={asset.contentUrl}
                  alt={asset.title}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '78vh', objectFit: 'contain' }}
                />
              ) : asset.contentType.startsWith('video') ? (
                <video
                  src={asset.contentUrl}
                  controls
                  autoPlay={false}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '78vh', objectFit: 'contain' }}
                />
              ) : asset.contentType === 'application/pdf' ? (
                <iframe
                  title={asset.title}
                  src={asset.contentUrl}
                  style={{ width: '100%', minHeight: '78vh', border: 'none' }}
                  sandbox="allow-same-origin allow-scripts"
                />
              ) : (
                <div style={{ padding: 30, color: '#d1d5db', textAlign: 'center' }}>
                  <p style={{ marginBottom: 12, fontSize: '1rem' }}>Protected asset loaded.</p>
                  <a href={asset.contentUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc' }}>Open secure asset</a>
                </div>
              )}
            </section>

            <footer style={{ padding: '20px 26px', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', backgroundColor: '#0b1120' }}>
              <span style={{ color: '#9ca3af' }}>Session lifetime: {elapsedMinutes} minutes</span>
              <span style={{ color: '#9ca3af' }}>Viewer locked on anomaly detection</span>
            </footer>
          </div>
        )}
      </div>
    </div>
  )
}
