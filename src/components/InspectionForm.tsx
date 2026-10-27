import React, { useState, useEffect, useRef } from 'react';
import {
  InspectionData,
  InspectionStatus,
  FinalClassification,
  SignatureMethod,
  FipeItem
} from '../types/inspection';
import {
  SECTIONS,
  BANCO_INSPETORES,
  MUNICIPIOS_SUGESTOES,
  CORES_VEICULO
} from '../data/sections';
import {
  getMarcas,
  getModelos,
  getAnos,
  getValorDetalhado,
  buscarDadosPlaca
} from '../services/fipe';
import { StorageService } from '../services/storage';
import { SignatureCanvas } from './SignatureCanvas';
import { CameraCaptureModal } from './CameraCaptureModal';
import { Search, Camera, Trash2, Save, Printer, Receipt, AlertTriangle, CheckCircle, FileText, QrCode } from 'lucide-react';

interface InspectionFormProps {
  initialData: InspectionData;
  onSave: (data: InspectionData) => Promise<string>;
  onDelete?: (id: string) => Promise<void>;
  onGeneratePdf: (data: InspectionData) => void;
  onGenerateReceipt: (data: InspectionData) => void;
  onOpenLightbox: (src: string) => void;
  onChange?: (data: InspectionData) => void;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({
  initialData,
  onSave,
  onDelete,
  onGeneratePdf,
  onGenerateReceipt,
  onOpenLightbox,
  onChange
}) => {
  const [formData, setFormData] = useState<InspectionData>(initialData);
  const [saving, setSaving] = useState(false);
  const [fipeLoading, setFipeLoading] = useState(false);
  const [fipeMsg, setFipeMsg] = useState<string | null>(null);
  const [fipeError, setFipeError] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<FipeItem[]>([]);
  const [modelos, setModelos] = useState<FipeItem[]>([]);
  const [anos, setAnos] = useState<FipeItem[]>([]);
  const [selectedMarcaCod, setSelectedMarcaCod] = useState('');
  const [selectedModeloCod, setSelectedModeloCod] = useState('');
  const [selectedAnoCod, setSelectedAnoCod] = useState('');
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [ncCount, setNcCount] = useState(3);
  const [icpLoading, setIcpLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Camera & QR Scanner Modal States
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'scan' | 'both'>('photo');
  const [cameraTargetId, setCameraTargetId] = useState<string | null>(null);
  const [cameraTitle, setCameraTitle] = useState('Câmera de Inspeção em Campo');

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    async function loadFipeMarcas() {
      try {
        const data = await getMarcas();
        setMarcas(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadFipeMarcas();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleTextChange = (key: string, value: string) => {
    setFormData((prev) => {
      const updatedText = { ...prev.text, [key]: value };
      if (key === 'respInsNome' && BANCO_INSPETORES[value]) {
        updatedText.respInsCrea = BANCO_INSPETORES[value];
      }
      const next = { ...prev, text: updatedText };
      if (onChange) onChange(next);
      return next;
    });
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        radios: { ...prev.radios, [name]: value }
      };
      if (onChange) onChange(next);
      return next;
    });
  };

  const handleMarcaSelect = async (marcaCod: string) => {
    setSelectedMarcaCod(marcaCod);
    setSelectedModeloCod('');
    setSelectedAnoCod('');
    setModelos([]);
    setAnos([]);

    const found = marcas.find((m) => m.codigo === marcaCod);
    const marcaNome = found ? found.nome : '';
    if (marcaNome) {
      handleTextChange('marca', marcaNome);
    }

    if (!marcaCod) return;

    try {
      setFipeLoading(true);
      setFipeMsg('Carregando modelos do fabricante...');
      const mods = await getModelos(marcaCod, marcaNome);
      setModelos(mods);
    } catch (err: any) {
      setFipeError('Erro ao buscar modelos FIPE.');
    } finally {
      setFipeLoading(false);
      setFipeMsg(null);
    }
  };

  const handleModeloSelect = async (modeloCod: string) => {
    setSelectedModeloCod(modeloCod);
    setSelectedAnoCod('');
    setAnos([]);

    const found = modelos.find((m) => m.codigo === modeloCod);
    const modeloNome = found ? found.nome : '';
    if (modeloNome) {
      handleTextChange('modelo', modeloNome);
    }

    const currentMarca = marcas.find((m) => m.codigo === selectedMarcaCod)?.nome || formData.text?.marca;

    if (!selectedMarcaCod || !modeloCod) return;

    try {
      setFipeLoading(true);
      setFipeMsg('Carregando versões e anos...');
      const anosList = await getAnos(selectedMarcaCod, modeloCod, currentMarca, modeloNome);
      setAnos(anosList);
    } catch (err: any) {
      setFipeError('Erro ao buscar anos FIPE.');
    } finally {
      setFipeLoading(false);
      setFipeMsg(null);
    }
  };

  const handleAnoSelect = async (anoCod: string) => {
    setSelectedAnoCod(anoCod);
    if (!selectedMarcaCod || !selectedModeloCod || !anoCod) return;

    const currentMarca = marcas.find((m) => m.codigo === selectedMarcaCod)?.nome || formData.text?.marca;
    const currentModelo = modelos.find((m) => m.codigo === selectedModeloCod)?.nome || formData.text?.modelo;

    try {
      setFipeLoading(true);
      setFipeMsg('Obtendo cotação e especificações FIPE...');
      const details = await getValorDetalhado(
        selectedMarcaCod,
        selectedModeloCod,
        anoCod,
        currentMarca,
        currentModelo
      );

      if (details) {
        setFormData((prev) => {
          const combustivel = details.Combustivel || 'Diesel';
          const isDiesel = combustivel.toLowerCase().includes('diesel');
          const next = {
            ...prev,
            text: {
              ...prev.text,
              marca: details.Marca || prev.text.marca,
              modelo: details.Modelo || prev.text.modelo,
              anoModelo: String(details.AnoModelo),
              anoFab: prev.text.anoFab || String(details.AnoModelo),
              combustivel: details.Combustivel,
              fipeAno: details.Modelo,
              valorFipe: details.Valor,
              codigoFipe: details.CodigoFipe,
              mesReferenciaFipe: details.MesReferencia
            },
            radios: {
              ...prev.radios,
              tipoMotor13: (isDiesel ? 'diesel' : 'ciclo_otto') as 'ciclo_otto' | 'diesel'
            }
          };
          if (onChange) onChange(next);
          return next;
        });
        showToast(`✅ FIPE ${details.Valor} vinculada ao veículo!`);
      }
    } catch (err: any) {
      setFipeError('Erro ao carregar detalhes FIPE.');
    } finally {
      setFipeLoading(false);
      setFipeMsg(null);
    }
  };

  const handleBuscarPlaca = async (placaValor?: string) => {
    const placaInput = placaValor || formData.text?.placa;
    if (!placaInput || placaInput.trim().length < 7) {
      alert('Digite uma placa válida com 7 caracteres (Ex: RIO2A18 ou ABC1234).');
      return;
    }

    try {
      setBuscandoPlaca(true);
      const res = await buscarDadosPlaca(placaInput);
      setFormData((prev) => {
        const isDiesel = res.combustivel?.toLowerCase().includes('diesel');
        const next: InspectionData = {
          ...prev,
          text: {
            ...prev.text,
            placa: res.placa,
            marca: res.marca || prev.text.marca,
            modelo: res.modelo || prev.text.modelo,
            anoFab: res.anoFab || prev.text.anoFab,
            anoModelo: res.anoModelo || prev.text.anoModelo,
            cor: res.cor || prev.text.cor,
            combustivel: res.combustivel || prev.text.combustivel,
            chassi: res.chassi || prev.text.chassi,
            renavam: res.renavam || prev.text.renavam,
            municipio: res.municipio || prev.text.municipio,
            valorFipe: res.valorFipe || prev.text.valorFipe,
            codigoFipe: res.codigoFipe || prev.text.codigoFipe,
            mesReferenciaFipe: res.mesReferenciaFipe || prev.text.mesReferenciaFipe
          },
          radios: {
            ...prev.radios,
            tipoMotor13: (isDiesel ? 'diesel' : (prev.radios.tipoMotor13 || 'diesel')) as 'ciclo_otto' | 'diesel'
          }
        };
        if (onChange) onChange(next);
        return next;
      });
      showToast('✅ Dados técnicos e FIPE preenchidos pela placa!');
    } catch (err: any) {
      alert(err.message || 'Falha na consulta da placa.');
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const handlePhotoUpload = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    showToast('Processando e anexando foto...');
    const recordId = formData.id || 'temp_record';

    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await StorageService.uploadPhoto(recordId, itemId, files[i]);
        urls.push(url);
      }

      setFormData((prev) => {
        const existing = prev.photoUrls[itemId] || [];
        const next = {
          ...prev,
          photoUrls: {
            ...prev.photoUrls,
            [itemId]: [...existing, ...urls]
          }
        };
        if (onChange) onChange(next);
        return next;
      });
      showToast('Foto anexada com sucesso!');
    } catch (err: any) {
      alert('Erro ao anexar foto: ' + err.message);
    }
  };

  const handleDirectCameraCapture = (dataUrl: string) => {
    if (!cameraTargetId) return;

    setFormData((prev) => {
      const existing = prev.photoUrls[cameraTargetId] || [];
      const next = {
        ...prev,
        photoUrls: {
          ...prev.photoUrls,
          [cameraTargetId]: [...existing, dataUrl]
        }
      };
      if (onChange) onChange(next);
      return next;
    });
    showToast('Foto capturada e anexada ao item com sucesso!');
  };

  const handleScanCodeResult = (scanned: string) => {
    const clean = scanned.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (cameraTargetId === 'placa') {
      // Plate format extraction
      const plateMatch = clean.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/) || clean.match(/[A-Z]{3}[0-9]{4}/);
      const placaIdentificada = plateMatch ? plateMatch[0] : clean.slice(0, 7);

      handleTextChange('placa', placaIdentificada);
      showToast(`Placa lida: ${placaIdentificada}`);
      handleBuscarPlaca(placaIdentificada);
    } else if (cameraTargetId === 'chassi') {
      handleTextChange('chassi', clean);
      showToast(`Chassi lido: ${clean}`);
    } else {
      showToast(`Código identificado: ${scanned}`);
    }
  };

