import { InspectionData, SequentialNumber, InspectionHistoryEntry } from '../types/inspection';

const LOCAL_STORAGE_KEY = 'ercr_inspections_db';
const SEQ_STORAGE_KEY = 'ercr_seq_counter';

const CLOUDINARY_CONFIG = {
  cloudName: 'iil5r8l4',
  uploadPreset: 'checklist_fotos'
};

// Seed samples for immediate inspection review & recharts statistics
const INITIAL_DEMO_DATA: InspectionData[] = [
  {
    id: 'demo-insp-001',
    status: 'revisado',
    creatorEmail: 'alexdovale222@gmail.com',
    createdAt: '2026-08-10T14:30:00.000Z',
    updatedAt: '2026-08-10T16:00:00.000Z',
    seq: { number: 1042, year: 2026 },
    history: [
      {
        timestamp: '2026-08-10T14:30:00.000Z',
        userEmail: 'alexdovale222@gmail.com',
        action: 'Criação da inspeção',
        details: 'Checklist inicial criado no pátio da Transportadora Transrio Ltda'
      },
      {
        timestamp: '2026-08-10T16:00:00.000Z',
        userEmail: 'alexdovale222@gmail.com',
        action: 'Revisão Técnica Finalizada',
        details: 'Emissão de laudo conclusivo Apto com assinaturas digitais colhidas'
      }
    ],
    text: {
      empresa: 'Transportadora Transrio Ltda',
      cnpj: '12.345.678/0001-90',
      dataInsp: '2026-08-10',
      horario: '09:30',
      municipio: 'Duque de Caxias/RJ',
      local: 'Garagem Central ERCR',
      respVeic: 'Carlos Eduardo Mendes',
      cargoFunc: 'Gerente de Frotas',
      telefone: '(21) 98765-4321',
      placa: 'RIO2A18',
      marca: 'Volkswagen',
      modelo: 'Constellation 24.280 V-Tronic',
      anoFab: '2021',
      anoModelo: '2022',
      chassi: '9BWKB4210MP089211',
      renavam: '00129384712',
      numMotor: 'MAN0829124',
      hodometro: '148200',
      cor: 'Branca',
      combustivel: 'Diesel',
      implemento: 'Baú Frigorífico',
      rpmLenta: '750',
      rpmAlta: '2400',
      nivelRuido: '82',
      limiteRuido: '95',
      coLenta: '0.04',
      coAlta: '0.08',
      hcLenta: '15',
      hcAlta: '20',
      lambdaAlta: '1.02',
      opacidade: '0.35',
      consideracoes: 'Veículo em excelentes condições operacionais. Manutenção preventiva em dia.',
      respInsNome: 'Alex do Vale Rosa Santos Nepomuceno Silva',
      respInsCrea: 'RJ-000000/D',
      respInsData: '2026-08-10',
      repCliNome: 'Carlos Eduardo Mendes',
      repCliCargo: 'Gerente de Frotas',
      repCliData: '2026-08-10',
      valorServico: 'R$ 650,00',
      formaPagamento: 'Pix',
      recPagador: 'Transportadora Transrio Ltda'
    },
    radios: {
      tipoMotor13: 'diesel',
      resultEmissoes: 'conforme',
      classificacao: 'apto',
      sigMethod: 'canvas',
      's2-i0': 'conforme', 's2-i1': 'conforme', 's2-i2': 'conforme',
      's3-i0': 'conforme', 's3-i1': 'conforme', 's3-i3': 'conforme',
      's7-i0': 'conforme', 's7-i1': 'conforme', 's7-i9': 'conforme',
      's8-i0': 'conforme', 's8-i1': 'conforme', 's8-i2': 'conforme'
    },
    photoUrls: {
      's2-i0': ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80']
    }
  },
  {
    id: 'demo-insp-002',
    status: 'pendente_revisao',
    creatorEmail: 'engenharia@ercr.com.br',
    createdAt: '2026-09-18T10:15:00.000Z',
    updatedAt: '2026-09-18T11:45:00.000Z',
    seq: { number: 1043, year: 2026 },
    text: {
      empresa: 'Logística Guanabara S.A.',
      cnpj: '33.456.789/0001-12',
      dataInsp: '2026-09-18',
      horario: '10:00',
      municipio: 'Rio de Janeiro/RJ',
      local: 'Pátio Pavuna',
      respVeic: 'Marcos Vinícius Barbosa',
      cargoFunc: 'Coordenador Operacional',
      telefone: '(21) 99123-4567',
      placa: 'ERC2026',
      marca: 'Mercedes-Benz',
      modelo: 'Actros 2651 S 6x4',
      anoFab: '2023',
      anoModelo: '2024',
      chassi: '9BM936234PB781290',
      renavam: '00987654321',
      numMotor: 'MB45798124',
      hodometro: '89500',
      cor: 'Prata',
      combustivel: 'Diesel',
      implemento: 'Cavalo Mecânico',
      rpmLenta: '650',
      rpmAlta: '2100',
      nivelRuido: '84',
      limiteRuido: '95',
      nc1_item: '7.3',
      nc1_prazo: '2026-09-25',
      nc1_desc: 'Pastilhas de freio do segundo eixo com espessura abaixo do limite de segurança recomendado pelo fabricante.',
      nc1_rec: 'Substituição imediata das pastilhas e retífica/inspeção dos discos antes de viagens de longa distância.',
      consideracoes: 'Veículo com aptidão condicionada ao reparo corretivo no sistema de freios.',
      respInsNome: 'Alex do Vale Rosa Santos Nepomuceno Silva',
      respInsCrea: 'RJ-000000/D',
      respInsData: '2026-09-18',
      repCliNome: 'Marcos Vinícius Barbosa',
      repCliCargo: 'Coordenador Operacional',
      repCliData: '2026-09-18',
      valorServico: 'R$ 720,00',
      formaPagamento: 'Boleto 15 dias',
      recPagador: 'Logística Guanabara S.A.'
    },
    radios: {
      tipoMotor13: 'diesel',
      resultEmissoes: 'conforme',
      classificacao: 'restricoes',
      'nc1-crit': 'media',
      sigMethod: 'canvas',
      's7-i2': 'nao_conforme'
    },
    photoUrls: {}
  },
  {
    id: 'demo-insp-003',
    status: 'revisado',
    creatorEmail: 'alexdovale222@gmail.com',
    createdAt: '2026-09-29T16:00:00.000Z',
    updatedAt: '2026-09-29T17:30:00.000Z',
    seq: { number: 1044, year: 2026 },
    text: {
      empresa: 'Distribuidora Nova Aurora',
      cnpj: '22.111.333/0001-44',
      dataInsp: '2026-09-29',
      horario: '14:20',
      municipio: 'Nova Iguaçu/RJ',
      local: 'Galpão KM 12',
      respVeic: 'Roberto Almeida',
      cargoFunc: 'Motorista Encarregado',
      telefone: '(21) 98888-1122',
      placa: 'ABC1234',
      marca: 'Ford',
      modelo: 'Cargo 816',
      anoFab: '2018',
      anoModelo: '2019',
      chassi: '9BFZB4820KA092812',
      renavam: '00543216789',
      numMotor: 'FD81640192',
      hodometro: '265000',
      cor: 'Vermelha',
      combustivel: 'Diesel',
      implemento: 'Carroceria Aberta',
      rpmLenta: '800',
      rpmAlta: '2500',
      nivelRuido: '98',
      limiteRuido: '95',
      nc1_item: '2.9',
      nc1_prazo: '2026-10-05',
      nc1_desc: 'Trinca estrutural na longarina esquerda do chassi próxima à fixação do implemento com risco iminente de colapso.',
      nc1_rec: 'Interdição do veículo. Necessário procedimento de soldagem homologado por profissional qualificado e reforço de viga.',
      consideracoes: 'Laudo conclusivo desfavorável à circulação imediata devido a grave comprometimento estrutural.',
      respInsNome: 'Alex do Vale Rosa Santos Nepomuceno Silva',
      respInsCrea: 'RJ-000000/D',
      respInsData: '2026-09-29',
      repCliNome: 'Roberto Almeida',
      repCliCargo: 'Motorista Encarregado',
      repCliData: '2026-09-29',
      valorServico: 'R$ 550,00',
      formaPagamento: 'Transferência Bancária'
    },
    radios: {
      tipoMotor13: 'diesel',
      resultEmissoes: 'nao_conforme',
      classificacao: 'inapto',
      'nc1-crit': 'alta',
      sigMethod: 'canvas',
      's2-i9': 'nao_conforme'
    },
    photoUrls: {}
  },
  {
    id: 'demo-insp-004',
    status: 'rascunho',
    creatorEmail: 'alexdovale222@gmail.com',
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T09:40:00.000Z',
    text: {
      empresa: 'Expresso Caxiense Eireli',
      cnpj: '44.555.666/0001-77',
      dataInsp: '2026-10-15',
      horario: '08:45',
      municipio: 'Duque de Caxias/RJ',
      local: 'Oficina Mecânica ERCR',
      respVeic: 'Fernando Silveira',
      cargoFunc: 'Supervisor Técnico',
      telefone: '(21) 97777-6655',
      placa: 'KLS8890',
      marca: 'Scania',
      modelo: 'R 450 Highline',
      anoFab: '2020',
      anoModelo: '2021',
      chassi: '9BS738129LA091238',
      renavam: '00781293847',
      numMotor: 'SC45091283',
      hodometro: '192000',
      cor: 'Azul',
      combustivel: 'Diesel'
    },
    radios: {
      classificacao: 'apto',
      sigMethod: 'canvas'
    },
    photoUrls: {}
  },
  {
    id: 'demo-insp-005',
    status: 'revisado',
    creatorEmail: 'alexdovale222@gmail.com',
    createdAt: '2026-10-22T11:00:00.000Z',
    updatedAt: '2026-10-22T13:20:00.000Z',
    seq: { number: 1045, year: 2026 },
    text: {
      empresa: 'Petrovale Combustíveis',
      cnpj: '55.141.422/0001-79',
      dataInsp: '2026-10-22',
      horario: '11:15',
      municipio: 'Belford Roxo/RJ',
      local: 'Base Distribuição',
      respVeic: 'Juliana Castro',
      cargoFunc: 'Engenheira de Segurança',
      telefone: '(21) 96414-6270',
      placa: 'PET7G19',
      marca: 'Volvo',
      modelo: 'FH 540 Globetrotter',
      anoFab: '2022',
      anoModelo: '2023',
      chassi: '9BV839129PB891023',
      renavam: '00891234712',
      numMotor: 'D13K5409123',
      hodometro: '95400',
      cor: 'Branca',
      combustivel: 'Diesel',
      implemento: 'Tanque Inox 40.000L',
      rpmLenta: '600',
      rpmAlta: '2000',
      nivelRuido: '80',
      limiteRuido: '95',
      consideracoes: 'Veículo aprovado em todos os testes estruturais e normas de transporte perigoso.',
      respInsNome: 'Alex do Vale Rosa Santos Nepomuceno Silva',
      respInsCrea: 'RJ-000000/D',
      respInsData: '2026-10-22',
      repCliNome: 'Juliana Castro',
      repCliCargo: 'Engenheira de Segurança',
      repCliData: '2026-10-22',
      valorServico: 'R$ 890,00',
      formaPagamento: 'Pix',
      recPagador: 'Petrovale Combustíveis'
    },
    radios: {
      tipoMotor13: 'diesel',
      resultEmissoes: 'conforme',
      classificacao: 'apto',
      sigMethod: 'canvas'
    },
    photoUrls: {}
  }
];

