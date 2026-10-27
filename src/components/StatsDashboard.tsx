import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { InspectionData } from '../types/inspection';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Calendar,
  Layers,
  Award,
  Download,
  Printer,
  Filter,
  Building,
  Truck
} from 'lucide-react';

interface StatsDashboardProps {
  inspections: InspectionData[];
  onBackToList: () => void;
  onNewInspection: () => void;
  onPrintManagerialReport: (
    filtered: InspectionData[],
    period: string,
    company: string,
    category: string
  ) => void;
}

const RESULT_COLORS: Record<string, string> = {
  'Apto': '#2E7D32',
  'Com Restrições': '#ED6C02',
  'Inapto': '#C62828',
  'Pendente/Outro': '#757575'
};

const CRIT_COLORS: Record<string, string> = {
  'Baixa': '#2E7D32',
  'Média': '#ED6C02',
  'Alta': '#C62828'
};

const STATUS_COLORS: Record<string, string> = {
  'Aprovados': '#2E7D32',
  'Pendentes': '#ED6C02',
  'Rascunhos': '#555555'
};

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  inspections,
  onBackToList,
  onNewInspection,
  onPrintManagerialReport
}) => {
  // Advanced Filter states
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '6m' | 'year'>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Extract unique companies for dropdown
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((item) => {
      if (item.text.empresa && item.text.empresa.trim()) {
        set.add(item.text.empresa.trim());
      }
    });
    return Array.from(set).sort();
  }, [inspections]);

  // Apply all advanced filters
  const filteredInspections = useMemo(() => {
    const now = new Date();

    return inspections.filter((item) => {
      // 1. Period Filter
      const dateStr = item.text.dataInsp || item.createdAt;
      if (selectedPeriod !== 'all') {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (selectedPeriod === 'year') {
          if (d.getFullYear() !== now.getFullYear()) return false;
        } else if (selectedPeriod === '6m') {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          if (d < sixMonthsAgo) return false;
        }
      }

      // 2. Company Filter
      if (selectedCompany !== 'all') {
        if ((item.text.empresa || '').trim() !== selectedCompany) {
          return false;
        }
      }

      // 3. Category / Implement Filter
      if (selectedCategory !== 'all') {
        const textToSearch = [
          item.text.modelo || '',
          item.text.implemento || '',
          item.text.marca || ''
        ].join(' ').toLowerCase();

        if (selectedCategory === 'caminhao') {
          if (!textToSearch.includes('caminhão') && !textToSearch.includes('cavalo') && !textToSearch.includes('actros') && !textToSearch.includes('fh') && !textToSearch.includes('constellation') && !textToSearch.includes('cargo') && !textToSearch.includes('scania')) {
            return false;
          }
        } else if (selectedCategory === 'bau') {
          if (!textToSearch.includes('baú') && !textToSearch.includes('frigorífico') && !textToSearch.includes('sider') && !textToSearch.includes('carroceria')) {
            return false;
          }
        } else if (selectedCategory === 'utilitario') {
          if (textToSearch.includes('caminhão') || textToSearch.includes('cavalo') || textToSearch.includes('actros') || textToSearch.includes('fh')) {
            return false;
          }
        }
      }

      // 4. Status Filter
      if (selectedStatus !== 'all') {
        if (item.status !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, selectedPeriod, selectedCompany, selectedCategory, selectedStatus]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = filteredInspections.length;
    let aptos = 0;
    let restricoes = 0;
    let inaptos = 0;
    let totalNCs = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let thisMonthCount = 0;

    filteredInspections.forEach((item) => {
      const classif = item.radios.classificacao;
      if (classif === 'apto') aptos++;
      else if (classif === 'restricoes') restricoes++;
      else if (classif === 'inapto') inaptos++;

      // Check NC count
      for (let i = 1; i <= 5; i++) {
        if (item.text[`nc${i}_desc`] || item.text[`nc${i}-desc`]) {
          totalNCs++;
        }
      }

      const dateStr = item.text.dataInsp || item.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          thisMonthCount++;
        }
      }
    });

    const approvalRate = total > 0 ? Math.round((aptos / total) * 100) : 0;
    const ncRate = total > 0 ? (totalNCs / total).toFixed(1) : '0';

    return {
      total,
      aptos,
      restricoes,
      inaptos,
      approvalRate,
      totalNCs,
      thisMonthCount,
      ncRate
    };
  }, [filteredInspections]);

  // Distribution of Results (Apto / Restrições / Inapto)
  const resultDistributionData = useMemo(() => {
    let apto = 0;
    let restricoes = 0;
    let inapto = 0;
    let naoDefinido = 0;

    filteredInspections.forEach((item) => {
      const c = item.radios.classificacao;
      if (c === 'apto') apto++;
      else if (c === 'restricoes') restricoes++;
      else if (c === 'inapto') inapto++;
      else naoDefinido++;
    });

    const data = [
      { name: 'Apto', value: apto, color: RESULT_COLORS['Apto'] },
      { name: 'Com Restrições', value: restricoes, color: RESULT_COLORS['Com Restrições'] },
      { name: 'Inapto', value: inapto, color: RESULT_COLORS['Inapto'] }
    ];

    if (naoDefinido > 0) {
      data.push({ name: 'Pendente/Outro', value: naoDefinido, color: RESULT_COLORS['Pendente/Outro'] });
    }

    return data.filter((d) => d.value > 0);
  }, [filteredInspections]);

  // Volume of Inspections per Month
  const inspectionsByMonthData = useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string; name: string; total: number; aptos: number; inaptos: number; restricoes: number }> = {};

    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
      monthlyMap[key] = { monthKey: key, name: label, total: 0, aptos: 0, inaptos: 0, restricoes: 0 };
    }

    filteredInspections.forEach((item) => {
      const dateStr = item.text.dataInsp || item.createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].total++;
        const c = item.radios.classificacao;
        if (c === 'apto') monthlyMap[key].aptos++;
        else if (c === 'restricoes') monthlyMap[key].restricoes++;
        else if (c === 'inapto') monthlyMap[key].inaptos++;
      }
    });

    return Object.values(monthlyMap);
  }, [filteredInspections]);

  // Breakdown by Status
  const statusDistributionData = useMemo(() => {
    let rascunho = 0;
    let pendente = 0;
    let revisado = 0;

    filteredInspections.forEach((item) => {
      if (item.status === 'rascunho') rascunho++;
      else if (item.status === 'pendente_revisao') pendente++;
      else if (item.status === 'revisado') revisado++;
      else rascunho++;
    });

    return [
      { name: 'Aprovados', value: revisado, fill: STATUS_COLORS['Aprovados'] },
      { name: 'Pendentes', value: pendente, fill: STATUS_COLORS['Pendentes'] },
      { name: 'Rascunhos', value: rascunho, fill: STATUS_COLORS['Rascunhos'] }
    ];
  }, [filteredInspections]);

  // Breakdown of NCs by Criticality
  const ncCriticalityData = useMemo(() => {
    let baixa = 0;
    let media = 0;
    let alta = 0;

    filteredInspections.forEach((item) => {
      for (let i = 1; i <= 5; i++) {
        const crit = item.radios[`nc${i}-crit`] || item.radios[`nc${i}_crit`];
        const desc = item.text[`nc${i}_desc`] || item.text[`nc${i}-desc`];
        if (desc) {
          if (crit === 'baixa') baixa++;
          else if (crit === 'alta') alta++;
          else media++;
        }
      }
    });

    return [
      { name: 'Baixa', value: baixa, fill: CRIT_COLORS['Baixa'] },
      { name: 'Média', value: media, fill: CRIT_COLORS['Média'] },
      { name: 'Alta', value: alta, fill: CRIT_COLORS['Alta'] }
    ].filter((d) => d.value > 0);
  }, [filteredInspections]);

  // Top Manufacturers
  const topMarcasData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredInspections.forEach((item) => {
      const marca = item.text.marca?.trim() || 'Não informada';
      counts[marca] = (counts[marca] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredInspections]);

  // Export Data to Excel/CSV in Brazilian Portuguese format
  const handleExportCSV = () => {
    if (filteredInspections.length === 0) {
      alert('Não há inspeções disponíveis para exportação no filtro selecionado.');
      return;
    }

    const headers = [
      'Nº Laudo',
      'Data da Inspeção',
      'Placa',
      'Empresa / Frotista',
      'CNPJ',
      'Marca',
      'Modelo',
      'Ano Fab/Mod',
      'Chassi',
      'Hodômetro (km)',
      'Combustível',
      'Resultado (Classificação)',
      'Status do Laudo',
      'Total de Não Conformidades',
      'Responsável Inspeção',
      'CREA',
      'Valor do Serviço',
      'Forma de Pagamento'
    ];

    const rows = filteredInspections.map((rec) => {
      let ncTotal = 0;
      for (let i = 1; i <= 5; i++) {
        if (rec.text[`nc${i}_desc`] || rec.text[`nc${i}-desc`]) ncTotal++;
      }

      const seq = rec.seq ? `${rec.seq.number}/${rec.seq.year}` : 'Rascunho';
      const classif =
        rec.radios.classificacao === 'apto'
          ? 'Apto'
          : rec.radios.classificacao === 'restricoes'
          ? 'Apto com Restrições'
          : rec.radios.classificacao === 'inapto'
          ? 'Inapto'
          : 'Pendente';

      const status =
        rec.status === 'revisado'
          ? 'Aprovado'
          : rec.status === 'pendente_revisao'
          ? 'Pendente de Revisão'
          : 'Rascunho';

      return [
        `"${seq}"`,
        `"${rec.text.dataInsp || ''}"`,
        `"${rec.text.placa || ''}"`,
        `"${(rec.text.empresa || '').replace(/"/g, '""')}"`,
        `"${rec.text.cnpj || ''}"`,
        `"${rec.text.marca || ''}"`,
        `"${(rec.text.modelo || '').replace(/"/g, '""')}"`,
        `"${rec.text.anoFab || ''}/${rec.text.anoModelo || ''}"`,
        `"${rec.text.chassi || ''}"`,
        `"${rec.text.hodometro || ''}"`,
        `"${rec.text.combustivel || ''}"`,
        `"${classif}"`,
        `"${status}"`,
        `"${ncTotal}"`,
        `"${(rec.text.respInsNome || '').replace(/"/g, '""')}"`,
        `"${rec.text.respInsCrea || ''}"`,
        `"${rec.text.valorServico || ''}"`,
        `"${rec.text.formaPagamento || ''}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ercr_inspecoes_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="stats-dashboard-container" style={{ padding: '24px 20px', maxWidth: '1200px', margin: '0 auto', color: '#111' }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <button
            onClick={onBackToList}
            style={{
              background: '#222',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Voltar para Lista de Inspeções
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: '14px 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={22} color="#4CAF50" />
            Painel Estatístico & Indicadores Técnicos
          </h2>
          <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>
            Métricas de conformidade, volumetria mensal e relatórios gerenciais da frota (ERCR Engenharia)
          </p>
        </div>

        {/* Action Buttons: Export CSV, Managerial PDF, New Inspection */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            style={{
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Baixar planilha compatível com Excel / Google Planilhas"
          >
            <Download size={15} color="#4CAF50" />
            Exportar Excel (CSV)
          </button>

          <button
            onClick={() =>
              onPrintManagerialReport(
                filteredInspections,
                selectedPeriod,
                selectedCompany,
                selectedCategory
              )
            }
            style={{
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Gerar e imprimir relatório gerencial formatado"
          >
            <Printer size={15} color="#2196F3" />
            Relatório Gerencial (PDF)
          </button>

          <button
            onClick={onNewInspection}
            style={{
              background: '#2E7D32',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            + Nova Inspeção
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div
        style={{
          background: '#161616',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '16px 18px',
          marginBottom: '22px',
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Filter size={16} color="#4CAF50" />
          <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Filtros Avançados de Análise
          </span>
          <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
            Mostrando <strong>{filteredInspections.length}</strong> de {inspections.length} inspeções
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Empresa Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              <Building size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Empresa / Frotista
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="all">Todas as Empresas ({uniqueCompanies.length})</option>
              {uniqueCompanies.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria / Tipo de Veículo Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              <Truck size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Tipo de Veículo
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="all">Todos os Tipos</option>
              <option value="caminhao">Caminhões / Cavalos Mecânicos</option>
              <option value="bau">Baús / Frigoríficos / Siders</option>
              <option value="utilitario">Vans / Utilitários Leves</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              <Layers size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Status do Laudo
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="all">Todos os Status</option>
              <option value="revisado">Concluído / Aprovado</option>
              <option value="pendente_revisao">Pendente de Revisão</option>
              <option value="rascunho">Rascunho em Andamento</option>
            </select>
          </div>

          {/* Período Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Período de Execução
            </label>
            <div style={{ display: 'flex', background: '#222', padding: '2px', borderRadius: '4px', border: '1px solid #444' }}>
              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                style={{
                  flex: 1,
                  background: selectedPeriod === 'all' ? '#000' : 'transparent',
                  color: selectedPeriod === 'all' ? '#fff' : '#888',
                  border: 'none',
                  padding: '5px 0',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: selectedPeriod === 'all' ? '600' : '400',
                  cursor: 'pointer'
                }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('year')}
                style={{
                  flex: 1,
                  background: selectedPeriod === 'year' ? '#000' : 'transparent',
                  color: selectedPeriod === 'year' ? '#fff' : '#888',
                  border: 'none',
                  padding: '5px 0',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: selectedPeriod === 'year' ? '600' : '400',
                  cursor: 'pointer'
                }}
              >
                Ano 2026
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('6m')}
                style={{
                  flex: 1,
                  background: selectedPeriod === '6m' ? '#000' : 'transparent',
                  color: selectedPeriod === '6m' ? '#fff' : '#888',
                  border: 'none',
                  padding: '5px 0',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: selectedPeriod === '6m' ? '600' : '400',
                  cursor: 'pointer'
                }}
              >
                Últimos 6m
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total Inspecionado</span>
            <FileText size={18} color="#2196F3" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#111', marginTop: '8px', fontFamily: 'monospace' }}>
            {kpis.total}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
            veículos no filtro atual
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Taxa de Aptidão</span>
            <Award size={18} color="#2E7D32" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#2E7D32', marginTop: '8px', fontFamily: 'monospace' }}>
            {kpis.approvalRate}%
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            {kpis.aptos} aprovados sem restrições
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Não Conformidades</span>
            <AlertTriangle size={18} color="#C62828" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#C62828', marginTop: '8px', fontFamily: 'monospace' }}>
            {kpis.totalNCs}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Média de {kpis.ncRate} apontamento(s)/veículo
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Mês Atual</span>
            <Calendar size={18} color="#9C27B0" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#111', marginTop: '8px', fontFamily: 'monospace' }}>
            {kpis.thisMonthCount}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
            laudos emitidos neste mês
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Chart 1: Volume de Inspeções por Mês */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111' }}>
              📈 Volume de Inspeções por Mês
            </h3>
            <span style={{ fontSize: '11px', background: '#e8f5e9', color: '#2e7d32', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
              Evolução Temporal
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: 0, marginBottom: '16px' }}>
            Quantidade de veículos avaliados mensalmente pelo corpo técnico da ERCR Engenharia.
          </p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inspectionsByMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#666' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '12px' }}
                  formatter={(val: number) => [`${val} inspeções`, 'Quantidade']}
                />
                <Bar dataKey="total" name="Total Inspecionado" fill="#000000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribuição de Resultados (Apto / Restrições / Inapto) */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111' }}>
              🎯 Distribuição de Resultados Técnicos
            </h3>
            <span style={{ fontSize: '11px', background: '#ede7f6', color: '#512da8', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
              Classificação Final
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: 0, marginBottom: '16px' }}>
            Proporção de laudos classificados como Apto, Apto com Restrições ou Inapto para Operação.
          </p>
          <div style={{ width: '100%', height: 280 }}>
            {resultDistributionData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>
                Nenhuma classificação concluída no filtro selecionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {resultDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '12px' }}
                    formatter={(val: number) => [`${val} laudos`, 'Total']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span style={{ fontSize: '11.5px', color: '#333' }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Chart 3: Status dos Documentos no Fluxo */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="#666" />
            Status no Fluxo de Trabalho
          </h3>
          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistributionData} layout="vertical" margin={{ top: 5, right: 20, left: 25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#666' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#333' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '12px' }}
                  formatter={(val: number) => [`${val} laudos`, 'Quantidade']}
                />
                <Bar dataKey="value" name="Laudos" radius={[0, 4, 4, 0]}>
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Criticidade das Não Conformidades */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} color="#C62828" />
            Gravidade das Falhas (NCs)
          </h3>
          <div style={{ width: '100%', height: 210 }}>
            {ncCriticalityData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>
                Nenhuma não conformidade registrada no filtro atual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ncCriticalityData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#666' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#666' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '12px' }}
                    formatter={(val: number) => [`${val} falhas`, 'Apontamentos']}
                  />
                  <Bar dataKey="value" name="Falhas" radius={[4, 4, 0, 0]}>
                    {ncCriticalityData.map((entry, index) => (
                      <Cell key={`crit-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 5: Marcas mais Inspecionadas */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} color="#0D47A1" />
            Principais Fabricantes da Frota
          </h3>
          <div style={{ width: '100%', height: 210 }}>
            {topMarcasData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>
                Nenhum fabricante registrado no filtro.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px' }}>
                {topMarcasData.map((m, i) => {
                  const pct = kpis.total > 0 ? Math.round((m.value / kpis.total) * 100) : 0;
                  return (
                    <div key={i} style={{ fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: '600' }}>
                        <span>{m.name}</span>
                        <span style={{ color: '#666' }}>{m.value} ({pct}%)</span>
                      </div>
                      <div style={{ background: '#eee', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: '#111', height: '100%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
