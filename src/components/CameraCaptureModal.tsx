import React, { useState, useRef, useEffect } from 'react';
import { Camera, SwitchCamera, QrCode, X, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto?: (dataUrl: string) => void;
  onScanCode?: (scannedCode: string) => void;
  mode?: 'photo' | 'scan' | 'both';
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapturePhoto,
  onScanCode,
  mode = 'both',
  title = 'Câmera de Inspeção em Campo'
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'photo' | 'scan'>(mode === 'scan' ? 'scan' : 'photo');
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Start Camera Stream
  const startCamera = async (facing: 'environment' | 'user') => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Erro ao acessar a câmera:', err);
      setCameraError(
        'Não foi possível acessar a câmera do dispositivo. Verifique as permissões de acesso ao vídeo no seu navegador ou certifique-se de que outra aplicação não está utilizando a câmera.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setScanFeedback(null);
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }
    };
  }, [isOpen, facingMode]);

  // QR Code / Barcode Scanner Loop
  useEffect(() => {
    if (isOpen && activeTab === 'scan' && !capturedPhoto) {
      setScanning(true);

      const checkBarcode = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        // Use modern native BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const barcodeDetector = new window.BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix']
            });
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              setScanFeedback(`Código identificado: ${detected}`);
              if (onScanCode) {
                onScanCode(detected);
                setTimeout(() => {
                  onClose();
                }, 800);
              }
            }
          } catch (e) {
            // ignore scan loop error
          }
        }
      };

      scanIntervalRef.current = window.setInterval(checkBarcode, 600);
    } else {
      setScanning(false);
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
      }
    };
  }, [isOpen, activeTab, capturedPhoto, onScanCode]);

  // Flip camera between front and back
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Take photo from video stream
  const handleTakePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);
  };

  // Confirm photo capture
  const handleConfirmPhoto = () => {
    if (capturedPhoto && onCapturePhoto) {
      onCapturePhoto(capturedPhoto);
      onClose();
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#111',
          border: '1px solid #333',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
          color: '#fff'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 18px',
            background: '#000',
            borderBottom: '1px solid #222',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} color="#4CAF50" />
            <span style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {mode === 'both' && (
              <div style={{ display: 'flex', background: '#222', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('photo');
                    setCapturedPhoto(null);
                  }}
                  style={{
                    background: activeTab === 'photo' ? '#4CAF50' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Fotografar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('scan');
                    setCapturedPhoto(null);
                  }}
                  style={{
                    background: activeTab === 'scan' ? '#4CAF50' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Ler QR / Código
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewfinder / Video Canvas Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '380px',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {cameraError ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#ff8a80', maxWidth: '480px' }}>
              <AlertCircle size={36} style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '13px', lineHeight: '1.5' }}>{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                style={{
                  marginTop: '12px',
                  background: '#222',
                  color: '#fff',
                  border: '1px solid #444',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Tentar Novamente
              </button>
            </div>
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Foto Capturada"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />

              {/* Scanner Grid Overlay */}
              {activeTab === 'scan' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <div
                    style={{
                      width: '240px',
                      height: '240px',
                      border: '2px solid #4CAF50',
                      borderRadius: '12px',
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: '#4CAF50',
                        boxShadow: '0 0 10px #4CAF50',
                        animation: 'scanLine 2s infinite ease-in-out'
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginTop: '16px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    {scanFeedback || 'Aponte a câmera para o QR Code ou código do veículo'}
                  </span>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Modal Controls Bar */}
        <div
          style={{
            padding: '16px 20px',
            background: '#0a0a0a',
            borderTop: '1px solid #222',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={handleToggleCamera}
            disabled={!!capturedPhoto}
            style={{
              background: '#222',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: capturedPhoto ? 'not-allowed' : 'pointer',
              opacity: capturedPhoto ? 0.5 : 1
            }}
          >
            <SwitchCamera size={16} />
            Alternar Câmera ({facingMode === 'environment' ? 'Traseira' : 'Frontal'})
          </button>

          {capturedPhoto ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  background: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={15} />
                Tirar Outra
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                style={{
                  background: '#2E7D32',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} />
                Confirmar e Usar Foto
              </button>
            </div>
          ) : activeTab === 'photo' ? (
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={!!cameraError}
              style={{
                background: '#2E7D32',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: cameraError ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(46,125,50,0.4)'
              }}
            >
              <Camera size={17} />
              Fotografar Agora
            </button>
          ) : (
            <div style={{ fontSize: '12px', color: '#888' }}>
              Modo leitor ativo · Escaneamento automático
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