export const StorageService = {
  // Get all inspections
  async getInspectionsList(): Promise<InspectionData[]> {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        // Initialize with default demo set
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
        return INITIAL_DEMO_DATA;
      }
      const data: InspectionData[] = JSON.parse(stored);
      return data.sort((a, b) => {
        const da = new Date(b.updatedAt || b.createdAt || 0).getTime();
        const db = new Date(a.updatedAt || a.createdAt || 0).getTime();
        return da - db;
      });
    } catch (err) {
      console.error('Erro ao ler do storage:', err);
      return INITIAL_DEMO_DATA;
    }
  },

  // Get single inspection by ID
  async getInspection(id: string): Promise<InspectionData | null> {
    const list = await this.getInspectionsList();
    const item = list.find(i => i.id === id);
    return item || null;
  },

  // Save or update an inspection
  async saveInspection(
    id: string | null | undefined,
    data: Partial<InspectionData>,
    currentUser?: { email?: string; uid?: string } | null
  ): Promise<string> {
    const list = await this.getInspectionsList();
    const recordId = id || `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const existingIndex = list.findIndex(i => i.id === recordId);
    const existingRecord = existingIndex >= 0 ? list[existingIndex] : null;
    const isUpdate = existingIndex >= 0;

    // Build audit history log entry tracking date, time, and user email
    const userEmail = currentUser?.email || data.creatorEmail || existingRecord?.creatorEmail || 'alexdovale222@gmail.com';
    const historyEntry: InspectionHistoryEntry = {
      timestamp: now,
      userEmail,
      action: isUpdate ? 'Alteração de dados' : 'Criação da inspeção',
      details: isUpdate
        ? `Status: ${data.status || existingRecord?.status || 'rascunho'} - Atualização salva`
        : 'Início do checklist técnico pelo inspetor'
    };

    const prevHistory = existingRecord?.history || data.history || [];
    const updatedHistory = [...prevHistory, historyEntry];

    const record: InspectionData = {
      id: recordId,
      status: data.status || (existingRecord ? existingRecord.status : 'rascunho'),
      userId: currentUser?.uid || data.userId || (existingRecord ? existingRecord.userId : 'guest_user'),
      creatorEmail: userEmail,
      createdAt: existingRecord ? existingRecord.createdAt : now,
      updatedAt: now,
      seq: data.seq || (existingRecord ? existingRecord.seq : null),
      history: updatedHistory,
      text: { ...(existingRecord ? existingRecord.text : {}), ...(data.text || {}) },
      radios: { ...(existingRecord ? existingRecord.radios : {}), ...(data.radios || {}) },
      photoUrls: { ...(existingRecord ? existingRecord.photoUrls : {}), ...(data.photoUrls || {}) },
      signatures: data.signatures || (existingRecord ? existingRecord.signatures : undefined)
    };

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    return recordId;
  },

  // Delete inspection
  async deleteInspection(id: string): Promise<boolean> {
    const list = await this.getInspectionsList();
    const filtered = list.filter(i => i.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  // Generate unique sequential number: Nº 1046/2026
  async getNextSeqNumber(year: number = new Date().getFullYear()): Promise<SequentialNumber> {
    try {
      const key = `${SEQ_STORAGE_KEY}_${year}`;
      const current = parseInt(localStorage.getItem(key) || '1045', 10);
      const next = current + 1;
      localStorage.setItem(key, String(next));
      return { number: next, year };
    } catch (err) {
      return { number: Math.floor(1000 + Math.random() * 9000), year };
    }
  },

  // Upload photo to Cloudinary with reliable Base64 fallback
  async uploadPhoto(recordId: string, itemId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      formData.append('public_id', `inspecoes/${recordId}/${itemId}_${Date.now()}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.secure_url) {
          return result.secure_url;
        }
      }
    } catch (err) {
      console.warn('Cloudinary upload indisponível ou bloqueado, utilizando buffer local:', err);
    }

    // High quality local data URL fallback so user never loses photo attachments
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Falha ao processar arquivo de imagem.'));
      reader.readAsDataURL(file);
    });
  },

  // Import inspections from backup JSON
  async importBackup(importedList: InspectionData[]): Promise<number> {
    const currentList = await this.getInspectionsList();
    const map = new Map<string, InspectionData>();
    currentList.forEach(item => { if (item.id) map.set(item.id, item); });
    let importedCount = 0;
    importedList.forEach(item => {
      if (item && typeof item === 'object') {
        const id = item.id || `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        map.set(id, { ...item, id });
        importedCount++;
      }
    });
    const merged = Array.from(map.values());
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    return importedCount;
  }
};
