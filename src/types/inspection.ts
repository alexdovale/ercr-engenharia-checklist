export type InspectionStatus = 'rascunho' | 'pendente_revisao' | 'revisado';

export type FinalClassification = 'apto' | 'restricoes' | 'inapto';

export type SignatureMethod = 'canvas' | 'icp' | 'remote';

export type Criticality = 'baixa' | 'media' | 'alta';

export interface SequentialNumber {
  number: number;
  year: number;
}

export interface InspectionHistoryEntry {
  timestamp: string;
  userEmail: string;
  action: string;
  details?: string;
}

export interface SignatureData {
  image?: string;
  text?: string;
  methodUsed?: SignatureMethod;
  metadata?: {
    timestamp?: string;
    location?: { lat: number; lng: number; accuracy?: number } | null;
    authenticatedUser?: { uid: string; email: string | null } | null;
    browserInfo?: string;
    metodo?: string;
    dadosCertificado?: {
      nome?: string;
      cpf?: string;
      emissor?: string;
      serial?: string;
      validade?: string;
    };
    documentHash?: string;
    status?: string;
  };
}

export interface NonConformity {
  id: string; // e.g. "nc1", "nc2"
  num: number;
  item: string;
  prazo: string;
  desc: string;
  crit: Criticality;
  rec: string;
}

export interface InspectionData {
  id?: string;
  userId?: string;
  creatorEmail?: string;
  status: InspectionStatus;
  updatedAt?: string;
  createdAt?: string;
  seq?: SequentialNumber | null;
  emissionLog?: any[];
  history?: InspectionHistoryEntry[];
  text: {
    // 0. Identificação da Inspeção
    empresa?: string;
    cnpj?: string;
    dataInsp?: string;
    horario?: string;
    municipio?: string;
    local?: string;
    respVeic?: string;
    cargoFunc?: string;
    telefone?: string;
    // 1. Identificação do Veículo
    placa?: string;
    marca?: string;
    modelo?: string;
    fipeAno?: string;
    anoFab?: string;
    anoModelo?: string;
    chassi?: string;
    renavam?: string;
    numMotor?: string;
    hodometro?: string;
    cor?: string;
    combustivel?: string;
    implemento?: string;
    valorFipe?: string;
    codigoFipe?: string;
    mesReferenciaFipe?: string;
    // 13. Avaliação Funcional e Emissões
    rpmLenta?: string;
    rpmAlta?: string;
    nivelRuido?: string;
    limiteRuido?: string;
    coLenta?: string;
    coAlta?: string;
    hcLenta?: string;
    hcAlta?: string;
    lambdaAlta?: string;
    opacidade?: string;
    // 14. Não Conformidades (campos dinâmicos)
    [key: string]: string | undefined;
    // 15. Conclusão da Inspeção
    consideracoes?: string;
    respInsNome?: string;
    respInsCrea?: string;
    respInsAssinatura?: string;
    respInsData?: string;
    repCliNome?: string;
    repCliCargo?: string;
    repCliAssinatura?: string;
    repCliData?: string;
    // NF e Recibo
    nfNumero?: string;
    nfLink?: string;
    valorServico?: string;
    formaPagamento?: string;
    recPagador?: string;
  };
  radios: {
    tipoMotor13?: 'ciclo_otto' | 'diesel';
    resultEmissoes?: 'conforme' | 'nao_conforme' | 'na';
    classificacao?: FinalClassification;
    sigMethod?: SignatureMethod;
    [key: string]: string | undefined;
  };
  photoUrls: Record<string, string[]>;
  signatures?: {
    methodUsed?: SignatureMethod;
    respIns?: SignatureData | null;
    repCli?: SignatureData | null;
  };
}

export interface ChecklistItemOption {
  value: string;
  label: string;
}

export interface ChecklistItem {
  id: string; // e.g. "s2-i0"
  numLabel: string; // e.g. "2.1"
  text: string;
  opts?: [string, string][];
}

export interface ChecklistSection {
  n: number;
  title: string;
  items: Array<string | { text: string; opts: [string, string][] }>;
}

export interface FipeItem {
  codigo: string;
  nome: string;
}

export interface FipeDetails {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  SiglaCombustivel: string;
}
