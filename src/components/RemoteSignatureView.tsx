import React, { useRef, useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { InspectionData } from '../types/inspection';
import { CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';

interface RemoteSignatureViewProps {
  inspectionId: string;
  onBackToApp: () => void;
}

export const RemoteSignatureView: React.FC<RemoteSignatureViewProps> = ({
  inspectionId,
  onBackToApp
}) => {
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const hasDrawn = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await StorageService.getInspection(inspectionId);
        if (data) {
          setInspection(data);
          setSignerName(data.text?.repCliNome || data.text?.respVeic || '');
          setSignerRole(data.text?.repCliCargo || data.text?.cargoFunc || 'Representante');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [inspectionId]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 240;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
    }
  };

  useEffect(() => {
    if (!loading && !isSubmitted) {
      initCanvas();
      window.addEventListener('resize', initCanvas);
      return () => window.removeEventListener('resize', initCanvas);
    }
  }, [loading, isSubmitted]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawing.current = true;
    hasDrawn.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCoordinates(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    isDrawing.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  };

  const handleSubmit = async () => {
    if (!hasDrawn.current) {
      alert('Por favor, faça a sua assinatura no quadro antes de enviar.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setSubmitting(true);
      const signatureDataUrl = canvas.toDataURL('image/png');

      const existing = inspection || (await StorageService.getInspection(inspectionId));
      if (!existing) {
        throw new Error('Inspeção não encontrada.');
      }

      const updatedText = {
        ...existing.text,
        repCliNome: signerName,
        repCliCargo: signerRole,
        repCliData: new Date().toISOString().split('T')[0]
      };

      const updatedSignatures = {
        ...(existing.signatures || {}),
        methodUsed: 'remote' as const,
        repCli: {
          image: signatureDataUrl,
          methodUsed: 'remote' as const,
          metadata: {
            timestamp: new Date().toISOString(),
            status: 'Concluída remotamente pelo cliente via link seguro',
            browserInfo: navigator.userAgent
          }
        }
      };

      await StorageService.saveInspection(inspectionId, {
        ...existing,
        text: updatedText,
        signatures: updatedSignatures
      });

      setIsSubmitted(true);
    } catch (err: any) {
      alert('Erro ao enviar assinatura: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
        <p>Carregando laudo para assinatura...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', color: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header style={{ background: '#000', width: '100%', padding: '18px 0', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <img
          src="/assets/img/logo-ercr.png"
          alt="ERCR Engenharia"
          style={{ maxHeight: '45px', objectFit: 'contain' }}
        />
      </header>

      <div
        className="container"
        style={{
          backgroundColor: '#fff',
          width: '92%',
          maxWidth: '520px',
          margin: '24px auto',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={20} color="#2E7D32" />
            Assinatura Digital do Laudo
          </h2>
          <button
            onClick={onBackToApp}
            style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowLeft size={14} /> Sistema
          </button>
        </div>

        {inspection && (
          <div style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px', marginBottom: '18px', fontSize: '12.5px' }}>
            <div><strong>Veículo:</strong> {[inspection.text?.marca, inspection.text?.modelo].filter(Boolean).join(' ') || 'Veículo inspecionado'}</div>
            <div><strong>Placa:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{inspection.text?.placa || '-'}</span></div>
            <div><strong>Empresa:</strong> {inspection.text?.empresa || '-'}</div>
            {inspection.seq && <div><strong>Laudo:</strong> Nº {inspection.seq.number}/{inspection.seq.year}</div>}
          </div>
        )}

        {isSubmitted ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <CheckCircle2 size={48} color="#2e7d32" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#2e7d32', margin: '0 0 8px 0', fontSize: '1.2rem' }}>
              Assinatura Enviada com Sucesso!
            </h3>
            <p style={{ color: '#555', fontSize: '0.95rem', margin: 0 }}>
              Sua assinatura foi vinculada ao laudo pericial da ERCR Engenharia. Você já pode fechar esta página.
            </p>
            <button
              onClick={onBackToApp}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Voltar ao Início
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '16px' }}>
              Por favor, confirme seus dados e assine no quadro abaixo usando o dedo ou caneta stylus.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#444', marginBottom: '4px' }}>Seu Nome</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome completo"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#444', marginBottom: '4px' }}>Cargo / Função</label>
                <input
                  type="text"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="Ex: Gerente / Motorista"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div
              className="canvas-container"
              style={{
                border: '2px dashed #bbb',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                marginBottom: '16px',
                overflow: 'hidden'
              }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '240px',
                  cursor: 'crosshair',
                  touchAction: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleClear}
                style={{
                  padding: '12px 18px',
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: submitting ? 'wait' : 'pointer'
                }}
              >
                {submitting ? 'Enviando...' : 'Confirmar e Enviar Assinatura'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
