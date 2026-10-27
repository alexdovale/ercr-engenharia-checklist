import React from 'react';
import { InspectionData } from '../types/inspection';

interface ReceiptReportProps {
  inspection: InspectionData;
}

export const ReceiptReport: React.FC<ReceiptReportProps> = ({ inspection }) => {
  const { text = {}, seq } = inspection;

  const formatDateBR = (iso?: string) => {
    if (!iso) return new Date().toLocaleDateString('pt-BR');
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const seqStr = seq ? `Nº ${String(seq.number).padStart(4, '0')}/${seq.year}` : 'Nº 1045/2026';
  const pagador = text.recPagador || text.empresa || text.respVeic || 'Cliente';
  const valor = text.valorServico || 'R$ 0,00';
  const forma = text.formaPagamento || 'Não especificada';
  const placa = text.placa || '-';
  const veiculo = [text.marca, text.modelo].filter(Boolean).join(' ') || 'Veículo';

  return (
    <div id="print-receipt" style={{ display: 'none' }}>
      <div
        className="receipt-printable-content"
        style={{
          maxWidth: '700px',
          margin: '30px auto',
          padding: '30px',
          border: '2px solid #000',
          fontFamily: "'IBM Plex Sans', sans-serif",
          color: '#111',
          background: '#fff'
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '14px', marginBottom: '20px' }}>
          <img
            src="/assets/img/logo-ercr.png"
            alt="ERCR"
            style={{ maxHeight: '55px', margin: '0 auto 8px auto', display: 'block' }}
          />
          <h2 style={{ fontSize: '16pt', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
            RECIBO DE PRESTAÇÃO DE SERVIÇOS
          </h2>
          <div style={{ fontSize: '10pt', color: '#444', marginTop: '4px', fontFamily: 'monospace' }}>
            RECIBO {seqStr} · CNPJ: 55.141.422/0001-79 · CREA/RJ
          </div>
        </div>

        <div style={{ fontSize: '12pt', lineHeight: '1.7', textAlign: 'justify', marginBottom: '24px' }}>
          <p>
            Recebemos de <strong>{pagador}</strong> a importância de <strong>{valor}</strong>, referente à realização
            de <strong>Inspeção e Perícia Técnica Veicular Mecânica</strong> no veículo <strong>{veiculo}</strong>,
            placa <strong>{placa}</strong>
            {text.chassi ? `, chassi ${text.chassi}` : ''}.
          </p>
          <p>
            <strong>Forma de Pagamento:</strong> {forma}
            {text.nfNumero ? ` · Referente à Nota Fiscal Nº ${text.nfNumero}` : ''}
          </p>
        </div>

        <div style={{ textAlign: 'right', fontSize: '11pt', margin: '30px 0 40px 0' }}>
          {text.municipio || 'Duque de Caxias/RJ'}, {formatDateBR(text.dataInsp)}.
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', minWidth: '320px', borderTop: '1px solid #000', paddingTop: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>
              ERCR ENGENHARIA MECÂNICA
            </div>
            <div style={{ fontSize: '9pt', color: '#555' }}>
              Alex do Vale Rosa Santos Nepomuceno Silva
            </div>
            <div style={{ fontSize: '9pt', color: '#555' }}>
              CREA: RJ-000000/D · Responsável Técnico
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
