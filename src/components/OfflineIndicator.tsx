import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        zIndex: 9999,
        background: '#B26A00',
        color: '#fff',
        padding: '8px 14px',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontWeight: '600',
        border: '1px solid #FFB74D'
      }}
    >
      <WifiOff size={16} />
      <span>
        Modo Offline Ativo — Todas as inspeções e fotos continuam sendo salvas localmente no dispositivo.
      </span>
      <span
        style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '2px 6px',
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '10.5px'
        }}
      >
        <Database size={11} />
        Armazenamento Local Ativo
      </span>
    </div>
  );
};
