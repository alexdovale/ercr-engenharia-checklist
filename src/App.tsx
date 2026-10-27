import React, { useState, useEffect, useMemo } from 'react';
import { InspectionData, InspectionStatus } from './types/inspection';
import { StorageService } from './services/storage';
import { SECTIONS } from './data/sections';
import { Header } from './components/Header';
import { InspectionList } from './components/InspectionList';
import { InspectionForm } from './components/InspectionForm';
import { StatsDashboard } from './components/StatsDashboard';
import { PrintReport } from './components/PrintReport';
import { ReceiptReport } from './components/ReceiptReport';
import { ManagerialPrintReport } from './components/ManagerialPrintReport';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { RemoteSignatureView } from './components/RemoteSignatureView';
import { PhotoLightbox } from './components/PhotoLightbox';
import { AuthModal } from './components/AuthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FirestoreSyncService } from './services/firestoreSync';

type ViewMode = 'list' | 'form' | 'stats' | 'remote';

export const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string; uid: string } | null>(() => {
    const saved = localStorage.getItem('ercr_auth_user');
    return saved ? JSON.parse(saved) : { email: 'alexdovale222@gmail.com', uid: 'user_alex' };
  });

  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(null);
  const [currentFormData, setCurrentFormData] = useState<InspectionData | null>(null);
  const [remoteId, setRemoteId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Managerial Report Print State
  const [managerialPrintData, setManagerialPrintData] = useState<{
    inspections: InspectionData[];
    period: string;
    company: string;
    category: string;
  } | null>(null);

  // Load inspections from storage
  const reloadInspections = async () => {
    const list = await StorageService.getInspectionsList();
    setInspections(list);
  };

  useEffect(() => {
    reloadInspections();
  }, []);

  // Hash Routing Listener
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash || '#lista';
      const [route, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');

      if (route === '#assinar') {
        const id = params.get('id');
        if (id) {
          setRemoteId(id);
          setCurrentView('remote');
          return;
        }
      }

      if (route === '#stats') {
        setCurrentView('stats');
        return;
      }

      if (route === '#form') {
        const id = params.get('id');
        if (id) {
          setCurrentInspectionId(id);
          const data = await StorageService.getInspection(id);
          if (data) {
            setCurrentFormData(data);
          }
        } else {
          setCurrentInspectionId(null);
          setCurrentFormData({
            status: 'rascunho',
            text: {
              respInsNome: 'Alex do Vale Rosa Santos Nepomuceno Silva',
              respInsCrea: 'RJ-000000/D',
              dataInsp: new Date().toISOString().split('T')[0],
              municipio: 'Duque de Caxias/RJ'
            },
            radios: {
              classificacao: 'apto',
              sigMethod: 'canvas'
            },
            photoUrls: {}
          });
        }
        setCurrentView('form');
        return;
      }

      // Default to list
      setCurrentView('list');
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Calculate gauges for active form in real time
  const gauges = useMemo(() => {
    if (!currentFormData) {
      return { conforme: 0, naoConforme: 0, na: 0, pendente: 0 };
    }

    let c = 0;
    let nc = 0;
    let na = 0;
    let totalItems = 0;

    SECTIONS.forEach((sec) => {
      sec.items.forEach((item, idx) => {
        totalItems++;
        const itemId = `s${sec.n}-i${idx}`;
        const val = currentFormData.radios[itemId];
        if (val === 'conforme' || val === 'realizado') c++;
        else if (val === 'nao_conforme' || val === 'nao_realizado') nc++;
        else if (val === 'na' || val === 'nao_aplicavel') na++;
      });
    });

    // Count emission result if answered
    totalItems++;
    const emissaoVal = currentFormData.radios.resultEmissoes;
    if (emissaoVal === 'conforme') c++;
    else if (emissaoVal === 'nao_conforme') nc++;
    else if (emissaoVal === 'na') na++;

    const pendente = Math.max(0, totalItems - c - nc - na);
    return { conforme: c, naoConforme: nc, na: na, pendente };
  }, [currentFormData]);

  // Scroll to first pending checklist item
  const handleScrollToPending = () => {
    if (currentView !== 'form' || !currentFormData) return;

    for (const sec of SECTIONS) {
      for (let idx = 0; idx < sec.items.length; idx++) {
        const itemId = `s${sec.n}-i${idx}`;
        if (!currentFormData.radios[itemId]) {
          const el = document.querySelector(`[data-item="${itemId}"]`);
          if (el) {
            const parentRow = el.closest('.item-row') as HTMLElement;
            if (parentRow) {
              parentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
              parentRow.style.backgroundColor = '#FFEBEE';
              setTimeout(() => {
                parentRow.style.backgroundColor = '';
              }, 1800);
              return;
            }
          }
        }
      }
    }

    if (!currentFormData.radios.resultEmissoes) {
      const el = document.querySelector(`input[name="resultEmissoes"]`);
      if (el) {
        const parent = el.closest('.field') as HTMLElement;
        if (parent) {
          parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
          parent.style.backgroundColor = '#FFEBEE';
          setTimeout(() => {
            parent.style.backgroundColor = '';
          }, 1800);
          return;
        }
      }
    }

    alert('Parabéns! Todos os itens do checklist foram devidamente respondidos.');
  };

  // Jump to section dropdown
  const handleQuickNavChange = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Save inspection
  const handleSaveInspection = async (data: InspectionData): Promise<string> => {
    const id = await StorageService.saveInspection(currentInspectionId, data, user);
    setCurrentInspectionId(id);
    const updatedRecord = await StorageService.getInspection(id);
    if (updatedRecord) {
      setCurrentFormData(updatedRecord);
    } else {
      setCurrentFormData((prev) => (prev ? { ...prev, id } : null));
    }
    window.history.replaceState(null, '', `#form?id=${id}`);
    await reloadInspections();
    // Background automatic cloud backup if Firestore is connected
    FirestoreSyncService.backupSingleInspection(updatedRecord || { ...data, id }).catch(() => {});
    return id;
  };

  // Delete inspection
  const handleDeleteInspection = async (id: string) => {
    await StorageService.deleteInspection(id);
    await reloadInspections();
    if (currentInspectionId === id) {
      window.location.hash = '#lista';
    }
  };

  // Open PDF Preview & Emission Modal
  const handleGeneratePdf = async (data: InspectionData) => {
    let activeSeq = data.seq;
    if (!activeSeq) {
      activeSeq = await StorageService.getNextSeqNumber();
    }
    const withSeq: InspectionData = { ...data, seq: activeSeq };
    await handleSaveInspection(withSeq);
    setCurrentFormData(withSeq);
    setPdfModalOpen(true);
  };

  // Native Print Trigger
  const handlePrintNativePdf = () => {
    document.body.removeAttribute('data-print-mode');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Generate Receipt
  const handleGenerateReceipt = (data: InspectionData) => {
    document.body.setAttribute('data-print-mode', 'receipt');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.removeAttribute('data-print-mode');
      }, 1000);
    }, 350);
  };

  // Generate Managerial Report (PDF)
  const handlePrintManagerialReport = (
    filtered: InspectionData[],
    period: string,
    company: string,
    category: string
  ) => {
    setManagerialPrintData({
      inspections: filtered,
      period,
      company,
      category
    });

    document.body.setAttribute('data-print-mode', 'managerial');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.removeAttribute('data-print-mode');
      }, 1000);
    }, 400);
  };

  const handleLogout = () => {
    localStorage.removeItem('ercr_auth_user');
    setUser(null);
  };

  const handleLoginSuccess = (email: string) => {
    const u = { email, uid: `usr_${Date.now()}` };
    localStorage.setItem('ercr_auth_user', JSON.stringify(u));
    setUser(u);
    window.location.hash = '#lista';
  };

  if (!user && currentView !== 'remote') {
    return (
      <AuthModal
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={() => handleLoginSuccess('engenheiro.convidado@ercr.com.br')}
      />
    );
  }

  if (currentView === 'remote' && remoteId) {
    return (
      <RemoteSignatureView
        inspectionId={remoteId}
        onBackToApp={() => {
          window.location.hash = '#lista';
        }}
      />
    );
  }

  return (
    <div className="app-root" style={{ minHeight: '100vh', background: 'var(--graphite)' }}>
      {/* Top Header with live gauges & progress bar */}
      <Header
        currentView={currentView}
        recordId={currentInspectionId}
        status={currentFormData?.status || 'rascunho'}
        onStatusChange={(newStatus: InspectionStatus) => {
          if (currentFormData) {
            const updated = { ...currentFormData, status: newStatus };
            setCurrentFormData(updated);
            handleSaveInspection(updated);
          }
        }}
        currentUserEmail={user?.email}
        onLogout={handleLogout}
        onNewInspection={() => {
          window.location.hash = '#form';
        }}
        onBackToList={() => {
          window.location.hash = '#lista';
        }}
        onOpenStats={() => {
          window.location.hash = '#stats';
        }}
        gauges={gauges}
        onScrollToPending={handleScrollToPending}
        onQuickNavChange={handleQuickNavChange}
      />

      {/* Screen 1: Dashboard List */}
      {currentView === 'list' && (
        <InspectionList
          inspections={inspections}
          onSelectInspection={(id) => {
            window.location.hash = `#form?id=${id}`;
          }}
          onNewInspection={() => {
            window.location.hash = '#form';
          }}
          onDeleteInspection={handleDeleteInspection}
          onOpenStats={() => {
            window.location.hash = '#stats';
          }}
          onBackupImported={reloadInspections}
          onDirectPdf={(rec) => {
            handleGeneratePdf(rec);
          }}
        />
      )}

      {/* Screen 2: Stats Dashboard */}
      {currentView === 'stats' && (
        <StatsDashboard
          inspections={inspections}
          onBackToList={() => {
            window.location.hash = '#lista';
          }}
          onNewInspection={() => {
            window.location.hash = '#form';
          }}
          onPrintManagerialReport={handlePrintManagerialReport}
        />
      )}

      {/* Screen 3: Form Checklist View with real-time state sync */}
      {currentView === 'form' && currentFormData && (
        <InspectionForm
          initialData={currentFormData}
          onChange={(updated) => setCurrentFormData(updated)}
          onSave={handleSaveInspection}
          onDelete={currentInspectionId ? handleDeleteInspection : undefined}
          onGeneratePdf={handleGeneratePdf}
          onGenerateReceipt={handleGenerateReceipt}
          onOpenLightbox={(src) => setLightboxSrc(src)}
        />
      )}

      {/* Photo Lightbox */}
      <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* PDF Preview & Download Modal */}
      {currentFormData && (
        <PdfPreviewModal
          isOpen={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          inspection={currentFormData}
          onPrintNative={handlePrintNativePdf}
        />
      )}

      {/* Print Targets (Rendered specifically depending on print mode) */}
      {currentFormData && <PrintReport inspection={currentFormData} />}
      {currentFormData && <ReceiptReport inspection={currentFormData} />}
      {managerialPrintData && (
        <ManagerialPrintReport
          inspections={managerialPrintData.inspections}
          selectedPeriod={managerialPrintData.period}
          selectedCompany={managerialPrintData.company}
          selectedCategory={managerialPrintData.category}
        />
      )}

      {/* Floating Offline Indicator Banner */}
      <OfflineIndicator />
    </div>
  );
};
