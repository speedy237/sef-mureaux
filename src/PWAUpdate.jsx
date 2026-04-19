import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Hook personnalisé pour gérer le Service Worker PWA
 * Affiche une notification quand une mise à jour est disponible
 */
export function usePWA() {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ Service Worker enregistré');
      
      // Vérifie les mises à jour toutes les heures
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // 1 heure
      }
    },
    onRegisterError(error) {
      console.error('❌ Erreur d\'enregistrement SW:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
    }
  }, [needRefresh]);

  const reloadPage = () => {
    updateServiceWorker(true);
  };

  const close = () => {
    setShowReload(false);
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return {
    showReload,
    offlineReady,
    reloadPage,
    close,
  };
}

/**
 * Composant UI pour afficher la notification de mise à jour
 */
export function PWAUpdateNotification() {
  const { showReload, offlineReady, reloadPage, close } = usePWA();

  if (!showReload && !offlineReady) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--card)',
      padding: '16px 24px',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(28,74,53,0.25)',
      zIndex: 9999,
      maxWidth: '90%',
      width: 400,
      animation: 'fadeUp 0.3s ease',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: offlineReady ? 'var(--green)' : 'var(--amber)',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{
          fontWeight: 600,
          color: 'var(--text)',
        }}>
          {offlineReady ? '✅ Application prête hors ligne' : '🔄 Mise à jour disponible'}
        </span>
      </div>
      
      {showReload && (
        <>
          <p style={{
            fontSize: 14,
            color: 'var(--text2)',
            marginBottom: 12,
          }}>
            Une nouvelle version de l'application est disponible. Rechargez pour mettre à jour.
          </p>
          <div style={{
            display: 'flex',
            gap: 8,
          }}>
            <button
              onClick={reloadPage}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: 'var(--green)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Recharger
            </button>
            <button
              onClick={close}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: 'var(--bg2)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Plus tard
            </button>
          </div>
        </>
      )}
      
      {offlineReady && !showReload && (
        <button
          onClick={close}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: 'var(--green)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          OK
        </button>
      )}
    </div>
  );
}

// Animation de pulse pour l'indicateur
const pulseKeyframes = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

// Injecter les keyframes dans le document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}