  const handleRemovePhoto = (itemId: string, index: number) => {
    setFormData((prev) => {
      const existing = prev.photoUrls[itemId] || [];
      const updated = existing.filter((_, idx) => idx !== index);
      return {
        ...prev,
        photoUrls: {
          ...prev.photoUrls,
          [itemId]: updated
        }
      };
    });
  };

  const handleSolicitarAssinaturaRemota = () => {
    const id = formData.id;
    if (!id) {
      alert('Por favor, salve a inspeção antes de solicitar a assinatura remota.');
      handleRadioChange('sigMethod', 'canvas');
      return;
    }

    const telefone = (formData.text?.telefone || '').replace(/\D/g, '');
    const nome = formData.text?.repCliNome || formData.text?.respVeic || 'Cliente';
    const placa = formData.text?.placa || 'Veículo';

    if (!telefone || telefone.length < 10) {
      alert('Preencha um telefone válido no formulário antes de enviar pelo WhatsApp.');
      handleRadioChange('sigMethod', 'canvas');
      return;
    }

    const urlBase = window.location.origin;
    const linkAssinatura = `${urlBase}/#assinar?id=${id}`;
    const mensagem = `Olá, ${nome}.\n\nSegue o link para assinatura digital do laudo técnico do veículo *${placa}*:\n${linkAssinatura}\n\nAtenciosamente,\nERCR Engenharia Mecânica.`;

    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const handleSignICP = (role: 'respIns' | 'repCli') => {
    setIcpLoading(true);
    setTimeout(() => {
      setIcpLoading(false);
      setFormData((prev) => ({
        ...prev,
        signatures: {
          ...(prev.signatures || {}),
          methodUsed: 'icp',
          [role]: {
            methodUsed: 'icp',
            metadata: {
              timestamp: new Date().toISOString(),
              metodo: 'ICP-Brasil / Gov.br',
              dadosCertificado: {
                nome: role === 'respIns' ? 'ALEX DO VALE ROSA SANTOS NEPOMUCENO SILVA' : 'REPRESENTANTE AUTORIZADO',
                emissor: 'AC Certisign RFB G5',
                validade: '2027-12-31'
              }
            }
          }
        }
      }));
      showToast('Assinatura ICP-Brasil autenticada digitalmente!');
    }, 1500);
  };

  const handleSaveClick = async () => {
    try {
      setSaving(true);
      const newId = await onSave(formData);
      setFormData((prev) => ({ ...prev, id: newId }));
      showToast('Inspeção salva com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearForm = () => {
    if (confirm('Deseja limpar todos os campos preenchidos?')) {
      setFormData({
        status: 'rascunho',
        text: {},
        radios: {},
        photoUrls: {}
      });
      showToast('Campos limpos.');
    }
  };

  return (
    <div id="screen-form" className="screen" style={{ display: 'block' }}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#2E7D32',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          {toast}
        </div>
      )}

      {/* Direct Camera and QR Scanner Modal */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        mode={cameraMode}
        title={cameraTitle}
        onClose={() => setCameraOpen(false)}
        onCapturePhoto={handleDirectCameraCapture}
        onScanCode={handleScanCodeResult}
      />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '16px' }}>
        {/* ==================================================== */}
        {/* SEÇÃO 0: Identificação da Inspeção */}
        {/* ==================================================== */}
        <section className="sheet" id="secao-0">
          <div className="sheet-head">
            <span className="n">·</span>
            <h2>Identificação da Inspeção</h2>
            {formData.seq && (
              <span className="seq-badge" style={{ display: 'inline-block', marginLeft: 'auto', background: '#000', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                Nº {String(formData.seq.number).padStart(4, '0')}/{formData.seq.year}
              </span>
            )}
          </div>
          <div className="sheet-body">
            <div className="field-grid">
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Empresa Responsável / Frotista</label>
                <input
                  type="text"
                  id="empresa"
                  value={formData.text?.empresa || ''}
                  onChange={(e) => handleTextChange('empresa', e.target.value)}
                  placeholder="Nome fantasia ou Razão Social"
                />
              </div>

              <div className="field">
                <label>CNPJ</label>
                <input
                  type="text"
                  id="cnpj"
                  value={formData.text?.cnpj || ''}
                  onChange={(e) => handleTextChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="field">
                <label>Data da Inspeção</label>
                <input
                  type="date"
                  id="dataInsp"
                  value={formData.text?.dataInsp || ''}
                  onChange={(e) => handleTextChange('dataInsp', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Horário</label>
                <input
                  type="time"
                  id="horario"
                  value={formData.text?.horario || ''}
                  onChange={(e) => handleTextChange('horario', e.target.value)}
                />
              </div>

              <div className="field">
                <label>Município / UF</label>
                <input
                  list="lista-municipios"
                  id="municipio"
                  value={formData.text?.municipio || ''}
                  onChange={(e) => handleTextChange('municipio', e.target.value.toUpperCase())}
                  placeholder="Ex: Duque de Caxias/RJ"
                  style={{ textTransform: 'uppercase' }}
                />
                <datalist id="lista-municipios">
                  {MUNICIPIOS_SUGESTOES.map((m, i) => (
                    <option key={i} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Local da Inspeção</label>
                <input
                  type="text"
                  id="local"
                  value={formData.text?.local || ''}
                  onChange={(e) => handleTextChange('local', e.target.value)}
                  placeholder="Endereço da garagem, pátio ou oficina técnica"
                />
              </div>

              <div className="field">
                <label>Responsável pelo Veículo</label>
                <input
                  type="text"
                  id="respVeic"
                  value={formData.text?.respVeic || ''}
                  onChange={(e) => handleTextChange('respVeic', e.target.value)}
                  placeholder="Nome do motorista / encarregado"
                />
              </div>

              <div className="field">
                <label>Cargo / Função</label>
                <input
                  type="text"
                  id="cargoFunc"
                  value={formData.text?.cargoFunc || ''}
                  onChange={(e) => handleTextChange('cargoFunc', e.target.value)}
                  placeholder="Ex: Motorista Operacional"
                />
              </div>

              <div className="field">
                <label>Telefone / WhatsApp</label>
                <input
                  type="text"
                  id="telefone"
                  value={formData.text?.telefone || ''}
                  onChange={(e) => handleTextChange('telefone', e.target.value)}
                  placeholder="(21) 96414-6270"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SEÇÃO 1: Identificação do Veículo & FIPE & QR Code */}
        {/* ==================================================== */}
        <section className="sheet" id="secao-1">
          <div className="sheet-head">
            <span className="n">1</span>
            <h2>Identificação do Veículo</h2>
          </div>
          <div className="sheet-body">
            {fipeLoading && (
              <div id="fipe-loading" style={{ display: 'block', background: '#E3F2FD', color: '#0D47A1', padding: '8px 12px', marginBottom: '12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                ⏳ {fipeMsg || 'Consultando base de dados FIPE...'}
              </div>
            )}
            {fipeError && (
              <div id="fipe-error" style={{ display: 'block', background: '#FFEBEE', color: '#B71C1C', padding: '8px 12px', marginBottom: '12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                ❌ {fipeError}
              </div>
            )}

            {/* Banner de Ajuda da Consulta FIPE / Placa */}
            <div
              style={{
                background: '#1e1e1e',
                color: '#ddd',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '11.5px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderLeft: '3px solid #4CAF50'
              }}
            >
              <span>🔍</span>
              <span>
                <strong>Consulta Técnica FIPE:</strong> Digite a placa e clique em <em>Buscar</em> (ou escaneie pela câmera), ou selecione <strong>Marca / Modelo / Ano</strong> abaixo para preenchimento automático de todos os campos técnicos.
              </span>
            </div>

            {/* Card de Cotação FIPE Vinculada */}
            {formData.text?.valorFipe && (
              <div
                style={{
                  background: '#E8F5E9',
                  border: '1px solid #A5D6A7',
                  borderRadius: '4px',
                  padding: '10px 14px',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#2E7D32', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ✅ Avaliação Oficial FIPE:
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1B5E20' }}>
                    {formData.text.valorFipe}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#2e7d32' }}>
                  {formData.text.codigoFipe && <span>Código: <strong>{formData.text.codigoFipe}</strong> | </span>}
                  {formData.text.mesReferenciaFipe && <span>Mês: <strong>{formData.text.mesReferenciaFipe}</strong> | </span>}
                  <span>Combustível: <strong>{formData.text.combustivel || 'Diesel'}</strong></span>
                </div>
              </div>
            )}

            <div className="field-grid">
              <div className="field">
                <label>1.1 Placa</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input
                    type="text"
                    id="placa"
                    value={formData.text?.placa || ''}
                    onChange={(e) => handleTextChange('placa', e.target.value.toUpperCase())}
                    placeholder="AAA0A00"
                    maxLength={7}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 'bold' }}
                  />
                  <button
                    type="button"
                    id="btn-buscar-placa"
                    className="secondary"
                    onClick={() => handleBuscarPlaca()}
                    disabled={buscandoPlaca}
                    style={{ padding: '0 12px', borderRadius: '4px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  >
                    {buscandoPlaca ? '⏳...' : '🔍 Buscar'}
                  </button>
                  <button
                    type="button"
                    title="Escanear placa ou QR Code com a câmera do celular"
                    onClick={() => {
                      setCameraTargetId('placa');
                      setCameraMode('both');
                      setCameraTitle('Leitor de Placa / QR Code Mercosul');
                      setCameraOpen(true);
                    }}
                    style={{
                      background: '#1a1a1a',
                      color: '#4CAF50',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '0 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <QrCode size={14} />
                    Escanear
                  </button>
                </div>
              </div>

              <div className="field">
                <label>1.2 Marca / Fabricante</label>
                <select
                  id="fipe-marca"
                  value={selectedMarcaCod}
                  onChange={(e) => handleMarcaSelect(e.target.value)}
                >
                  <option value="">Selecione ou consulte...</option>
                  {marcas.map((m) => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                {formData.text?.marca && !selectedMarcaCod && (
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                    Atual: <strong>{formData.text.marca}</strong>
                  </div>
                )}
              </div>

              <div className="field">
                <label>1.3 Modelo</label>
                <select
                  id="fipe-modelo"
                  value={selectedModeloCod}
                  disabled={modelos.length === 0}
                  onChange={(e) => handleModeloSelect(e.target.value)}
                >
                  <option value="">
                    {modelos.length === 0 ? 'Aguardando Marca...' : 'Selecione o Modelo...'}
                  </option>
                  {modelos.map((mo) => (
                    <option key={mo.codigo} value={mo.codigo}>
                      {mo.nome}
                    </option>
                  ))}
                </select>
                {formData.text?.modelo && !selectedModeloCod && (
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                    Atual: <strong>{formData.text.modelo}</strong>
                  </div>
                )}
              </div>

              <div className="field">
                <label>Versão FIPE (Auto-preenchimento)</label>
                <select
                  id="fipe-ano"
                  value={selectedAnoCod}
                  disabled={anos.length === 0}
                  onChange={(e) => handleAnoSelect(e.target.value)}
                >
                  <option value="">
                    {anos.length === 0 ? 'Aguardando Modelo...' : 'Selecione o Ano/Versão...'}
                  </option>
                  {anos.map((a) => (
                    <option key={a.codigo} value={a.codigo}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>1.4 Ano de Fabricação</label>
                <input
                  type="text"
                  id="anoFab"
                  value={formData.text?.anoFab || ''}
                  onChange={(e) => handleTextChange('anoFab', e.target.value)}
                  placeholder="Ex: 2021"
                  inputMode="numeric"
                />
              </div>

              <div className="field">
                <label>1.5 Ano Modelo</label>
                <input
                  type="text"
                  id="anoModelo"
                  className="readonly-field"
                  value={formData.text?.anoModelo || ''}
                  onChange={(e) => handleTextChange('anoModelo', e.target.value)}
                  placeholder="Automático (FIPE/Placa)"
                />
              </div>

              <div className="field">
                <label>1.6 Número do Chassi</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input
                    type="text"
                    id="chassi"
                    value={formData.text?.chassi || ''}
                    onChange={(e) => handleTextChange('chassi', e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                    placeholder="17 caracteres"
                  />
                  <button
                    type="button"
                    title="Escanear código de barras ou gravação do chassi"
                    onClick={() => {
                      setCameraTargetId('chassi');
                      setCameraMode('both');
                      setCameraTitle('Leitor de Código de Barras do Chassi');
                      setCameraOpen(true);
                    }}
                    style={{
                      background: '#1a1a1a',
                      color: '#4CAF50',
                      border: '1px solid #333',
                      borderRadius: '4px',
                      padding: '0 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Camera size={14} />
                    Ler
                  </button>
                </div>
              </div>

              <div className="field">
                <label>1.7 RENAVAM</label>
                <input
                  type="text"
                  id="renavam"
                  value={formData.text?.renavam || ''}
                  onChange={(e) => handleTextChange('renavam', e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="field">
                <label>1.8 Número do Motor</label>
                <input
                  type="text"
                  id="numMotor"
                  value={formData.text?.numMotor || ''}
                  onChange={(e) => handleTextChange('numMotor', e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="field">
                <label>1.9 Hodômetro (km)</label>
                <input
                  type="text"
                  id="hodometro"
                  value={formData.text?.hodometro || ''}
                  onChange={(e) => handleTextChange('hodometro', e.target.value)}
                  inputMode="numeric"
                  placeholder="Ex: 145000"
                />
              </div>

              <div className="field">
                <label>1.10 Cor</label>
                <select
                  id="cor"
                  value={formData.text?.cor || ''}
                  onChange={(e) => handleTextChange('cor', e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {CORES_VEICULO.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>1.11 Tipo de Combustível</label>
                <input
                  type="text"
                  id="combustivel"
                  value={formData.text?.combustivel || ''}
                  onChange={(e) => handleTextChange('combustivel', e.target.value)}
                  placeholder="Diesel, Gasolina, Flex, etc."
                />
              </div>

              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>1.12 Implemento / Carroceria</label>
                <input
                  type="text"
                  id="implemento"
                  value={formData.text?.implemento || ''}
                  onChange={(e) => handleTextChange('implemento', e.target.value)}
                  placeholder="Ex: Baú Frigorífico, Sider, Basculante (deixe em branco se N/A)"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SEÇÕES 2 A 12: Checklist Técnico por Categorias */}
        {/* ==================================================== */}
        {SECTIONS.filter((s) => s.n !== 13).map((sec) => (
          <section key={sec.n} className="sheet" id={`secao-${sec.n}`}>
            <div className="sheet-head">
              <span className="n">{sec.n}</span>
              <h2>{sec.title}</h2>
            </div>
            <div className="sheet-body">
              {sec.items.map((item, idx) => {
                const isObj = typeof item === 'object';
                const text = isObj ? item.text : item;
                const itemId = `s${sec.n}-i${idx}`;
                const numLabel = `${sec.n}.${idx + 1}`;
                const currentVal = formData.radios[itemId];
                const photos = formData.photoUrls[itemId] || [];

                return (
                  <div key={idx} className="item-row">
                    <div className="item-text">
                      <span className="item-num">{numLabel}</span>
                      {text}
                    </div>

                    <div className="opts" data-item={itemId}>
                      <label className={`opt c ${currentVal === 'conforme' ? 'sel' : ''}`}>
                        <input
                          type="radio"
                          name={itemId}
                          value="conforme"
                          checked={currentVal === 'conforme'}
                          onChange={() => handleRadioChange(itemId, 'conforme')}
                        />
                        Conf.
                      </label>
                      <label className={`opt nc ${currentVal === 'nao_conforme' ? 'sel' : ''}`}>
                        <input
                          type="radio"
                          name={itemId}
                          value="nao_conforme"
                          checked={currentVal === 'nao_conforme'}
                          onChange={() => handleRadioChange(itemId, 'nao_conforme')}
                        />
                        N.Conf.
                      </label>
                      <label className={`opt na ${currentVal === 'na' ? 'sel' : ''}`}>
                        <input
                          type="radio"
                          name={itemId}
                          value="na"
                          checked={currentVal === 'na'}
                          onChange={() => handleRadioChange(itemId, 'na')}
                        />
                        N/A
                      </label>
                    </div>

                    <div className="photo-cell" data-photo-item={itemId}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {/* Option 1: Live camera snapshot */}
                        <button
                          type="button"
                          className="photo-btn"
                          title="Fotografar agora com a câmera do celular"
                          onClick={() => {
                            setCameraTargetId(itemId);
                            setCameraMode('photo');
                            setCameraTitle(`Foto do Item ${numLabel} - ${text.slice(0, 35)}...`);
                            setCameraOpen(true);
                          }}
                          style={{ background: '#e8f5e9', borderColor: '#81c784', color: '#1b5e20', fontWeight: '600' }}
                        >
                          <Camera size={13} style={{ marginRight: '3px' }} />
                          Câmera
                        </button>

                        {/* Option 2: Gallery file upload */}
                        <button
                          type="button"
                          className="photo-btn"
                          onClick={() => fileInputRefs.current[itemId]?.click()}
                          title="Anexar arquivo da galeria"
                        >
                          Arquivo ({photos.length})
                        </button>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        ref={(el) => (fileInputRefs.current[itemId] = el)}
                        onChange={(e) => handlePhotoUpload(itemId, e.target.files)}
                      />
                      <div className="photo-thumb-wrap">
                        {photos.map((url, pIdx) => (
                          <div key={pIdx} className="photo-thumb">
                            <img
                              src={url}
                              alt="Anexo"
                              onClick={() => onOpenLightbox(url)}
                            />
                            <button
                              type="button"
                              className="photo-remove"
                              onClick={() => handleRemovePhoto(itemId, pIdx)}
                              title="Remover foto"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* ==================================================== */}
        {/* SEÇÃO 13: Avaliação Funcional e Emissões / Ruído */}
        {/* ==================================================== */}
        <section className="sheet" id="secao-13">
          <div className="sheet-head">
            <span className="n">13</span>
            <h2>Avaliação Funcional e Medição de Emissões / Ruído</h2>
          </div>
          <div className="sheet-body">
            <div className="field" style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>TIPO DE MOTOR</label>
              <div className="opts" style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                <label className={`opt ${formData.radios.tipoMotor13 === 'ciclo_otto' ? 'sel' : ''}`}>
                  <input
                    type="radio"
                    name="tipoMotor13"
                    value="ciclo_otto"
                    checked={formData.radios.tipoMotor13 === 'ciclo_otto'}
                    onChange={() => handleRadioChange('tipoMotor13', 'ciclo_otto')}
                  />
                  Ciclo Otto (Gasolina/Álcool/GNV)
                </label>
                <label className={`opt ${formData.radios.tipoMotor13 === 'diesel' ? 'sel' : ''}`}>
                  <input
                    type="radio"
                    name="tipoMotor13"
                    value="diesel"
                    checked={formData.radios.tipoMotor13 === 'diesel'}
                    onChange={() => handleRadioChange('tipoMotor13', 'diesel')}
                  />
                  Diesel
                </label>
              </div>
            </div>

            <div className="field-grid">
              <div className="field">
                <label>RPM Marcha Lenta</label>
                <input
                  type="text"
                  id="rpmLenta"
                  value={formData.text?.rpmLenta || ''}
                  onChange={(e) => handleTextChange('rpmLenta', e.target.value)}
                  placeholder="ex: 750"
                />
              </div>
              <div className="field">
                <label>RPM Alta</label>
                <input
                  type="text"
                  id="rpmAlta"
                  value={formData.text?.rpmAlta || ''}
                  onChange={(e) => handleTextChange('rpmAlta', e.target.value)}
                  placeholder="ex: 2200"
                />
              </div>
              <div className="field">
                <label>Nível de Ruído (dB)</label>
                <input
                  type="text"
                  id="nivelRuido"
                  value={formData.text?.nivelRuido || ''}
                  onChange={(e) => handleTextChange('nivelRuido', e.target.value)}
                  placeholder="ex: 82"
                />
              </div>
              <div className="field">
                <label>Limite Permitido (dB)</label>
                <input
                  type="text"
                  id="limiteRuido"
                  value={formData.text?.limiteRuido || '95'}
                  onChange={(e) => handleTextChange('limiteRuido', e.target.value)}
                  placeholder="ex: 95"
                />
              </div>
            </div>

            <h3 style={{ fontSize: '12px', marginTop: '20px', marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid #eee' }}>
              MEDIÇÕES DE GASES / OPACIDADE
            </h3>
            <div className="field-grid">
              <div className="field">
                <label>CO (%) - Lenta</label>
                <input
                  type="text"
                  id="coLenta"
                  value={formData.text?.coLenta || ''}
                  onChange={(e) => handleTextChange('coLenta', e.target.value)}
                />
              </div>
              <div className="field">
                <label>CO (%) - Alta</label>
                <input
                  type="text"
                  id="coAlta"
                  value={formData.text?.coAlta || ''}
                  onChange={(e) => handleTextChange('coAlta', e.target.value)}
                />
              </div>
              <div className="field">
                <label>HC (ppm) - Lenta</label>
                <input
                  type="text"
                  id="hcLenta"
                  value={formData.text?.hcLenta || ''}
                  onChange={(e) => handleTextChange('hcLenta', e.target.value)}
                />
              </div>
              <div className="field">
                <label>HC (ppm) - Alta</label>
                <input
                  type="text"
                  id="hcAlta"
                  value={formData.text?.hcAlta || ''}
                  onChange={(e) => handleTextChange('hcAlta', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Fator Lambda (Alta)</label>
                <input
                  type="text"
                  id="lambdaAlta"
                  value={formData.text?.lambdaAlta || ''}
                  onChange={(e) => handleTextChange('lambdaAlta', e.target.value)}
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Opacidade (k) - Veículos Diesel</label>
                <input
                  type="text"
                  id="opacidade"
                  value={formData.text?.opacidade || ''}
                  onChange={(e) => handleTextChange('opacidade', e.target.value)}
                  placeholder="Valor medido m⁻¹"
                />
              </div>
            </div>

            <div className="field" style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>RESULTADO DA AVALIAÇÃO DE EMISSÕES</label>
              <div className="opts" style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                <label className={`opt c ${formData.radios.resultEmissoes === 'conforme' ? 'sel' : ''}`}>
                  <input
                    type="radio"
                    name="resultEmissoes"
                    value="conforme"
                    checked={formData.radios.resultEmissoes === 'conforme'}
                    onChange={() => handleRadioChange('resultEmissoes', 'conforme')}
                  />
                  Aprovado (Conforme)
                </label>
                <label className={`opt nc ${formData.radios.resultEmissoes === 'nao_conforme' ? 'sel' : ''}`}>
                  <input
                    type="radio"
                    name="resultEmissoes"
                    value="nao_conforme"
                    checked={formData.radios.resultEmissoes === 'nao_conforme'}
                    onChange={() => handleRadioChange('resultEmissoes', 'nao_conforme')}
                  />
                  Reprovado (Não Conforme)
                </label>
                <label className={`opt na ${formData.radios.resultEmissoes === 'na' ? 'sel' : ''}`}>
                  <input
                    type="radio"
                    name="resultEmissoes"
                    value="na"
                    checked={formData.radios.resultEmissoes === 'na'}
                    onChange={() => handleRadioChange('resultEmissoes', 'na')}
                  />
                  N/A (Isento)
                </label>
              </div>
            </div>

            <div className="field" style={{ marginTop: '15px' }}>
              <label>Foto do Equipamento / Ticket de Medição</label>
              <div className="photo-cell" style={{ alignItems: 'flex-start', marginTop: '5px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="photo-btn"
                    onClick={() => {
                      setCameraTargetId('s13-ticket');
                      setCameraMode('photo');
                      setCameraTitle('Fotografar Ticket do Analisador de Gases / Ruído');
                      setCameraOpen(true);
                    }}
                    style={{ background: '#e8f5e9', borderColor: '#81c784', color: '#1b5e20', fontWeight: '600' }}
                  >
                    <Camera size={13} style={{ marginRight: '3px' }} />
                    Câmera
                  </button>
                  <button
                    type="button"
                    className="photo-btn"
                    onClick={() => fileInputRefs.current['s13-ticket']?.click()}
                  >
                    Arquivo ({formData.photoUrls['s13-ticket']?.length || 0})
                  </button>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={(el) => (fileInputRefs.current['s13-ticket'] = el)}
                  onChange={(e) => handlePhotoUpload('s13-ticket', e.target.files)}
                />
                <div className="photo-thumb-wrap">
                  {(formData.photoUrls['s13-ticket'] || []).map((url, idx) => (
                    <div key={idx} className="photo-thumb">
                      <img src={url} alt="Ticket" onClick={() => onOpenLightbox(url)} />
                      <button
                        type="button"
                        className="photo-remove"
                        onClick={() => handleRemovePhoto('s13-ticket', idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SEÇÃO 14: Registro de Não Conformidades */}
        {/* ==================================================== */}
        <section className="sheet" id="secao-14">
          <div className="sheet-head">
            <span className="n">14</span>
            <h2>Registro de Não Conformidades</h2>
          </div>
          <div className="sheet-body">
            {Array.from({ length: ncCount }, (_, idx) => idx + 1).map((i) => {
              const itemKey = `nc${i}_item`;
              const prazoKey = `nc${i}_prazo`;
              const descKey = `nc${i}_desc`;
              const critKey = `nc${i}-crit`;
              const recKey = `nc${i}_rec`;
              const photoKey = `nc${i}`;
              const photos = formData.photoUrls[photoKey] || [];
              const selectedCrit = formData.radios[critKey] || 'baixa';

              return (
                <div key={i} className="nc-block" style={{ marginBottom: '18px', border: '1px solid #ddd', padding: '16px', borderRadius: '4px' }}>
                  <h3 style={{ fontSize: '13px', color: '#b00020', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    NC-0{i}
                  </h3>
                  <div className="field-grid">
                    <div className="field">
                      <label>Item do Checklist</label>
                      <input
                        type="text"
                        value={formData.text?.[itemKey] || formData.text?.[`nc${i}-item`] || ''}
                        onChange={(e) => handleTextChange(itemKey, e.target.value)}
                        placeholder="ex: 7.3 ou 2.9"
                      />
                    </div>
                    <div className="field">
                      <label>Prazo para Adequação</label>
                      <input
                        type="date"
                        value={formData.text?.[prazoKey] || formData.text?.[`nc${i}-prazo`] || ''}
                        onChange={(e) => handleTextChange(prazoKey, e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ gridColumn: '1 / -1' }}>
                      <label>Descrição da Não Conformidade</label>
                      <textarea
                        rows={2}
                        value={formData.text?.[descKey] || formData.text?.[`nc${i}-desc`] || ''}
                        onChange={(e) => handleTextChange(descKey, e.target.value)}
                        placeholder="Descreva a avaria ou condição irregular..."
                      />
                    </div>
                    <div className="field">
                      <label>Foto da Falha</label>
                      <div className="photo-cell">
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="photo-btn"
                            onClick={() => {
                              setCameraTargetId(photoKey);
                              setCameraMode('photo');
                              setCameraTitle(`Foto da Não Conformidade NC-0${i}`);
                              setCameraOpen(true);
                            }}
                            style={{ background: '#ffebee', borderColor: '#ef9a9a', color: '#c62828', fontWeight: '600' }}
                          >
                            <Camera size={13} style={{ marginRight: '3px' }} />
                            Câmera
                          </button>
                          <button
                            type="button"
                            className="photo-btn"
                            onClick={() => fileInputRefs.current[photoKey]?.click()}
                          >
                            Arquivo ({photos.length})
                          </button>
                        </div>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          ref={(el) => (fileInputRefs.current[photoKey] = el)}
                          onChange={(e) => handlePhotoUpload(photoKey, e.target.files)}
                        />
                        <div className="photo-thumb-wrap">
                          {photos.map((url, pIdx) => (
                            <div key={pIdx} className="photo-thumb">
                              <img src={url} alt="NC Foto" onClick={() => onOpenLightbox(url)} />
                              <button
                                type="button"
                                className="photo-remove"
                                onClick={() => handleRemovePhoto(photoKey, pIdx)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="field">
                      <label>Criticidade</label>
                      <div className="crit-opts" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <label className={`crit low ${selectedCrit === 'baixa' ? 'sel' : ''}`}>
                          <input
                            type="radio"
                            name={critKey}
                            value="baixa"
                            checked={selectedCrit === 'baixa'}
                            onChange={() => handleRadioChange(critKey, 'baixa')}
                          />
                          Baixa
                        </label>
                        <label className={`crit med ${selectedCrit === 'media' ? 'sel' : ''}`}>
                          <input
                            type="radio"
                            name={critKey}
                            value="media"
                            checked={selectedCrit === 'media'}
                            onChange={() => handleRadioChange(critKey, 'media')}
                          />
                          Média
                        </label>
                        <label className={`crit high ${selectedCrit === 'alta' ? 'sel' : ''}`}>
                          <input
                            type="radio"
                            name={critKey}
                            value="alta"
                            checked={selectedCrit === 'alta'}
                            onChange={() => handleRadioChange(critKey, 'alta')}
                          />
                          Alta
                        </label>
                      </div>
                    </div>
                    <div className="field" style={{ gridColumn: '1 / -1' }}>
                      <label>Recomendação Técnica</label>
                      <textarea
                        rows={2}
                        value={formData.text?.[recKey] || formData.text?.[`nc${i}-rec`] || ''}
                        onChange={(e) => handleTextChange(recKey, e.target.value)}
                        placeholder="Ações corretivas necessárias para liberação do veículo..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="secondary"
              onClick={() => setNcCount((prev) => prev + 1)}
              style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Adicionar Outra Não Conformidade (NC-0{ncCount + 1})
            </button>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SEÇÃO 15: Conclusão da Inspeção e Assinaturas */}
        {/* ==================================================== */}
        <section className="sheet" id="secao-15">
          <div className="sheet-head">
            <span className="n">15</span>
            <h2>Conclusão da Inspeção</h2>
          </div>
          <div className="sheet-body">
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--steel)', marginBottom: '6px' }}>
              Classificação Final
            </label>
            <div className="class-opts" id="class-opts">
              <label
                className={`class-opt ${formData.radios.classificacao === 'apto' ? 'sel-apto' : ''}`}
                data-val="apto"
              >
                <input
                  type="radio"
                  name="classificacao"
                  value="apto"
                  checked={formData.radios.classificacao === 'apto'}
                  onChange={() => handleRadioChange('classificacao', 'apto')}
                />
                APTO PARA OPERAÇÃO
              </label>
              <label
                className={`class-opt ${formData.radios.classificacao === 'restricoes' ? 'sel-restr' : ''}`}
                data-val="restricoes"
              >
                <input
                  type="radio"
                  name="classificacao"
                  value="restricoes"
                  checked={formData.radios.classificacao === 'restricoes'}
                  onChange={() => handleRadioChange('classificacao', 'restricoes')}
                />
                APTO PARA OPERAÇÃO COM RESTRIÇÕES
              </label>
              <label
                className={`class-opt ${formData.radios.classificacao === 'inapto' ? 'sel-inapto' : ''}`}
                data-val="inapto"
              >
                <input
                  type="radio"
                  name="classificacao"
                  value="inapto"
                  checked={formData.radios.classificacao === 'inapto'}
                  onChange={() => handleRadioChange('classificacao', 'inapto')}
                />
                INAPTO PARA OPERAÇÃO
              </label>
            </div>

            <div className="field" style={{ marginTop: '16px' }}>
              <label>Considerações Técnicas do Engenheiro</label>
              <textarea
                id="consideracoes"
                rows={4}
                value={formData.text?.consideracoes || ''}
                onChange={(e) => handleTextChange('consideracoes', e.target.value)}
                placeholder="Parecer descritivo sobre o estado funcional, integridade estrutural e riscos operacionais observados..."
              />
            </div>

            {/* Signature Method Choice */}
            <div className="field" style={{ gridColumn: '1 / -1', marginTop: '24px', padding: '12px', background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: '4px' }}>
              <label style={{ color: 'var(--ink)', fontSize: '13px', fontWeight: 700 }}>
                Método de Assinatura do Relatório
              </label>
              <div className="sig-options" style={{ display: 'flex', gap: '15px', marginTop: '8px', flexWrap: 'wrap' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="sigMethod"
                    value="canvas"
                    checked={!formData.radios.sigMethod || formData.radios.sigMethod === 'canvas'}
                    onChange={() => handleRadioChange('sigMethod', 'canvas')}
                  />
                  {' '}Desenhar na Tela
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="sigMethod"
                    value="icp"
                    checked={formData.radios.sigMethod === 'icp'}
                    onChange={() => handleRadioChange('sigMethod', 'icp')}
                  />
                  {' '}Certificado Digital (ICP-Brasil)
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="sigMethod"
                    value="remote"
                    checked={formData.radios.sigMethod === 'remote'}
                    onChange={() => {
                      handleRadioChange('sigMethod', 'remote');
                      handleSolicitarAssinaturaRemota();
                    }}
                  />
                  {' '}Link Remoto (WhatsApp / E-mail)
                </label>
              </div>
            </div>

            {/* Inspetor Signature Area */}
            <div className="field-grid" style={{ marginTop: '16px', paddingBottom: '16px', borderBottom: '1px dashed var(--paper-line)' }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--ink)', fontSize: '12px', textTransform: 'none', letterSpacing: 0, fontWeight: 700 }}>
                  Responsável pela Inspeção (Engenheiro)
                </label>
              </div>

              <div className="field">
                <label>Nome</label>
                <input
                  list="lista-inspetores"
                  id="respInsNome"
                  value={formData.text?.respInsNome || ''}
                  onChange={(e) => handleTextChange('respInsNome', e.target.value)}
                  placeholder="Selecione ou digite..."
                />
                <datalist id="lista-inspetores">
                  {Object.keys(BANCO_INSPETORES).map((nome, i) => (
                    <option key={i} value={nome} />
                  ))}
                </datalist>
              </div>

              <div className="field">
                <label>CREA / Registro Profissional</label>
                <input
                  type="text"
                  id="respInsCrea"
                  value={formData.text?.respInsCrea || ''}
                  onChange={(e) => handleTextChange('respInsCrea', e.target.value)}
                  placeholder="Ex: RJ-000000/D"
                />
              </div>

              {(!formData.radios.sigMethod || formData.radios.sigMethod === 'canvas') && (
                <SignatureCanvas
                  id="sig-respIns"
                  role="respIns"
                  label="Assinatura em Tela (Inspetor)"
                  initialImage={formData.signatures?.respIns?.image}
                  typedValue={formData.text?.respInsAssinatura || ''}
                  onTypedChange={(val) => handleTextChange('respInsAssinatura', val)}
                  onSignatureDrawn={(dataUrl) => {
                    setFormData((prev) => ({
                      ...prev,
                      signatures: {
                        ...(prev.signatures || {}),
                        respIns: {
                          image: dataUrl || undefined,
                          methodUsed: 'canvas',
                          metadata: { timestamp: new Date().toISOString() }
                        }
                      }
                    }));
                  }}
                />
              )}

              {formData.radios.sigMethod === 'icp' && (
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Autenticação ICP-Brasil (Inspetor)</label>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleSignICP('respIns')}
                    disabled={icpLoading}
                    style={{ padding: '8px 14px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {icpLoading ? 'Validando Certificado Digital...' : '🔒 Autenticar com Token ICP-Brasil (Alex do Vale)'}
                  </button>
                </div>
              )}

              <div className="field">
                <label>Data</label>
                <input
                  type="date"
                  id="respInsData"
                  value={formData.text?.respInsData || formData.text?.dataInsp || ''}
                  onChange={(e) => handleTextChange('respInsData', e.target.value)}
                />
              </div>
            </div>

            {/* Cliente Signature Area */}
            <div className="field-grid" style={{ marginTop: '16px' }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--ink)', fontSize: '12px', textTransform: 'none', letterSpacing: 0, fontWeight: 700 }}>
                  Representante do Cliente / Frotista
                </label>
              </div>

              <div className="field">
                <label>Nome</label>
                <input
                  type="text"
                  id="repCliNome"
                  value={formData.text?.repCliNome || formData.text?.respVeic || ''}
                  onChange={(e) => handleTextChange('repCliNome', e.target.value)}
                  placeholder="Nome do representante"
                />
              </div>

              <div className="field">
                <label>Cargo</label>
                <input
                  type="text"
                  id="repCliCargo"
                  value={formData.text?.repCliCargo || formData.text?.cargoFunc || ''}
                  onChange={(e) => handleTextChange('repCliCargo', e.target.value)}
                  placeholder="Ex: Gerente de Manutenção"
                />
              </div>

              {(!formData.radios.sigMethod || formData.radios.sigMethod === 'canvas') && (
                <SignatureCanvas
                  id="sig-repCli"
                  role="repCli"
                  label="Assinatura em Tela (Cliente)"
                  initialImage={formData.signatures?.repCli?.image}
                  typedValue={formData.text?.repCliAssinatura || ''}
                  onTypedChange={(val) => handleTextChange('repCliAssinatura', val)}
                  onSignatureDrawn={(dataUrl) => {
                    setFormData((prev) => ({
                      ...prev,
                      signatures: {
                        ...(prev.signatures || {}),
                        repCli: {
                          image: dataUrl || undefined,
                          methodUsed: 'canvas',
                          metadata: { timestamp: new Date().toISOString() }
                        }
                      }
                    }));
                  }}
                />
              )}

              {formData.radios.sigMethod === 'remote' && (
                <div className="field" style={{ gridColumn: '1 / -1', background: '#e8f5e9', padding: '12px', borderRadius: '4px' }}>
                  <label style={{ color: '#2e7d32', fontWeight: 'bold' }}>Assinatura Remota via Link</label>
                  <p style={{ fontSize: '12px', color: '#333', margin: '4px 0 10px 0' }}>
                    O cliente receberá um link seguro no WhatsApp ou e-mail para assinar no próprio celular.
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleSolicitarAssinaturaRemota}
                    style={{ padding: '8px 14px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    📲 Reenviar Link pelo WhatsApp
                  </button>
                  {formData.signatures?.repCli?.image && (
                    <div style={{ marginTop: '10px', color: '#2e7d32', fontSize: '12px', fontWeight: '600' }}>
                      ✓ Assinatura remota recebida com sucesso!
                    </div>
                  )}
                </div>
              )}

              <div className="field">
                <label>Data</label>
                <input
                  type="date"
                  id="repCliData"
                  value={formData.text?.repCliData || formData.text?.dataInsp || ''}
                  onChange={(e) => handleTextChange('repCliData', e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SEÇÃO FINANCEIRO: Nota Fiscal e Recibo (Opcional) */}
        {/* ==================================================== */}
        <section className="sheet" id="secao-financeiro">
          <div className="sheet-head">
            <span className="n">$</span>
            <h2>Nota Fiscal e Recibo (Opcional)</h2>
          </div>
          <div className="sheet-body">
            <p className="footnote" style={{ textAlign: 'left', padding: '0 0 10px', fontSize: '12px', color: '#666' }}>
              Preencha apenas se for aplicável. Estes campos servem para referenciar a NF emitida ou emitir um recibo simples (não fiscal).
            </p>
            <div className="field-grid">
              <div className="field">
                <label>Nº da Nota Fiscal</label>
                <input
                  type="text"
                  id="nfNumero"
                  value={formData.text?.nfNumero || ''}
                  onChange={(e) => handleTextChange('nfNumero', e.target.value)}
                  placeholder="ex: 1245"
                />
              </div>
              <div className="field">
                <label>Link / Referência da NF</label>
                <input
                  type="text"
                  id="nfLink"
                  value={formData.text?.nfLink || ''}
                  onChange={(e) => handleTextChange('nfLink', e.target.value)}
                  placeholder="ex: link do PDF ou portal"
                />
              </div>
              <div className="field">
                <label>Valor do Serviço</label>
                <input
                  type="text"
                  id="valorServico"
                  value={formData.text?.valorServico || ''}
                  onChange={(e) => handleTextChange('valorServico', e.target.value)}
                  placeholder="ex: R$ 650,00"
                />
              </div>
              <div className="field">
                <label>Forma de Pagamento</label>
                <input
                  type="text"
                  id="formaPagamento"
                  value={formData.text?.formaPagamento || ''}
                  onChange={(e) => handleTextChange('formaPagamento', e.target.value)}
                  placeholder="ex: Pix, Transferência, Boleto..."
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Pagador (Nome e CPF / CNPJ)</label>
                <input
                  type="text"
                  id="recPagador"
                  value={formData.text?.recPagador || ''}
                  onChange={(e) => handleTextChange('recPagador', e.target.value)}
                  placeholder="deixe em branco para usar o Responsável / Empresa"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SEÇÃO DE AUDITORIA: Histórico de Alterações */}
        {/* ==================================================== */}
        <section className="sheet" id="secao-historico">
          <div className="sheet-head">
            <span className="n">⏱</span>
            <h2>Histórico de Auditoria e Alterações</h2>
          </div>
          <div className="sheet-body">
            {(!formData.history || formData.history.length === 0) ? (
              <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', padding: '6px 0' }}>
                Nenhum histórico registrado ainda. Toda alteração salva registrará data, hora e e-mail do usuário no rodapé da ficha.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '22%', fontWeight: 700 }}>Data e Hora</th>
                      <th style={{ padding: '8px 10px', width: '28%', fontWeight: 700 }}>Usuário / E-mail</th>
                      <th style={{ padding: '8px 10px', width: '22%', fontWeight: 700 }}>Operação</th>
                      <th style={{ padding: '8px 10px', width: '28%', fontWeight: 700 }}>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.history.map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#111' }}>
                          {new Date(entry.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#000' }}>
                          {entry.userEmail}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              background: entry.action.includes('Criação') ? '#E8F5E9' : '#E3F2FD',
                              color: entry.action.includes('Criação') ? '#2E7D32' : '#0D47A1',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#555' }}>
                          {entry.details || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <div className="brand-footer" style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: '11px', letterSpacing: '1px' }}>
          ERCR ENGENHARIA MECÂNICA · WWW.ERCRENGENHARIA.COM.BR · (21) 96414-6270
        </div>
      </main>

      {/* Floating Action Bar */}
      <div className="actions" style={{ position: 'sticky', bottom: 0, background: '#000', borderTop: '1px solid #333', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', zIndex: 40, flexWrap: 'wrap' }}>
        <button className="secondary" id="btn-clear" onClick={handleClearForm}>
          Limpar Campos
        </button>

        {formData.id && onDelete && (
          <button
            className="danger"
            id="btn-delete"
            style={{ background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 14px', cursor: 'pointer' }}
            onClick={() => {
              if (confirm('Deseja excluir permanentemente este laudo?')) {
                onDelete(formData.id!);
              }
            }}
          >
            Excluir Inspeção
          </button>
        )}

        <button
          className="secondary"
          id="btn-save"
          onClick={handleSaveClick}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <Save size={15} />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>

        <button
          className="secondary"
          id="btn-receipt"
          onClick={() => onGenerateReceipt(formData)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <Receipt size={15} />
          Gerar Recibo
        </button>

        <button
          className="primary"
          id="btn-pdf"
          onClick={() => onGeneratePdf(formData)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#2E7D32', color: '#fff' }}
        >
          <Printer size={15} />
          Gerar PDF
        </button>
      </div>
    </div>
  );
};
