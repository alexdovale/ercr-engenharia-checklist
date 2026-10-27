import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside standalone PWA mode, don't show install prompt
  if (isInstalled) {
    return (
      <span
        title="Aplicativo instalado e executando em modo nativo PWA"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: '#81c784',
          background: 'rgba(46, 125, 50, 0.2)',
          border: '1px solid #2e7d32',
          padding: '4px 8px',
          borderRadius: '4px'
        }}
      >
        <CheckCircle size={13} />
        PWA Instalado
      </span>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Instalar o aplicativo no dispositivo para acesso rápido e suporte offline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#2E7D32',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'background 0.2s'
        }}
      >
        <Download size={14} />
        Instalar Aplicativo (PWA)
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Instalar no iPhone ou iPad"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '11.5px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Smartphone size={13} color="#4caf50" />
          Instalar no iPhone
        </button>

        {showIOSGuide && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              style={{
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '380px',
                width: '100%',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={18} color="#4caf50" />
                  Instalar no iOS (Safari)
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.6', marginBottom: '18px' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  Para instalar o <strong>ERCR Checklist</strong> no seu iPhone ou iPad:
                </p>
                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                  <li style={{ marginBottom: '8px' }}>
                    Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari.
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    Role a lista para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
                  </li>
                  <li>
                    Toque em <strong>Adicionar</strong> no canto superior direito.
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2E7D32',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
