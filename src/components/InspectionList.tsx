import React, { useState, useRef, useMemo, useEffect } from 'react';
import { InspectionData, InspectionStatus } from '../types/inspection';
import { StorageService } from '../services/storage';
import { FirestoreSyncService, SyncResult } from '../services/firestoreSync';
import { auth } from '../services/firebase';
import {
  Search,
  Trash2,
  Plus,
  BarChart3,
  AlertCircle,
  FileCheck,
  Clock,
  Calendar,
  FileEdit,
  Download,
  Upload,
  Database,
  Check,
  Car,
  Building2,
  XCircle,
  FileText,
  Filter,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  CheckCircle2,
  ShieldCheck,
  X
} from 'lucide-react';

interface InspectionListProps {
  inspections: InspectionData[];
  onSelectInspection: (id: string) => void;
  onNewInspection: () => void;
  onDeleteInspection: (id: string) => void;
  onOpenStats: () => void;
  onBackupImported?: () => void;
  onDirectPdf?: (inspection: InspectionData) => void;
}

type SearchMode = 'all' | 'placa' | 'cliente' | 'data';
type StatusFilter = 'all' | InspectionStatus;

export const InspectionList: React.FC<InspectionListProps> = ({
  inspections,
  onSelectInspection,
  onNewInspection,
  onDeleteInspection,
  onOpenStats,
  onBackupImported,
  onDirectPdf
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Firestore Cloud Synchronization States
  const [syncing, setSyncing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => FirestoreSyncService.getLastSyncTime());
  const [cloudUser, setCloudUser] = useState<{ uid: string; email: string | null } | null>(() => {
    const cur = auth.currentUser;
    return cur ? { uid: cur.uid, email: cur.email } : null;
  });
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCloudUser({ uid: user.uid, email: user.email });
      } else {
        setCloudUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Synchronize with Google Cloud Firestore
  const handleSyncWithFirestore = async () => {
    if (!auth.currentUser) {
      setSyncModalOpen(true);
      return;
    }

    setSyncing(true);
    try {
      const res = await FirestoreSyncService.synchronizeAll();
      setSyncResult(res);
      setLastSyncTime(res.lastSyncTime);
      showToast(`☁️ Nuvem sincronizada! (${res.pushed} enviadas, ${res.pulled} recebidas)`);
      if (onBackupImported) {
        onBackupImported();
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar com Firestore:', err);
      alert('Erro ao sincronizar com Firestore: ' + (err.message || 'Falha na conexão com a nuvem.'));
    } finally {
      setSyncing(false);
    }
  };

  // Connect Google account and trigger sync
  const handleConnectGoogle = async () => {
    try {
      setSyncing(true);
      const logged = await FirestoreSyncService.loginWithGoogle();
      setCloudUser(logged);
      const res = await FirestoreSyncService.synchronizeAll();
      setSyncResult(res);
      setLastSyncTime(res.lastSyncTime);
      showToast(`✅ Conectado ao Google (${logged.email}) e sincronizado com o Firestore!`);
      if (onBackupImported) {
        onBackupImported();
      }
    } catch (err: any) {
      alert('Erro na conexão com Google / Firestore: ' + (err.message || 'Falha ao autenticar'));
    } finally {
      setSyncing(false);
    }
  };

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Nunca sincronizado';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Export all inspection data as JSON backup
  const handleExportBackupJSON = () => {
    if (inspections.length === 0) {
      alert('Não há inspeções salvas para exportar no momento.');
      return;
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    const backupPayload = {
      formato: 'ERCR_BACKUP_INSPECOES',
      sistema: 'ERCR Engenharia Mecânica - Checklist de Inspeção e Perícia Técnica Veicular',
      versao: '1.0.0',
      dataExportacao: new Date().toISOString(),
      totalInspecoes: inspections.length,
      inspecoes: inspections
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_inspecoes_ercr_${dataHoje}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`✅ Backup exportado com sucesso! (${inspections.length} perícias salvas em JSON)`);
  };

  // Import / restore backup from a JSON file
  const handleImportBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let listToImport: InspectionData[] = [];
        if (Array.isArray(parsed)) {
          listToImport = parsed;
        } else if (parsed && Array.isArray(parsed.inspecoes)) {
          listToImport = parsed.inspecoes;
        } else {
          throw new Error('Formato de arquivo inválido. O arquivo JSON não contém uma lista de inspeções válida.');
        }

        if (listToImport.length === 0) {
          alert('O arquivo selecionado não contém inspeções para importar.');
          return;
        }

        if (confirm(`Deseja restaurar/mesclar ${listToImport.length} inspeções deste arquivo de backup?`)) {
          const importedCount = await StorageService.importBackup(listToImport);
          showToast(`✅ ${importedCount} perícias restauradas com sucesso do backup!`);
          if (onBackupImported) {
            onBackupImported();
          }
        }
      } catch (err: any) {
        alert('Erro ao importar arquivo de backup: ' + (err.message || 'Arquivo corrompido ou formato inválido.'));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  // Enhanced Filter Logic by Placa, Cliente, Data or General Search Term
  const filtered = useMemo(() => {
    return inspections.filter((rec) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        const s = rec.status || 'rascunho';
        if (s !== statusFilter) return false;
      }

      // 2. Text Search
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase().trim();
      const cleanTerm = term.replace(/[^a-z0-9]/g, '');

      const placa = (rec.text?.placa || '').toLowerCase();
      const cleanPlaca = placa.replace(/[^a-z0-9]/g, '');

      const empresa = (rec.text?.empresa || '').toLowerCase();
      const respVeic = (rec.text?.respVeic || '').toLowerCase();
      const repCliNome = (rec.text?.repCliNome || '').toLowerCase();
      const pagador = (rec.text?.recPagador || '').toLowerCase();
      const cnpj = (rec.text?.cnpj || '').toLowerCase();

      const modelo = (rec.text?.modelo || '').toLowerCase();
      const marca = (rec.text?.marca || '').toLowerCase();
      const seqStr = rec.seq ? String(rec.seq.number) : '';

      // Date information (dataInsp and createdAt)
      const rawDataInsp = (rec.text?.dataInsp || '').toLowerCase();
      const rawCreated = (rec.createdAt || '').toLowerCase();
      let formattedCreated = '';
      if (rec.createdAt) {
        try {
          const d = new Date(rec.createdAt);
          if (!isNaN(d.getTime())) {
            formattedCreated = d.toLocaleDateString('pt-BR');
          }
        } catch {
          // ignore
        }
      }
      let formattedDataInsp = rawDataInsp;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDataInsp)) {
        const [y, m, d] = rawDataInsp.split('-');
        formattedDataInsp = `${d}/${m}/${y}`;
      }

      const matchDate =
        rawDataInsp.includes(term) ||
        formattedDataInsp.toLowerCase().includes(term) ||
        rawCreated.includes(term) ||
        formattedCreated.toLowerCase().includes(term) ||
        (cleanTerm.length >= 2 && (
          rawDataInsp.replace(/[^0-9]/g, '').includes(cleanTerm) ||
          formattedDataInsp.replace(/[^0-9]/g, '').includes(cleanTerm) ||
          formattedCreated.replace(/[^0-9]/g, '').includes(cleanTerm)
        ));

      // Match by Plate only
      if (searchMode === 'placa') {
        return (
          placa.includes(term) ||
          (cleanTerm.length > 0 && cleanPlaca.includes(cleanTerm))
        );
      }

      // Match by Client / Company only
      if (searchMode === 'cliente') {
        return (
          empresa.includes(term) ||
          respVeic.includes(term) ||
          repCliNome.includes(term) ||
          pagador.includes(term) ||
          cnpj.includes(term)
        );
      }

      // Match by Date only
      if (searchMode === 'data') {
        return matchDate;
      }

      // General mode (all fields: placa, cliente/empresa, data, modelo, marca, número do laudo)
      return (
        placa.includes(term) ||
        (cleanTerm.length > 0 && cleanPlaca.includes(cleanTerm)) ||
        empresa.includes(term) ||
        respVeic.includes(term) ||
        repCliNome.includes(term) ||
        pagador.includes(term) ||
        cnpj.includes(term) ||
        modelo.includes(term) ||
        marca.includes(term) ||
        seqStr.includes(term) ||
        matchDate
      );
    });
  }, [inspections, searchTerm, searchMode, statusFilter]);

  // Status counts for badge tabs
  const statusCounts = useMemo(() => {
    let rascunho = 0;
    let pendente = 0;
    let revisado = 0;

    inspections.forEach((r) => {
      const s = r.status || 'rascunho';
      if (s === 'rascunho') rascunho++;
      else if (s === 'pendente_revisao') pendente++;
      else if (s === 'revisado') revisado++;
      else rascunho++;
    });

    return { total: inspections.length, rascunho, pendente, revisado };
  }, [inspections]);

  // Group filtered results by status
  const groups: Record<InspectionStatus, InspectionData[]> = {
    rascunho: [],
    pendente_revisao: [],
    revisado: []
  };

  filtered.forEach((r) => {
    const s = r.status || 'rascunho';
    if (groups[s]) {
      groups[s].push(r);
    } else {
      groups.rascunho.push(r);
    }
  });

  const renderGroup = (statusKey: InspectionStatus, title: string, icon: React.ReactNode, badgeColor: string) => {
    // If status filter is specific and doesn't match this group, skip
    if (statusFilter !== 'all' && statusFilter !== statusKey) {
      return null;
    }

    const items = groups[statusKey];

    return (
      <div key={statusKey} style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          {icon}
          <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff', margin: 0 }}>
            {title} ({items.length})
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="list-empty" style={{ background: '#111', border: '1px dashed #333', color: '#666', padding: '14px', borderRadius: '6px', fontSize: '12px' }}>
            Nenhum laudo nesta categoria {searchTerm ? 'para a busca informada' : ''}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map((rec) => {
              const placa = rec.text?.placa || '(sem placa)';
              const empresa = rec.text?.empresa || 'Empresa não informada';
              const veiculo = [rec.text?.marca, rec.text?.modelo].filter(Boolean).join(' ');
              const classif = rec.radios?.classificacao;
              const dateStr = rec.text?.dataInsp || (rec.createdAt ? rec.createdAt.split('T')[0] : '');

              return (
                <div
                  key={rec.id}
                  className="card"
                  onClick={() => rec.id && onSelectInspection(rec.id)}
                  style={{
                    cursor: 'pointer',
                    background: '#fff',
                    borderRadius: '6px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `5px solid ${badgeColor}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}
                >
                  <div className="info" style={{ flex: 1, paddingRight: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="placa" style={{ fontSize: '17px', fontWeight: '700', fontFamily: 'monospace', letterSpacing: '1px', color: '#000' }}>
                        {placa}
                      </span>
                      {rec.seq && (
                        <span style={{ fontSize: '11px', background: '#000', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>
                          Nº {String(rec.seq.number).padStart(4, '0')}/{rec.seq.year}
                        </span>
                      )}
                      {classif === 'apto' && (
                        <span style={{ fontSize: '10.5px', background: '#E8F5E9', color: '#2E7D32', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>
                          ✓ APTO
                        </span>
                      )}
                      {classif === 'restricoes' && (
                        <span style={{ fontSize: '10.5px', background: '#FFF3E0', color: '#E65100', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>
                          ⚠ COM RESTRIÇÕES
                        </span>
                      )}
                      {classif === 'inapto' && (
                        <span style={{ fontSize: '10.5px', background: '#FFEBEE', color: '#C62828', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>
                          ✕ INAPTO
                        </span>
                      )}
                      {cloudUser && (
                        <span style={{ fontSize: '10px', background: '#E8F5E9', color: '#2E7D32', padding: '2px 6px', borderRadius: '3px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Cloud size={11} /> Nuvem
                        </span>
                      )}
                    </div>

                    <div className="meta" style={{ color: '#222', fontSize: '13px', fontWeight: '500', marginTop: '4px' }}>
                      <strong>{empresa}</strong> {veiculo ? `· ${veiculo}` : ''}
                    </div>

                    <div style={{ display: 'flex', gap: '15px', color: '#666', fontSize: '11px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {dateStr && <span>📅 {dateStr}</span>}
                      {rec.text?.respVeic && <span>👤 Responsável: {rec.text.respVeic}</span>}
                      {rec.text?.municipio && <span>📍 {rec.text.municipio}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {onDirectPdf && (
                      <button
                        className="btn-pdf-card"
                        title="Visualizar e emitir Laudo PDF"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDirectPdf(rec);
                        }}
                        style={{
                          background: '#E8F5E9',
                          border: '1px solid #C8E6C9',
                          borderRadius: '4px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          color: '#2E7D32',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        <FileText size={15} />
                        PDF
                      </button>
                    )}
                    <button
                      className="btn-delete-card"
                      title="Excluir inspeção"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rec.id) setConfirmDeleteId(rec.id);
                      }}
                      style={{
                        background: '#FFEBEE',
                        border: '1px solid #FFCDD2',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        color: '#b71c1c'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="list-main" style={{ maxWidth: '1060px', margin: '0 auto', padding: '20px' }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#2E7D32',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={18} />
          {toastMessage}
        </div>
      )}

      {/* Hidden file input for importing backup */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportBackupJSON}
      />

      {/* Banner / Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 }}>
            Inspeções Técnicas Registradas
          </h2>
          <p style={{ color: '#aaa', fontSize: '12.5px', margin: '4px 0 0 0' }}>
            Gerenciamento e emissão de laudos de perícia veicular (ERCR Engenharia Mecânica)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Cloud Sync Action (Firestore) */}
          <button
            onClick={handleSyncWithFirestore}
            disabled={syncing}
            title="Sincronizar todas as inspeções com o banco de dados Google Cloud Firestore"
            style={{
              background: cloudUser ? '#1B5E20' : '#1a1a1a',
              color: '#fff',
              border: `1px solid ${cloudUser ? '#4CAF50' : '#444'}`,
              borderRadius: '6px',
              padding: '8px 13px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: syncing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              transition: 'background 0.2s'
            }}
          >
            {syncing ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Cloud size={15} color={cloudUser ? '#81C784' : '#4CAF50'} />
            )}
            {syncing ? 'Sincronizando Nuvem...' : 'Sincronizar Nuvem (Firestore)'}
          </button>

          {/* Backup Action: Export JSON */}
          <button
            onClick={handleExportBackupJSON}
            title="Exportar todas as inspeções salvas em um arquivo JSON local para backup manual"
            style={{
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} color="#4CAF50" />
            Backup (JSON)
          </button>

          {/* Backup Action: Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Restaurar inspeções a partir de um arquivo de backup JSON salvo anteriormente"
            style={{
              background: '#1a1a1a',
              color: '#bbb',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={14} />
            Restaurar
          </button>

          <button
            onClick={onOpenStats}
            style={{
              background: '#1a1a1a',
              color: '#4caf50',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BarChart3 size={16} />
            Estatísticas & Gráficos
          </button>

          <button
            className="primary"
            onClick={onNewInspection}
            style={{
              background: '#2e7d32',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} />
            + Nova Inspeção
          </button>
        </div>
      </div>

      {/* Cloud Backup & Resilience Info Banner */}
      <div
        style={{
          background: cloudUser ? 'linear-gradient(90deg, #0d2818 0%, #111e15 100%)' : '#1a1a1a',
          border: `1px solid ${cloudUser ? '#2E7D32' : '#333'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: cloudUser ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              padding: '10px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Cloud size={22} color={cloudUser ? '#81C784' : '#aaa'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                Backup em Nuvem · Google Cloud Firestore
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: '600',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  background: cloudUser ? '#1B5E20' : '#424242',
                  color: cloudUser ? '#A5D6A7' : '#BDBDBD'
                }}
              >
                {cloudUser ? '● Nuvem Ativa' : '○ Modo Local'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#bbb' }}>
              {cloudUser
                ? `Conta vinculada: ${cloudUser.email} · Última sincronização: ${formatSyncTime(lastSyncTime)}`
                : 'Proteja seus laudos contra perda do celular ou tablet: sincronize com o Firestore na nuvem.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleSyncWithFirestore}
            disabled={syncing}
            style={{
              background: '#2E7D32',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: syncing ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </button>

          {!cloudUser ? (
            <button
              onClick={() => setSyncModalOpen(true)}
              style={{
                background: '#222',
                color: '#81C784',
                border: '1px solid #4CAF50',
                borderRadius: '5px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <LogIn size={13} />
              Conectar Google
            </button>
          ) : (
            <button
              onClick={() => setSyncModalOpen(true)}
              style={{
                background: '#222',
                color: '#ccc',
                border: '1px solid #444',
                borderRadius: '5px',
                padding: '6px 10px',
                fontSize: '11.5px',
                cursor: 'pointer'
              }}
            >
              Detalhes do Backup
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CAMPO DE BUSCA APRIMORADO POR PLACA OU CLIENTE / EMPRESA  */}
      {/* ========================================================= */}
      <div
        style={{
          background: '#141414',
          border: '1px solid #262626',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {/* Search Mode Selector (Tabs) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', color: '#888', fontWeight: '600', textTransform: 'uppercase', marginRight: '4px' }}>
              Buscar por:
            </span>
            <button
              type="button"
              onClick={() => setSearchMode('all')}
              style={{
                background: searchMode === 'all' ? '#2E7D32' : '#222',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              🔍 Todos os Campos
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('placa')}
              style={{
                background: searchMode === 'placa' ? '#2E7D32' : '#222',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.2s'
              }}
            >
              <Car size={13} />
              Apenas Placa
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('cliente')}
              style={{
                background: searchMode === 'cliente' ? '#2E7D32' : '#222',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.2s'
              }}
            >
              <Building2 size={13} />
              Apenas Cliente / Empresa
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('data')}
              style={{
                background: searchMode === 'data' ? '#2E7D32' : '#222',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.2s'
              }}
            >
              <Calendar size={13} />
              Apenas Data
            </button>
          </div>

          {/* Real-time search counter */}
          <div style={{ fontSize: '12px', color: '#aaa' }}>
            {searchTerm.trim() ? (
              <span>
                Encontrada(s) <strong style={{ color: '#4caf50' }}>{filtered.length}</strong> de {inspections.length} perícias
              </span>
            ) : (
              <span>Total: <strong>{inspections.length}</strong> inspeções salvas</span>
            )}
          </div>
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#4CAF50" style={{ position: 'absolute', left: '14px', top: '13px' }} />
          <input
            type="text"
            placeholder={
              searchMode === 'placa'
                ? 'Digite a placa do veículo (ex: RIO2A18, ABC1234)...'
                : searchMode === 'cliente'
                ? 'Digite o nome do cliente, empresa frotista ou responsável...'
                : searchMode === 'data'
                ? 'Digite a data da inspeção (ex: 27/10/2026, 2026-10)...'
                : 'Buscar por placa, cliente ou data (ex: RIO2A18, Transrio, 27/10/2026)...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 42px 12px 42px',
              background: '#0a0a0a',
              color: '#fff',
              border: '1.5px solid #333',
              borderRadius: '6px',
              fontSize: '13.5px',
              outline: 'none',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
            }}
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              title="Limpar busca"
              style={{
                position: 'absolute',
                right: '12px',
                top: '11px',
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <XCircle size={18} />
            </button>
          )}
        </div>

        {/* Quick Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase', fontWeight: '600', marginRight: '4px' }}>
            Status:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              background: statusFilter === 'all' ? '#333' : 'transparent',
              color: statusFilter === 'all' ? '#fff' : '#888',
              border: '1px solid #333',
              padding: '3px 9px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Todas ({statusCounts.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('revisado')}
            style={{
              background: statusFilter === 'revisado' ? '#1b5e20' : 'transparent',
              color: statusFilter === 'revisado' ? '#fff' : '#81c784',
              border: '1px solid #2e7d32',
              padding: '3px 9px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            ✓ Aprovados ({statusCounts.revisado})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pendente_revisao')}
            style={{
              background: statusFilter === 'pendente_revisao' ? '#e65100' : 'transparent',
              color: statusFilter === 'pendente_revisao' ? '#fff' : '#ffb74d',
              border: '1px solid #e65100',
              padding: '3px 9px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            ⏳ Pendentes ({statusCounts.pendente})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rascunho')}
            style={{
              background: statusFilter === 'rascunho' ? '#424242' : 'transparent',
              color: statusFilter === 'rascunho' ? '#fff' : '#aaa',
              border: '1px solid #555',
              padding: '3px 9px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            📝 Rascunhos ({statusCounts.rascunho})
          </button>
        </div>
      </div>

      {/* No search results empty state */}
      {filtered.length === 0 && searchTerm.trim() && (
        <div
          style={{
            background: '#111',
            border: '1px dashed #444',
            borderRadius: '8px',
            padding: '32px 20px',
            textAlign: 'center',
            color: '#fff',
            marginBottom: '24px'
          }}
        >
          <Search size={36} color="#666" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>
            Nenhuma inspeção localizada
          </h3>
          <p style={{ color: '#888', fontSize: '13px', margin: '0 0 16px 0', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto' }}>
            Não encontramos registros com o termo <strong>"{searchTerm}"</strong>{' '}
            {searchMode === 'placa'
              ? 'no campo de placa'
              : searchMode === 'cliente'
              ? 'nos dados de cliente/empresa'
              : searchMode === 'data'
              ? 'nas datas de realização'
              : 'no sistema'}.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSearchMode('all');
              setStatusFilter('all');
            }}
            style={{
              background: '#2E7D32',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Limpar Filtros e Ver Todas
          </button>
        </div>
      )}

      {/* Grouped lists */}
      {renderGroup('rascunho', 'Rascunhos em Andamento', <FileEdit size={16} color="#888" />, '#555555')}
      {renderGroup('pendente_revisao', 'Pendentes de Revisão Técnica', <Clock size={16} color="#ED6C02" />, '#ED6C02')}
      {renderGroup('revisado', 'Laudos Concluídos / Aprovados', <FileCheck size={16} color="#2E7D32" />, '#2E7D32')}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%', color: '#111' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '700' }}>Confirmar Exclusão</h3>
            <p style={{ fontSize: '13px', color: '#555', margin: '0 0 20px 0' }}>
              Deseja realmente excluir este laudo de inspeção? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '8px 14px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteInspection(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                style={{ padding: '8px 14px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Synchronization Details & Setup Modal */}
      {syncModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              color: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={20} color="#4CAF50" />
                Sincronização com o Firestore
              </h3>
              <button
                onClick={() => setSyncModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              O backup na nuvem permite que suas inspeções e laudos sejam armazenados com segurança no <strong>Google Cloud Firestore</strong>. Em caso de perda, avaria ou troca do celular ou tablet em campo, todos os registros podem ser restaurados instantaneamente.
            </p>

            {/* Cloud User Info */}
            <div
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: '6px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                Conta na Nuvem (Firebase Auth):
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: cloudUser ? '#81C784' : '#FFB74D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {cloudUser ? (
                  <>
                    <CheckCircle2 size={16} color="#4CAF50" />
                    <span>Conectado como: <strong>{cloudUser.email}</strong></span>
                  </>
                ) : (
                  <>
                    <CloudOff size={16} color="#FFB74D" />
                    <span>Nenhuma conta vinculada à nuvem no momento</span>
                  </>
                )}
              </div>

              <div style={{ fontSize: '11.5px', color: '#aaa', marginTop: '6px' }}>
                Última sincronização: <strong>{formatSyncTime(lastSyncTime)}</strong>
              </div>
              <div style={{ fontSize: '11.5px', color: '#aaa', marginTop: '2px' }}>
                Perícias salvas neste dispositivo: <strong>{inspections.length} laudos</strong>
              </div>
            </div>

            {/* Last Sync Result (if any) */}
            {syncResult && (
              <div
                style={{
                  background: 'rgba(46, 125, 50, 0.15)',
                  border: '1px solid #2E7D32',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '12.5px',
                  color: '#A5D6A7'
                }}
              >
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>✓ Resultado da Sincronização:</div>
                <div>• Enviadas para a nuvem: <strong>{syncResult.pushed}</strong></div>
                <div>• Baixadas da nuvem: <strong>{syncResult.pulled}</strong></div>
                <div>• Total em sincronia: <strong>{syncResult.total} inspeções</strong></div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!cloudUser ? (
                <button
                  onClick={handleConnectGoogle}
                  disabled={syncing}
                  style={{
                    background: '#2E7D32',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: syncing ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <LogIn size={16} />
                  {syncing ? 'Conectando...' : 'Conectar com Google e Sincronizar'}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await handleSyncWithFirestore();
                  }}
                  disabled={syncing}
                  style={{
                    background: '#2E7D32',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: syncing ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Todas as Perícias Agora'}
                </button>
              )}

              <button
                onClick={() => setSyncModalOpen(false)}
                style={{
                  background: '#2a2a2a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
