/**
 * js/data/sections.js
 * Contém a estrutura de dados (perguntas e categorias) do checklist.
 */

// Opções padrão para a maioria dos itens do checklist
const DEFAULT_OPTS = [
  ['conforme', 'Conf.'],
  ['nao_conforme', 'N.Conf.'],
  ['na', 'N/A']
];

// Array principal com todas as seções e perguntas da inspeção
const SECTIONS = [
  {
    n: 2, 
    title: "Condições Gerais e Estruturais", 
    items: [
      "Estado geral da carroceria", "Estado geral da cabine", "Estado do interior da cabine",
      "Portas e fechaduras", "Bancos e fixações", "Fixações aparentes da cabine",
      "Estado do baú, caçamba ou implemento", "Plataforma ou implemento devidamente fixado ao chassi",
      "Presença de corrosão aparente", "Presença de trincas aparentes",
      "Presença de deformações estruturais", "Rachaduras ou suportes soltos aparentes"
    ]
  },
  {
    n: 3, 
    title: "Motor e Sistema de Arrefecimento", 
    items: [
      "Nível do óleo lubrificante", "Estado do óleo lubrificante", "Presença de borra ou contaminação no óleo",
      "Nível do líquido de arrefecimento", "Condição do líquido de arrefecimento", "Funcionamento do sistema de arrefecimento",
      "Estado das mangueiras do sistema de arrefecimento", "Estado das conexões do sistema de arrefecimento",
      "Estado da tampa do reservatório", "Vazamentos aparentes de óleo lubrificante",
      "Vazamentos aparentes de líquido de arrefecimento", "Vazamentos aparentes de combustível",
      "Vazamentos aparentes de fluido hidráulico", "Ruídos anormais em funcionamento", "Partida a frio",
      "Partida a quente", "Fumaça anormal no escapamento", "Estado visual do compartimento do motor",
      "Estado do sistema de escapamento", "Fixações aparentes dos componentes"
    ]
  },
  {
    n: 4, 
    title: "Transmissão", 
    items: [
      "Engates normais em todas as marchas", "Vazamentos aparentes na transmissão",
      "Condição do fluido de transmissão", "Trancos anormais durante operação", "Folgas aparentes na transmissão"
    ]
  },
  {
    n: 5, 
    title: "Sistema de Direção", 
    items: [
      "Folgas aparentes", "Estado dos terminais de direção", "Estado das barras de direção",
      "Estado da caixa de direção", "Vazamentos aparentes", "Funcionamento geral do sistema",
      "Alinhamento visual das rodas", "Batidas ou ruídos durante esterçamento"
    ]
  },
  {
    n: 6, 
    title: "Sistema de Suspensão", 
    items: [
      "Estado das molas", "Estado dos amortecedores", "Vazamentos nos amortecedores", "Estado das buchas",
      "Estado dos suportes", "Estado das bandejas (quando aplicável)", "Estado dos batentes",
      "Componentes com desgaste excessivo", "Ruídos anormais provenientes da suspensão"
    ]
  },
  {
    n: 7, 
    title: "Sistema de Freios", 
    items: [
      "Estado geral do sistema de freios", "Estado das lonas de freio", "Estado das pastilhas de freio",
      "Estado dos discos de freio", "Estado dos tambores de freio", "Desgaste irregular dos componentes",
      "Mangueiras e conexões", "Tubulações do sistema", "Vazamentos aparentes",
      "Funcionamento do freio de serviço", "Funcionamento do freio de estacionamento",
      "Pressão e resposta do sistema pneumático (quando aplicável)"
    ]
  },
  {
    n: 8, 
    title: "Rodas e Pneus", 
    items: [
      "Estado geral dos pneus dianteiros", "Estado geral dos pneus traseiros", "Profundidade dos sulcos",
      "Desgaste irregular", "Cortes, rachaduras ou avarias", "Estado das rodas", "Fixação das rodas",
      "Uniformidade de desgaste dos pneus"
    ]
  },
  {
    n: 9, 
    title: "Sistema Elétrico, Iluminação e Sinalização", 
    items: [
      "Estado geral da bateria", "Nível de carga da bateria", "Fixação da bateria", "Estado dos cabos",
      "Estado dos terminais", "Presença de oxidação", "Funcionamento do alternador", "Funcionamento dos fusíveis",
      "Funcionamento dos relés", "Faróis baixos", "Faróis altos", "Lanternas traseiras", "Luzes de freio",
      "Indicadores de direção (setas)", "Pisca-alerta", "Luz de ré", "Luz de placa", "Iluminação do painel",
      "Instrumentos do painel", "Presença de luzes de anomalia", "Buzina", "Sirene de ré (quando aplicável)",
      "Sinalização refletiva obrigatória"
    ]
  },
  {
    n: 10, 
    title: "Vidros e Acessórios", 
    items: [
      "Para-brisa", "Vidros laterais", "Vidro traseiro", "Retrovisores externos", "Retrovisor interno",
      "Limpadores de para-brisa", "Lavadores de para-brisa"
    ]
  },
  {
    n: 11, 
    title: "Equipamentos e Dispositivos de Segurança", 
    items: [
      "Cintos de segurança do motorista", "Cintos de segurança dos passageiros", "Triângulo de sinalização",
      "Macaco", "Chave de roda", "Kit de ferramentas", "Estepe", "Extintor de incêndio (quando aplicável)",
      "Dispositivos obrigatórios de segurança", "Faixas refletivas obrigatórias"
    ]
  },
  {
    n: 12, 
    title: "Componentes Relacionados à Segurança Operacional", 
    items: [
      "Integridade estrutural aparente dos componentes de segurança",
      "Ausência de interferências que comprometam a operação", "Integridade das proteções visíveis",
      "Integridade das fixações visíveis", "Condições gerais para operação segura",
      "Integridade aparente das fixações do implemento ou acessórios (quando aplicável)"
    ]
  },
  {
    n: 13, 
    title: "Avaliação Funcional", 
    items: [
      "Presença de ruídos anormais", "Presença de vibrações excessivas", "Falhas aparentes durante funcionamento",
      "Condições anormais de operação", "Comportamento geral do veículo durante avaliação funcional",
      // Este item tem opções de resposta personalizadas (diferentes do Conf/Não Conf)
      {
        text: "Teste funcional básico de deslocamento (quando realizado)", 
        opts: [
          ["realizado", "Realizado"],
          ["nao_realizado", "Não Realizado"],
          ["nao_aplicavel", "Não Aplicável"]
        ]
      }
    ]
  }
];
