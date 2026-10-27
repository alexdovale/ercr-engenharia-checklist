import React from 'react';
import { InspectionData } from '../types/inspection';
import { SECTIONS } from '../data/sections';

interface PrintReportProps {
  inspection: InspectionData;
  isModalPreview?: boolean;
}

// Reusable Radio Circle Component matching the reference PDF (○ empty / ● filled)
const RadioCircle: React.FC<{ isSelected?: boolean; style?: React.CSSProperties }> = ({
  isSelected,
  style
}) => (
  <span
    style={{
      display: 'inline-block',
      width: '9.5px',
      height: '9.5px',
      borderRadius: '50%',
      border: '1.4px solid #000',
      backgroundColor: isSelected ? '#000' : '#fff',
      verticalAlign: 'middle',
      boxSizing: 'border-box',
      flexShrink: 0,
      ...style
    }}
  />
);

// Standard Checklist Table Header
const TableHeader: React.FC = () => (
  <thead>
    <tr>
      <th className="pr-th-item">ITEM</th>
      <th className="pr-th-circle">CONFORME</th>
      <th className="pr-th-circle">
        NÃO
        <br />
        CONFORME
      </th>
      <th className="pr-th-circle">N/A</th>
    </tr>
  </thead>
);

export const PrintReport: React.FC<PrintReportProps> = ({ inspection, isModalPreview = false }) => {
  const { text = {}, radios = {}, photoUrls = {}, seq, signatures } = inspection;

  const formatDateBR = (iso?: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const seqLabel = seq ? `${String(seq.number).padStart(4, '0')}/${seq.year}` : '0031/2026';

  // Helper to render table rows for a complete section
  const renderRows = (
    sectionNum: number,
    items: (string | { text: string })[],
    startIndex: number = 0
  ) => {
    return items.map((item, localIdx) => {
      const actualIdx = startIndex + localIdx;
      const isObj = typeof item === 'object';
      const textDesc = isObj ? item.text : item;
      const itemId = `s${sectionNum}-i${actualIdx}`;
      const val = radios[itemId];

      const isC = val === 'conforme' || val === 'realizado';
      const isNC = val === 'nao_conforme' || val === 'nao_realizado';
      const isNA = val === 'na' || val === 'nao_aplicavel';

      return (
        <tr key={actualIdx}>
          <td className="pr-td-item">
            {sectionNum}.{actualIdx + 1} - {textDesc}
          </td>
          <td className="pr-td-circle">
            <RadioCircle isSelected={isC} />
          </td>
          <td className="pr-td-circle">
            <RadioCircle isSelected={isNC} />
          </td>
          <td className="pr-td-circle">
            <RadioCircle isSelected={isNA} />
          </td>
        </tr>
      );
    });
  };

  // Complete section items (unified, zero splits)
  const s2 = SECTIONS.find((s) => s.n === 2)?.items || [];
  const s3 = SECTIONS.find((s) => s.n === 3)?.items || [];
  const s4 = SECTIONS.find((s) => s.n === 4)?.items || [];
  const s5 = SECTIONS.find((s) => s.n === 5)?.items || [];
  const s6 = SECTIONS.find((s) => s.n === 6)?.items || [];
  const s7 = SECTIONS.find((s) => s.n === 7)?.items || [];
  const s8 = SECTIONS.find((s) => s.n === 8)?.items || [];
  const s9 = SECTIONS.find((s) => s.n === 9)?.items || [];
  const s10 = SECTIONS.find((s) => s.n === 10)?.items || [];
  const s11 = SECTIONS.find((s) => s.n === 11)?.items || [];
  const s12 = SECTIONS.find((s) => s.n === 12)?.items || [];

  // Collect Non-Conformities for Section 14
  const ncList: { item: string; prazo: string; desc: string; crit: string; rec: string }[] = [];
  [1, 2, 3, 4, 5, 6, 7, 8].forEach((i) => {
    const desc = text[`nc${i}_desc`] || text[`nc${i}-desc`];
    if (desc) {
      ncList.push({
        item: text[`nc${i}_item`] || text[`nc${i}-item`] || '',
        prazo: text[`nc${i}_prazo`] || text[`nc${i}-prazo`] || '',
        desc,
        crit: radios[`nc${i}-crit`] || radios[`nc${i}_crit`] || 'media',
        rec: text[`nc${i}_rec`] || text[`nc${i}-rec`] || ''
      });
    }
  });

  // Collect all photos for optional Photo Annex (Page 7+)
  const allPhotos: { label: string; url: string }[] = [];
  SECTIONS.forEach((sec) => {
    sec.items.forEach((item, idx) => {
      const isObj = typeof item === 'object';
      const itemText = isObj ? item.text : item;
      const itemId = `s${sec.n}-i${idx}`;
      const photos = photoUrls[itemId] || [];
      photos.forEach((url, pIdx) => {
        allPhotos.push({
          label: `Item ${sec.n}.${idx + 1} - ${itemText} (Foto ${pIdx + 1})`,
          url
        });
      });
    });
  });

  [1, 2, 3, 4, 5, 6, 7, 8].forEach((i) => {
    const photos = photoUrls[`nc${i}`] || [];
    const item = text[`nc${i}_item`] || text[`nc${i}-item`] || `NC-0${i}`;
    photos.forEach((url, pIdx) => {
      allPhotos.push({
        label: `Não Conformidade NC-0${i} (Item ${item}) - Foto ${pIdx + 1}`,
        url
      });
    });
  });

  (photoUrls['s13-ticket'] || []).forEach((url, pIdx) => {
    allPhotos.push({
      label: `Seção 13 - Ticket / Comprovante de Medição (Foto ${pIdx + 1})`,
      url
    });
  });

  // Photo annex chunks of 4 photos per page
  const photoPages: { label: string; url: string }[][] = [];
  for (let i = 0; i < allPhotos.length; i += 4) {
    photoPages.push(allPhotos.slice(i, i + 4));
  }

  const renderFooter = () => (
    <div className="pdf-page-footer">
      <img
        src="/assets/img/rodape.png"
        alt="Rodapé ERCR"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/rodap%C3%A9.png';
        }}
      />
    </div>
  );

  return (
    <div id={isModalPreview ? 'preview-report-content' : 'print-report'} className="pdf-document">
      {/* ========================================================================= */}
      {/* PÁGINA 1: Topo, Identificação da Inspeção, Identificação do Veículo, Sec 2 */}
      {/* ========================================================================= */}
      <div className="pdf-page">
        <div className="pdf-watermark" />
        <div className="pdf-page-content">
          {/* Logo Card Header */}
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <img
              src="/assets/img/logo-ercr.png"
              alt="ERCR Engenharia Mecânica"
              style={{
                width: '145px',
                height: 'auto',
                display: 'inline-block',
                borderRadius: '3px'
              }}
            />
          </div>

          <div
            style={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '11.5pt',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              color: '#000',
              marginBottom: '2px'
            }}
          >
            CHECKLIST DE INSPEÇÃO E PERÍCIA TÉCNICA VEICULAR
          </div>

          <div
            style={{
              textAlign: 'center',
              fontSize: '9.2pt',
              fontWeight: 600,
              color: '#222',
              marginBottom: '6px'
            }}
          >
            Nº {seqLabel}
          </div>

          {/* Seção 0: Identificação da Inspeção */}
          <div className="pr-banner">IDENTIFICAÇÃO DA INSPEÇÃO</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 0.85fr',
              gap: '2.5px 14px',
              fontSize: '7.6pt',
              marginBottom: '5px',
              lineHeight: '1.3'
            }}
          >
            <div>
              <strong>Empresa Responsável:</strong> {text.empresa || '-'}
            </div>
            <div>
              <strong>CNPJ:</strong> {text.cnpj || '-'}
            </div>
            <div>
              <strong>Data da Inspeção:</strong> {formatDateBR(text.dataInsp) || '-'}
            </div>
            <div>
              <strong>Horário:</strong> {text.horario || '-'}
            </div>
            <div>
              <strong>Local da Inspeção:</strong> {text.local || '-'}
            </div>
            <div>
              <strong>Município/UF:</strong> {text.municipio || '-'}
            </div>
            <div>
              <strong>Responsável pelo Veículo:</strong> {text.respVeic || '-'}
            </div>
            <div>
              <strong>Cargo/Função:</strong> {text.cargoFunc || '-'}
            </div>
            <div>
              <strong>Telefone:</strong> {text.telefone || '-'}
            </div>
            <div></div>
          </div>

          {/* Seção 1: Identificação do Veículo */}
          <div className="pr-banner">1. IDENTIFICAÇÃO DO VEÍCULO</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.05fr 0.95fr',
              gap: '2.5px 14px',
              fontSize: '7.6pt',
              marginBottom: '5px',
              lineHeight: '1.3'
            }}
          >
            <div>
              <strong>1.1 Placa:</strong> {text.placa || '-'}
            </div>
            <div>
              <strong>1.2 Marca/Fabricante:</strong> {text.marca || '-'}
            </div>
            <div>
              <strong>1.3 Modelo:</strong> {text.modelo || '-'}
            </div>
            <div>
              <strong>1.4 Ano de Fabricação:</strong> {text.anoFab || '-'}
            </div>
            <div>
              <strong>1.5 Ano Modelo:</strong> {text.anoModelo || '-'}
            </div>
            <div>
              <strong>1.6 Número do Chassi:</strong> {text.chassi || '-'}
            </div>
            <div>
              <strong>1.7 RENAVAM:</strong> {text.renavam || '-'}
            </div>
            <div>
              <strong>1.8 Número do Motor:</strong> {text.numMotor || '-'}
            </div>
            <div>
              <strong>1.9 Hodômetro (km):</strong> {text.hodometro || '-'}
            </div>
            <div>
              <strong>1.10 Cor:</strong> {text.cor || '-'}
            </div>
            <div>
              <strong>1.11 Tipo de Combustível:</strong> {text.combustivel || '-'}
            </div>
            <div>
              <strong>1.12 Implemento/Carroceria:</strong> {text.implemento || '-'}
            </div>
            {text.valorFipe && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  background: '#f4f4f4',
                  border: '1px solid #d4d4d4',
                  padding: '2px 6px',
                  borderRadius: '2px',
                  fontSize: '7.2pt',
                  marginTop: '1px'
                }}
              >
                <strong>Referência FIPE:</strong> {text.valorFipe}{' '}
                {text.codigoFipe ? `• Cód. ${text.codigoFipe}` : ''}{' '}
                {text.mesReferenciaFipe ? `• Ref: ${text.mesReferenciaFipe}` : ''}
              </div>
            )}
          </div>

          {/* Seção 2: Condições Gerais e Estruturais (TODOS OS 12 ITENS) */}
          <div className="pr-banner">2. CONDIÇÕES GERAIS E ESTRUTURAIS</div>
          <table className="pr-table">
            <TableHeader />
            <tbody>{renderRows(2, s2, 0)}</tbody>
          </table>
        </div>
        {renderFooter()}
      </div>

      {/* ========================================================================= */}
      {/* PÁGINA 2: Seção 3 (3.1 a 3.20) e Seção 4 (4.1 a 4.5) */}
      {/* ========================================================================= */}
      <div className="pdf-page">
        <div className="pdf-watermark" />
        <div className="pdf-page-content">
          {/* Seção 3: Motor e Sistema de Arrefecimento com quebra forçada para nova página */}
          <div
            className="pr-banner break-before"
            style={{ pageBreakBefore: 'always', breakBefore: 'page', marginTop: '2px' }}
          >
            3. MOTOR E SISTEMA DE ARREFECIMENTO
          </div>
          <table className="pr-table break-before" style={{ pageBreakBefore: 'avoid', breakBefore: 'avoid' }}>
            <TableHeader />
            <tbody>{renderRows(3, s3, 0)}</tbody>
          </table>

          {/* Seção 4: Transmissão */}
          <div className="pr-banner" style={{ marginTop: '5px' }}>
            4. TRANSMISSÃO
          </div>
          <table className="pr-table">
            <TableHeader />
            <tbody>{renderRows(4, s4, 0)}</tbody>
          </table>
        </div>
        {renderFooter()}
      </div>

      {/* ========================================================================= */}
      {/* PÁGINA 3: Seção 5 (5.1 a 5.8), Seção 6 (6.1 a 6.9) e Seção 7 (7.1 a 7.12) */}
      {/* ========================================================================= */}
      <div className="pdf-page">
        <div className="pdf-watermark" />
        <div className="pdf-page-content">
          {/* Seção 5: Sistema de Direção com quebra forçada para nova página */}
          <div
            className="pr-banner break-before"
            style={{ pageBreakBefore: 'always', breakBefore: 'page', marginTop: '2px' }}
          >
            5. SISTEMA DE DIREÇÃO
          </div>
          <table className="pr-table break-before" style={{ pageBreakBefore: 'avoid', breakBefore: 'avoid' }}>
            <TableHeader />
            <tbody>{renderRows(5, s5, 0)}</tbody>
          </table>

          {/* Seção 6: Sistema de Suspensão */}
          <div className="pr-banner" style={{ marginTop: '5px' }}>
            6. SISTEMA DE SUSPENSÃO
          </div>
          <table className="pr-table">
            <TableHeader />
            <tbody>{renderRows(6, s6, 0)}</tbody>
          </table>

          {/* Seção 7: Sistema de Freios (TODOS OS 12 ITENS) */}
          <div className="pr-banner" style={{ marginTop: '5px' }}>
            7. SISTEMA DE FREIOS
          </div>
          <table className="pr-table">
            <TableHeader />
            <tbody>{renderRows(7, s7, 0)}</tbody>
          </table>
        </div>
        {renderFooter()}
      </div>

      {/* ========================================================================= */}
      {/* PÁGINA 4: Seção 8 (8.1 a 8.8) e Seção 9 (9.1 a 9.23) */}
      {/* ========================================================================= */}
      <div className="pdf-page">
        <div className="pdf-watermark" />
        <div className="pdf-page-content">
          {/* Seção 8: Rodas e Pneus com quebra forçada para nova página */}
          <div
            className="pr-banner break-before"
            style={{ pageBreakBefore: 'always', breakBefore: 'page', marginTop: '2px' }}
          >
            8. RODAS E PNEUS
          </div>
          <table className="pr-table break-before" style={{ pageBreakBefore: 'avoid', breakBefore: 'avoid' }}>
            <TableHeader />
            <tbody>{renderRows(8, s8, 0)}</tbody>
          </table>

          {/* Seção 9: Sistema Elétrico, Iluminação e Sinalização (TODOS OS 23 ITENS) */}
          <div className="pr-banner" style={{ marginTop: '5px' }}>
            9. SISTEMA ELÉTRICO, ILUMINAÇÃO E SINALIZAÇÃO
          </div>
          <table className="pr-table">
            <TableHeader />
            <tbody>{renderRows(9, s9, 0)}</tbody>
          </table>
        </div>
        {renderFooter()}
      </div>

      {/* ========================================================================= */}
      {/* PÁGINA 5: Seção 10 (10.1 a 10.7), Seção 11 (11.1 a 11.10) e Seção 12 (12.1 a 12.6) */}
      {/* ========================================================================= */}
      <div className="pdf-page">
        <div className="pdf-watermark" />
        <div className="pdf-page-content">
          {/* Seção 10: Vidros e Acessórios com quebra forçada para nova página */}
          <div
            className="pr-banner break-before"
            style={{ pageBreakBefore: 'always', breakBefore: 'page', marginTop: '2px' }}
          >
            10. VIDROS E ACESSÓRIOS
          </div>
          <table className="pr-table break-before" style={{ pageBreakBefore: 'avoid', breakBefore: 'avoid' }}>
            <TableHeader />
            <tbody>{renderRows(10, s10, 0)}</tbody>
          </table>

          {/* Seção 11: Equipamentos e Dispositivos de Segurança */}
          <div className="pr-banner" style={{ marginTop: '5px' }}>
            11. EQUIPAMENTOS E DISPOSITIVOS DE SEGURANÇA
          </div>
          <table className="pr-table">
            <TableHeader />
            <tbody>{renderRows(11, s11, 0)}</tbody>
          </table>

          {/* Seção 12: Componentes Relacionados à Segurança Operacional (TODOS OS 6 ITENS) */}
          <div className="pr-banner" style={{ marginTop: '5px' }}>
            12. COMPONENTES RELACIONADOS À SEGURANÇA OPERACIONAL
          </div>
          <table className="pr-table">
            <TableHeader />
            <tbody>{renderRows(12, s12, 0)}</tbody>
          </table>
        </div>
        {renderFooter()}
      </div>

      {/* ========================================================================= */}
      {/* PÁGINA 6: Seção 13, Seção 14, Seção 15 E ASSINATURAS */}
      {/* ========================================================================= */}
      <div className="pdf-page">
        <div className="pdf-watermark" />
        <div className="pdf-page-content">
          {/* Seção 13: Avaliação Funcional com quebra forçada para nova página */}
          <div
            className="pr-banner break-before"
            style={{ pageBreakBefore: 'always', breakBefore: 'page', marginTop: '2px' }}
          >
            13. AVALIAÇÃO FUNCIONAL
          </div>
          <div
            style={{
              fontSize: '7.8pt',
              margin: '3px 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span>
              <strong>Tipo de Motor:</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RadioCircle isSelected={radios.tipoMotor13 === 'ciclo_otto'} /> Ciclo Otto
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RadioCircle isSelected={radios.tipoMotor13 === 'diesel'} /> Diesel
            </span>
          </div>

          <table className="pr-table" style={{ marginTop: '2px', marginBottom: '4px' }}>
            <thead>
              <tr>
                <th
                  style={{
                    width: '55%',
                    padding: '2.5px 6px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '7.2pt',
                    backgroundColor: '#1e1e1e',
                    color: '#fff',
                    border: '1px solid #1e1e1e',
                    textTransform: 'uppercase'
                  }}
                >
                  MEDIÇÕES
                </th>
                <th
                  style={{
                    width: '45%',
                    padding: '2.5px 6px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '7.2pt',
                    backgroundColor: '#1e1e1e',
                    color: '#fff',
                    border: '1px solid #1e1e1e',
                    textTransform: 'uppercase'
                  }}
                >
                  VALORES
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-td-item">RPM Marcha Lenta</td>
                <td className="pr-td-item">{text.rpmLenta || '-'}</td>
              </tr>
              <tr>
                <td className="pr-td-item">RPM Alta</td>
                <td className="pr-td-item">{text.rpmAlta || '-'}</td>
              </tr>
              <tr>
                <td className="pr-td-item">Nível de Ruído (dB) / Limite Permitido</td>
                <td className="pr-td-item">
                  Medido: {text.nivelRuido || '-'} | Limite: {text.limiteRuido || '95'} dB
                </td>
              </tr>
              {radios.tipoMotor13 !== 'diesel' ? (
                <>
                  <tr>
                    <td className="pr-td-item">CO (%) - Lenta / Alta</td>
                    <td className="pr-td-item">
                      Lenta: {text.coLenta || '-'} | Alta: {text.coAlta || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-td-item">HC (ppm) - Lenta / Alta</td>
                    <td className="pr-td-item">
                      Lenta: {text.hcLenta || '-'} | Alta: {text.hcAlta || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-td-item">Fator Lambda (Alta)</td>
                    <td className="pr-td-item">{text.lambdaAlta || '-'}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="pr-td-item">Opacidade (k) - Diesel</td>
                  <td className="pr-td-item">{text.opacidade || '-'} m⁻¹</td>
                </tr>
              )}
            </tbody>
          </table>

          <div
            style={{
              fontSize: '7.8pt',
              margin: '3px 0 5px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span>
              <strong>Resultado da Avaliação de Emissões:</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RadioCircle isSelected={radios.resultEmissoes === 'conforme'} /> Aprovado
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RadioCircle isSelected={radios.resultEmissoes === 'nao_conforme'} /> Reprovado
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <RadioCircle isSelected={radios.resultEmissoes === 'na'} /> N/A (Isento)
            </span>
          </div>

          {/* Seção 14: Registro de Não Conformidades */}
          <div className="pr-banner">14. REGISTRO DE NÃO CONFORMIDADES</div>
          {ncList.length === 0 ? (
            <div
              style={{
                fontSize: '7.5pt',
                fontStyle: 'italic',
                color: '#555',
                padding: '3px 2px',
                marginBottom: '4px'
              }}
            >
              Nenhuma Não Conformidade registrada.
            </div>
          ) : (
            <table className="pr-table" style={{ marginBottom: '5px' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      width: '12%',
                      padding: '2.5px 4px',
                      fontSize: '7pt',
                      backgroundColor: '#1e1e1e',
                      color: '#fff',
                      border: '1px solid #1e1e1e',
                      textAlign: 'left'
                    }}
                  >
                    ITEM
                  </th>
                  <th
                    style={{
                      width: '44%',
                      padding: '2.5px 4px',
                      fontSize: '7pt',
                      backgroundColor: '#1e1e1e',
                      color: '#fff',
                      border: '1px solid #1e1e1e',
                      textAlign: 'left'
                    }}
                  >
                    DESCRIÇÃO DA NÃO CONFORMIDADE
                  </th>
                  <th
                    style={{
                      width: '14%',
                      padding: '2.5px 4px',
                      fontSize: '7pt',
                      backgroundColor: '#1e1e1e',
                      color: '#fff',
                      border: '1px solid #1e1e1e',
                      textAlign: 'center'
                    }}
                  >
                    CRITICIDADE
                  </th>
                  <th
                    style={{
                      width: '15%',
                      padding: '2.5px 4px',
                      fontSize: '7pt',
                      backgroundColor: '#1e1e1e',
                      color: '#fff',
                      border: '1px solid #1e1e1e',
                      textAlign: 'center'
                    }}
                  >
                    PRAZO
                  </th>
                  <th
                    style={{
                      width: '15%',
                      padding: '2.5px 4px',
                      fontSize: '7pt',
                      backgroundColor: '#1e1e1e',
                      color: '#fff',
                      border: '1px solid #1e1e1e',
                      textAlign: 'left'
                    }}
                  >
                    RECOMENDAÇÃO
                  </th>
                </tr>
              </thead>
              <tbody>
                {ncList.map((nc, idx) => (
                  <tr key={idx}>
                    <td className="pr-td-item" style={{ fontWeight: 600 }}>
                      {nc.item || `NC-0${idx + 1}`}
                    </td>
                    <td className="pr-td-item">{nc.desc}</td>
                    <td
                      className="pr-td-item"
                      style={{
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color:
                          nc.crit === 'alta'
                            ? '#C62828'
                            : nc.crit === 'media'
                            ? '#EF6C00'
                            : '#2E7D32'
                      }}
                    >
                      {nc.crit}
                    </td>
                    <td className="pr-td-item" style={{ textAlign: 'center' }}>
                      {formatDateBR(nc.prazo) || '-'}
                    </td>
                    <td className="pr-td-item">{nc.rec || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Seção 15: Conclusão da Inspeção */}
          <div className="pr-banner">15. CONCLUSÃO DA INSPEÇÃO</div>

          <div
            style={{
              border: '1px solid #000',
              padding: '4px 8px',
              margin: '3px 0 4px 0',
              fontSize: '7.5pt'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase' }}>
              CLASSIFICAÇÃO FINAL
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RadioCircle isSelected={radios.classificacao === 'apto'} /> APTO PARA OPERAÇÃO
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RadioCircle isSelected={radios.classificacao === 'restricoes'} /> APTO PARA
                OPERAÇÃO COM RESTRIÇÕES
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <RadioCircle isSelected={radios.classificacao === 'inapto'} /> INAPTO PARA OPERAÇÃO
              </span>
            </div>
          </div>

          <div style={{ marginTop: '2px' }}>
            <div style={{ fontWeight: 700, fontSize: '7.5pt', marginBottom: '2px' }}>
              Considerações Técnicas:
            </div>
            <div
              style={{
                border: '1px solid #ccc',
                padding: '4px 6px',
                minHeight: '28px',
                whiteSpace: 'pre-wrap',
                color: '#222',
                fontSize: '7.2pt',
                lineHeight: '1.25'
              }}
            >
              {text.consideracoes || 'Veículo inspecionado conforme normas técnicas e padrões do fabricante.'}
            </div>
          </div>

          {/* Assinaturas Técnicas */}
          <div className="pr-banner" style={{ marginTop: '5px' }}>
            ASSINATURAS
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginTop: '4px',
              fontSize: '7.5pt'
            }}
          >
            {/* Inspetor */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: '30px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center'
                }}
              >
                {signatures?.respIns?.image ? (
                  <img
                    src={signatures.respIns.image}
                    alt="Assinatura Inspetor"
                    style={{ maxHeight: '30px', maxWidth: '150px', objectFit: 'contain' }}
                  />
                ) : text.respInsAssinatura ? (
                  <span style={{ fontFamily: 'cursive', fontSize: '10.5pt' }}>
                    {text.respInsAssinatura}
                  </span>
                ) : null}
              </div>
              <div
                style={{ borderTop: '1px solid #000', width: '85%', margin: '2px auto 3px auto' }}
              />
              <div
                style={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '7.2pt',
                  marginBottom: '1px'
                }}
              >
                RESPONSÁVEL PELA INSPEÇÃO
              </div>
              <div
                style={{
                  textAlign: 'left',
                  display: 'inline-block',
                  fontSize: '7.2pt',
                  lineHeight: '1.25'
                }}
              >
                <div>
                  <strong>Nome:</strong>{' '}
                  {text.respInsNome || 'Alex do Vale Rosa Santos Nepomuceno Silva'}
                </div>
                <div>
                  <strong>CREA/Registro:</strong> {text.respInsCrea || 'RJ-000000/D'}
                </div>
                <div>
                  <strong>Data:</strong> {formatDateBR(text.respInsData || text.dataInsp)}
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: '30px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center'
                }}
              >
                {signatures?.repCli?.image ? (
                  <img
                    src={signatures.repCli.image}
                    alt="Assinatura Cliente"
                    style={{ maxHeight: '30px', maxWidth: '150px', objectFit: 'contain' }}
                  />
                ) : text.repCliAssinatura ? (
                  <span style={{ fontFamily: 'cursive', fontSize: '10.5pt' }}>
                    {text.repCliAssinatura}
                  </span>
                ) : null}
              </div>
              <div
                style={{ borderTop: '1px solid #000', width: '85%', margin: '2px auto 3px auto' }}
              />
              <div
                style={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '7.2pt',
                  marginBottom: '1px'
                }}
              >
                REPRESENTANTE DO CLIENTE
              </div>
              <div
                style={{
                  textAlign: 'left',
                  display: 'inline-block',
                  fontSize: '7.2pt',
                  lineHeight: '1.25'
                }}
              >
                <div>
                  <strong>Nome:</strong> {text.repCliNome || text.respVeic || '-'}
                </div>
                <div>
                  <strong>Cargo:</strong> {text.repCliCargo || text.cargoFunc || '-'}
                </div>
                <div>
                  <strong>Data:</strong> {formatDateBR(text.repCliData || text.dataInsp)}
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderFooter()}
      </div>

      {/* ========================================================================= */}
      {/* PÁGINAS 7+: ANEXO FOTOGRÁFICO (somente exibido se houver fotos anexadas) */}
      {/* ========================================================================= */}
      {photoPages.map((pagePhotos, pIdx) => (
        <div key={pIdx} className="pdf-page">
          <div className="pdf-watermark" />
          <div className="pdf-page-content">
            <div
              className="pr-banner break-before"
              style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
            >
              ANEXO FOTOGRÁFICO - REGISTRO DE EVIDÊNCIAS TÉCNICAS (PÁGINA {pIdx + 7})
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginTop: '8px'
              }}
            >
              {pagePhotos.map((photo, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '3px',
                    padding: '5px',
                    background: '#fff'
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    style={{
                      width: '100%',
                      height: '78mm',
                      objectFit: 'cover',
                      display: 'block',
                      borderRadius: '2px',
                      background: '#eee'
                    }}
                  />
                  <div
                    style={{
                      fontSize: '7.2pt',
                      fontWeight: 600,
                      color: '#222',
                      marginTop: '3px',
                      lineHeight: '1.2'
                    }}
                  >
                    {photo.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {renderFooter()}
        </div>
      ))}
    </div>
  );
};
