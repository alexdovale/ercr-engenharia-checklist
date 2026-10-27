import React from 'react';
import { InspectionData } from '../types/inspection';

interface ManagerialPrintReportProps {
  inspections: InspectionData[];
  selectedPeriod: string;
  selectedCompany: string;
  selectedCategory: string;
}

export const ManagerialPrintReport: React.FC<ManagerialPrintReportProps> = ({
  inspections,
  selectedPeriod,
  selectedCompany,
  selectedCategory
}) => {
  const total = inspections.length;
  let aptos = 0;
  let restricoes = 0;
  let inaptos = 0;
  let totalNCs = 0;
  let ncsAlta = 0;
  let ncsMedia = 0;
  let ncsBaixa = 0;

  inspections.forEach((item) => {
    const c = item.radios?.classificacao;
    if (c === 'apto') aptos++;
    else if (c === 'restricoes') restricoes++;
    else if (c === 'inapto') inaptos++;

    for (let i = 1; i <= 5; i++) {
      const desc = item.text?.[`nc${i}_desc`] || item.text?.[`nc${i}-desc`];
      if (desc) {
        totalNCs++;
        const crit = item.radios?.[`nc${i}-crit`] || item.radios?.[`nc${i}_crit`];
        if (crit === 'alta') ncsAlta++;
        else if (crit === 'baixa') ncsBaixa++;
        else ncsMedia++;
      }
    }
  });

  const approvalRate = total > 0 ? Math.round((aptos / total) * 100) : 0;
  const emissionDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div id="print-managerial-report" style={{ display: 'none' }}>
      <div
        className="managerial-report-content"
        style={{
          maxWidth: '800px',
          margin: '20px auto',
          padding: '24px',
          fontFamily: "'IBM Plex Sans', sans-serif",
          color: '#111',
          background: '#fff'
        }}
      >
        {/* Header Block */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '18px' }}>
          <img
            src="/assets/img/logo-ercr.png"
            alt="ERCR Engenharia"
            style={{ maxHeight: '55px', margin: '0 auto 8px auto', display: 'block' }}
          />
          <h2 style={{ fontSize: '15pt', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#000' }}>
            RELATÓRIO GERENCIAL DE INSPEÇÕES E INDICADORES TÉCNICOS
          </h2>
          <div style={{ fontSize: '9.5pt', color: '#444', marginTop: '4px', fontFamily: 'monospace' }}>
            ERCR ENGENHARIA MECÂNICA · CNPJ: 55.141.422/0001-79 · CREA/RJ
          </div>
        </div>

        {/* Filter Summary Box */}
        <div style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: '9.5pt' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            <div><strong>Período Analisado:</strong> {selectedPeriod === 'all' ? 'Histórico Completo' : selectedPeriod === 'year' ? 'Ano Vigente (2026)' : 'Últimos 6 Meses'}</div>
            <div><strong>Empresa / Frotista:</strong> {selectedCompany === 'all' ? 'Todas as Frotas' : selectedCompany}</div>
            <div><strong>Categoria:</strong> {selectedCategory === 'all' ? 'Todas as Categorias' : selectedCategory}</div>
            <div><strong>Data de Emissão:</strong> {emissionDate}</div>
          </div>
        </div>

        {/* Consolidated KPIs */}
        <h3 style={{ fontSize: '11pt', textTransform: 'uppercase', borderBottom: '1px solid #222', paddingBottom: '4px', marginBottom: '10px' }}>
          1. Indicadores Consolidados de Conformidade
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px', fontSize: '9pt' }}>
          <thead>
            <tr style={{ background: '#222', color: '#fff' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #222' }}>Indicador</th>
              <th style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #222' }}>Quantidade</th>
              <th style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #222' }}>Proporção (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '6px 10px', border: '1px solid #ccc' }}><strong>Total de Veículos Inspecionados</strong></td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc', fontWeight: 'bold' }}>{total}</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc' }}>100%</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 10px', border: '1px solid #ccc', color: '#2e7d32' }}>✓ Apto para Operação (Sem restrições)</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc', fontWeight: 'bold' }}>{aptos}</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc' }}>{total > 0 ? ((aptos / total) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 10px', border: '1px solid #ccc', color: '#e65100' }}>⚠ Apto para Operação com Restrições</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc', fontWeight: 'bold' }}>{restricoes}</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc' }}>{total > 0 ? ((restricoes / total) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 10px', border: '1px solid #ccc', color: '#c62828' }}>✕ Inapto para Operação (Interditado)</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc', fontWeight: 'bold' }}>{inaptos}</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc' }}>{total > 0 ? ((inaptos / total) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr style={{ background: '#fafafa' }}>
              <td style={{ padding: '6px 10px', border: '1px solid #ccc' }}><strong>Total de Não Conformidades Apontadas</strong></td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc', fontWeight: 'bold' }}>{totalNCs}</td>
              <td style={{ padding: '6px 10px', textAlign: 'center', border: '1px solid #ccc' }}>
                Alta: {ncsAlta} · Média: {ncsMedia} · Baixa: {ncsBaixa}
              </td>
            </tr>
          </tbody>
        </table>

        {/* List of Vehicles Inspected in this Scope */}
        <h3 style={{ fontSize: '11pt', textTransform: 'uppercase', borderBottom: '1px solid #222', paddingBottom: '4px', marginBottom: '10px' }}>
          2. Relação de Veículos Avaliados no Período
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '8.5pt' }}>
          <thead>
            <tr style={{ background: '#222', color: '#fff' }}>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #222' }}>Laudo / Data</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #222' }}>Placa</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #222' }}>Empresa</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #222' }}>Veículo / Modelo</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #222' }}>Resultado</th>
              <th style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #222' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((rec, idx) => {
              const seq = rec.seq ? `Nº ${String(rec.seq.number).padStart(4, '0')}/${rec.seq.year}` : 'Rascunho';
              const date = rec.text?.dataInsp || '-';
              const placa = rec.text?.placa || '-';
              const empresa = rec.text?.empresa || '-';
              const modelo = [rec.text?.marca, rec.text?.modelo].filter(Boolean).join(' ') || '-';
              const classif = rec.radios?.classificacao;
              const status = rec.status === 'revisado' ? 'Aprovado' : rec.status === 'pendente_revisao' ? 'Pendente' : 'Rascunho';

              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                    {seq} <br /><span style={{ color: '#777', fontSize: '7.5pt' }}>{date}</span>
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {placa}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{empresa}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{modelo}</td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                    {classif === 'apto' && <span style={{ color: '#2e7d32' }}>APTO</span>}
                    {classif === 'restricoes' && <span style={{ color: '#e65100' }}>RESTRIÇÕES</span>}
                    {classif === 'inapto' && <span style={{ color: '#c62828' }}>INAPTO</span>}
                    {!classif && <span style={{ color: '#777' }}>-</span>}
                  </td>
                  <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '8pt' }}>
                    {status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Conclusion / Engineering Signoff */}
        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
          <div style={{ fontSize: '8.5pt', color: '#666', maxWidth: '400px' }}>
            Documento emitido automaticamente pelo Sistema Integrado de Inspeção Veicular da ERCR Engenharia Mecânica.
            Válido para fins gerenciais, controle de manutenção de frotas e auditorias de segurança operacional.
          </div>
          <div style={{ textAlign: 'center', minWidth: '260px' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9pt' }}>
                Alex do Vale Rosa Santos Nepomuceno Silva
              </div>
              <div style={{ fontSize: '8pt', color: '#555' }}>
                CREA: RJ-000000/D · Engenheiro Mecânico Responsável
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
