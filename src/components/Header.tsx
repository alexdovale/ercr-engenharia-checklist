import React from 'react';
import { InspectionStatus } from '../types/inspection';
import { BarChart3, LogOut, Plus, ArrowLeft, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  currentView: 'list' | 'form' | 'stats' | 'remote';
  recordId?: string | null;
  status?: InspectionStatus;
  onStatusChange?: (status: InspectionStatus) => void;
  currentUserEmail?: string | null;
  onLogout: () => void;
  onNewInspection: () => void;
  onBackToList: () => void;
  onOpenStats: () => void;
  // Form gauges
  gauges?: {
    conforme: number;
    naoConforme: number;
    na: number;
    pendente: number;
  };
  onScrollToPending?: () => void;
  onQuickNavChange?: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  recordId,
  status = 'rascunho',
  onStatusChange,
  currentUserEmail,
  onLogout,
  onNewInspection,
  onBackToList,
  onOpenStats,
  gauges,
  onScrollToPending,
  onQuickNavChange
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="dash">
      <div className="dash-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img
            src="/assets/img/logo-ercr.png"
            alt="ERCR Engenharia Mecânica"
            style={{ height: '35px', objectFit: 'contain' }}
            onError={(e) => {
              // Fallback to raw github if local public asset fails
              (e.target as HTMLImageElement).src =
                'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';
            }}
          />
          <div className="dash-title">
            {currentView === 'form' ? 'CHECKLIST DE INSPEÇÃO' : 'SISTEMA DE INSPEÇÃO'}
            <small id="rec-id-label">
              {currentView === 'form'
                ? recordId
                  ? `ID: ${recordId} · ERCR ENGENHARIA MECÂNICA · (21) 96414-6270`
                  : 'NOVA INSPEÇÃO · ERCR ENGENHARIA MECÂNICA'
                : 'ERCR ENGENHARIA MECÂNICA · INSPEÇÕES REGISTRADAS'}
            </small>
          </div>
        </div>

        {/* Form View Gauges */}
        {currentView === 'form' && gauges && (
          <div className="gauges">
            <div className="gauge ok" title="Itens Conformes">
              <div className="num" id="cnt-c">{gauges.conforme}</div>
              <div className="lbl">Conforme</div>
            </div>
            <div className="gauge bad" title="Itens Não Conformes">
              <div className="num" id="cnt-nc">{gauges.naoConforme}</div>
              <div className="lbl">N. Conf.</div>
            </div>
            <div className="gauge na" title="Itens Não Aplicáveis">
              <div className="num" id="cnt-na">{gauges.na}</div>
              <div className="lbl">N/A</div>
            </div>
            <div
              className="gauge pend"
              onClick={onScrollToPending}
              style={{ cursor: 'pointer' }}
              title="Clique para ir ao próximo item pendente de preenchimento"
            >
              <div className="num" id="cnt-pend">{gauges.pendente}</div>
              <div className="lbl">Pendente 🔍</div>
            </div>
          </div>
        )}

        {/* Right side navigation buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Network Connection Indicator */}
          <span
            title={isOnline ? 'Conexão ativa com a internet' : 'Trabalhando offline - dados salvos localmente'}
            style={{
              fontSize: '11px',
              color: isOnline ? '#81c784' : '#ffb74d',
              background: isOnline ? 'rgba(46, 125, 50, 0.15)' : 'rgba(230, 81, 0, 0.2)',
              border: `1px solid ${isOnline ? '#2e7d32' : '#e65100'}`,
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'Online' : 'Offline'}
          </span>

          {currentUserEmail && (
            <span
              style={{
                fontSize: '11px',
                color: '#aaa',
                background: '#1a1a1a',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #333',
                fontFamily: 'monospace'
              }}
            >
              👤 {currentUserEmail}
            </span>
          )}

          {currentView === 'list' && (
            <>
              <button
                className="btn-link"
                onClick={onOpenStats}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#1E1E1E',
                  color: '#4CAF50',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #333'
                }}
              >
                <BarChart3 size={15} />
                Painel Estatístico
              </button>
              <button className="primary" onClick={onNewInspection} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={16} />
                Nova Inspeção
              </button>
            </>
          )}

          {currentView === 'stats' && (
            <>
              <button className="btn-link" onClick={onBackToList} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ArrowLeft size={16} />
                Ver Inspeções
              </button>
              <button className="primary" onClick={onNewInspection} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={16} />
                Nova Inspeção
              </button>
            </>
          )}

          <button
            className="btn-link"
            id="btn-logout"
            onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff8a80' }}
            title="Sair da conta"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>

      {/* Real-time Progress Bar */}
      {currentView === 'form' && gauges && (
        <div style={{ marginTop: '10px', marginBottom: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#aaa', marginBottom: '4px' }}>
            <span>
              Progresso do Checklist:{' '}
              <strong style={{ color: '#fff' }}>
                {Math.round(((gauges.conforme + gauges.naoConforme + gauges.na) / Math.max(1, gauges.conforme + gauges.naoConforme + gauges.na + gauges.pendente)) * 100)}% concluído
              </strong>{' '}
              ({gauges.conforme + gauges.naoConforme + gauges.na} de {gauges.conforme + gauges.naoConforme + gauges.na + gauges.pendente} itens)
            </span>
            {gauges.pendente > 0 ? (
              <span
                style={{ color: '#ffb74d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={onScrollToPending}
                title="Clique para ir ao próximo item pendente"
              >
                ⚠️ <strong>{gauges.pendente}</strong> item(ns) pendente(s) · Clique para ir
              </span>
            ) : (
              <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
                ✓ Todos os itens preenchidos
              </span>
            )}
          </div>
          <div style={{ width: '100%', height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round(((gauges.conforme + gauges.naoConforme + gauges.na) / Math.max(1, gauges.conforme + gauges.naoConforme + gauges.na + gauges.pendente)) * 100)}%`,
                height: '100%',
                background: gauges.pendente === 0 ? '#2E7D32' : '#4CAF50',
                transition: 'width 0.25s ease-out'
              }}
            />
          </div>
        </div>
      )}

      {/* Controls Bar for Form View */}
      {currentView === 'form' && (
        <div className="dash-controls" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-link" onClick={onBackToList} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Voltar à Lista
          </button>

          <select
            id="quick-nav"
            onChange={(e) => {
              if (e.target.value && onQuickNavChange) {
                onQuickNavChange(e.target.value);
                e.target.value = '';
              }
            }}
            style={{
              borderColor: '#2E7D32',
              background: '#000',
              color: '#fff',
              fontSize: '11px',
              padding: '6px 10px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <option value="">Ir para a seção...</option>
            <option value="secao-0">0. Identificação da Inspeção</option>
            <option value="secao-1">1. Identificação do Veículo</option>
            <option value="secao-2">2. Condições Gerais e Estruturais</option>
            <option value="secao-3">3. Motor e Sistema de Arrefecimento</option>
            <option value="secao-4">4. Transmissão</option>
            <option value="secao-5">5. Sistema de Direção</option>
            <option value="secao-6">6. Sistema de Suspensão</option>
            <option value="secao-7">7. Sistema de Freios</option>
            <option value="secao-8">8. Rodas e Pneus</option>
            <option value="secao-9">9. Sistema Elétrico e Iluminação</option>
            <option value="secao-10">10. Vidros e Acessórios</option>
            <option value="secao-11">11. Equipamentos de Segurança</option>
            <option value="secao-12">12. Segurança Operacional</option>
            <option value="secao-13">13. Avaliação Funcional e Emissões</option>
            <option value="secao-14">14. Registro de Não Conformidades</option>
            <option value="secao-15">15. Conclusão da Inspeção</option>
            <option value="secao-financeiro">$. Nota Fiscal e Recibo</option>
          </select>

          {onStatusChange && (
            <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Status:
              <select
                id="status-select"
                value={status}
                onChange={(e) => onStatusChange(e.target.value as InspectionStatus)}
                style={{
                  background: status === 'revisado' ? '#1b5e20' : status === 'pendente_revisao' ? '#e65100' : '#333',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}
              >
                <option value="rascunho">Rascunho</option>
                <option value="pendente_revisao">Pendente de Revisão</option>
                <option value="revisado">Revisado / Aprovado</option>
              </select>
            </label>
          )}
        </div>
      )}
    </header>
  );
};
