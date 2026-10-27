import React from 'react';

interface PhotoLightboxProps {
  src: string | null;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ src, onClose }) => {
  if (!src) return null;

  return (
    <div
      className="photo-lightbox"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'zoom-out',
        padding: '24px'
      }}
    >
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <img
          src={src}
          alt="Foto ampliada"
          style={{
            maxWidth: '90vw',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: '6px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          ×
        </button>
      </div>
      <p style={{ color: '#fff', fontSize: '12px', marginTop: '12px', opacity: 0.8 }}>
        Clique em qualquer lugar para fechar
      </p>
    </div>
  );
};
