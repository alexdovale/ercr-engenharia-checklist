import React, { useRef, useEffect, useState } from 'react';

interface SignatureCanvasProps {
  id: string;
  role: 'respIns' | 'repCli';
  label: string;
  initialImage?: string;
  typedValue?: string;
  onTypedChange?: (val: string) => void;
  onSignatureDrawn: (dataUrl: string | null) => void;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  id,
  role,
  label,
  initialImage,
  typedValue = '',
  onTypedChange,
  onSignatureDrawn
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const hasDrawn = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!initialImage);

  // Resize canvas according to display width
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = Math.min(rect.width || 700, 700);
    const height = 150;

    // Save existing content before resizing
    let tempImg: ImageData | null = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        tempImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {
        // ignore
      }
    }

    canvas.width = width;
    canvas.height = height;

    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';

      if (initialImage && isEmpty) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          hasDrawn.current = true;
          setIsEmpty(false);
        };
        img.src = initialImage;
      }
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    setIsEmpty(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
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

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    isDrawing.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureDrawn(dataUrl);
    } catch (e) {
      // ignore
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    setIsEmpty(true);
    onSignatureDrawn(null);
  };

  return (
    <div className="sig-dynamic-container sig-container-canvas field" style={{ gridColumn: '1 / -1' }}>
      <label>{label}</label>
      <div className="sig-pad-wrap" style={{ position: 'relative' }}>
        <canvas
          id={id}
          ref={canvasRef}
          className="sig-pad"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            display: 'block',
            width: '100%',
            height: '150px',
            background: '#fafafa',
            border: '1.5px dashed #bbb',
            borderRadius: '6px',
            touchAction: 'none',
            cursor: 'crosshair'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <button
            type="button"
            className="btn-link sig-clear"
            onClick={handleClear}
            style={{ fontSize: '11px', color: '#b00020', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            🗑️ Limpar Assinatura
          </button>
          {!isEmpty && (
            <span style={{ fontSize: '10.5px', color: '#2E7D32', fontWeight: '600' }}>
              ✓ Assinatura capturada
            </span>
          )}
        </div>
      </div>
      <input
        type="text"
        placeholder="ou digite o nome completo, se preferir não assinar em tela"
        value={typedValue}
        onChange={(e) => onTypedChange && onTypedChange(e.target.value)}
        style={{ marginTop: '6px' }}
      />
    </div>
  );
};
