import React, { useState } from 'react';
import { InspectionData } from '../types/inspection';
import { PrintReport } from './PrintReport';
import { Printer, Download, X, CheckCircle2, ShieldCheck, FileText, Loader2 } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: InspectionData;
  onPrintNative: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  inspection,
  onPrintNative
}) => {
  const [downloading, setDownloading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const placa = inspection.text?.placa || 'VEICULO';
  const seqNum = inspection.seq ? `${inspection.seq.number}-${inspection.seq.year}` : 'RASCUNHO';
  const filename = `Laudo_Inspecao_${placa}_${seqNum}.pdf`;

  // Direct download of PDF using html2pdf.js
  const handleDownloadDirectPDF = async () => {
    try {
      setDownloading(true);

      const element = document.getElementById('modal-pdf-content-to-capture');
      if (!element) {
        throw new Error('Elemento do laudo não encontrado na tela.');
      }

      // Check if html2pdf is available globally from script
      // @ts-ignore
      if (typeof window.html2pdf !== 'undefined') {
        const opt = {
          margin: 0,
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            scrollY: 0
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
          },
          pagebreak: {
            mode: ['css', 'legacy'],
            after: '.pdf-page',
            avoid: ['.pr-table', '.pr-banner', 'tr']
          }
        };

        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
        setToastMsg(`✅ Arquivo ${filename} baixado com sucesso!`);
      } else {
        // Fallback to native print if library script is blocked
        onPrintNative();
        setToastMsg('Janela de impressão/salvar em PDF aberta.');
      }
    } catch (err: any) {
      console.warn('Erro na geração direta html2pdf, acionando impressão nativa:', err);
      onPrintNative();
    } finally {
      setDownloading(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '92vh',
          background: '#1a1a1a',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          border: '1px solid #333',
          overflow: 'hidden'
        }}
      >
        {/* Modal Top Action Bar */}
        <div
          style={{
            padding: '14px 20px',
            background: '#000',
            borderBottom: '1px solid #2a2a2a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            color: '#fff'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#4CAF50" />
              <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, letterSpacing: '0.5px' }}>
                Emissão do Laudo Técnico Pericial Veicular
              </h2>
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
              ERCR Engenharia Mecânica · {inspection.seq ? `Laudo Nº ${inspection.seq.number}/${inspection.seq.year}` : 'Novo Laudo'} · Placa: {placa}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Direct download button */}
            <button
              type="button"
              onClick={handleDownloadDirectPDF}
              disabled={downloading}
              style={{
                background: '#2E7D32',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: downloading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(46,125,50,0.3)'
              }}
              title="Baixar diretamente o arquivo .pdf no seu computador ou celular"
            >
              {downloading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={15} />
                  Baixar Arquivo PDF (.pdf)
                </>
              )}
            </button>

            {/* Native Print button */}
            <button
              type="button"
              onClick={onPrintNative}
              style={{
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Abrir diálogo de impressão do navegador ou salvar como PDF"
            >
              <Printer size={15} color="#2196F3" />
              Imprimir Laudo
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px'
              }}
              title="Fechar visualização"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Toast notification inside modal */}
        {toastMsg && (
          <div
            style={{
              background: '#2e7d32',
              color: '#fff',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '600',
              textAlign: 'center'
            }}
          >
            {toastMsg}
          </div>
        )}

        {/* Scrollable Live Document Preview */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#404040',
            padding: '24px 16px',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {/* Printable Document Representation */}
          <div
            id="modal-pdf-content-to-capture"
            style={{
              background: 'transparent',
              color: '#111',
              width: '210mm',
              maxWidth: '100%',
              padding: 0,
              fontFamily: "'IBM Plex Sans', sans-serif"
            }}
          >
            <PrintReport inspection={inspection} isModalPreview={true} />
          </div>
        </div>
      </div>
    </div>
  );
};
