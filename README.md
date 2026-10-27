# Checklist de Inspeção e Perícia Técnica Veicular · ERCR Engenharia Mecânica

Sistema completo de inspeção, perícia técnica e emissão de laudos veiculares para a **ERCR Engenharia Mecânica**, reescrito em **React + TypeScript + Vite** com painel estatístico integrado via **Recharts**.

## 🚀 Funcionalidades Principais

- **Autenticação & Controle de Sessão**: Acesso para engenheiros e inspetores técnicos credenciados com modo rápido para demonstração.
- **Painel Estatístico com Recharts (`StatsDashboard`)**:
  - **Distribuição de Resultados Técnicos** (`PieChart`): Proporção de veículos *Apto*, *Apto com Restrições* e *Inapto para Operação*.
  - **Volume de Inspeções por Mês** (`BarChart`): Acompanhamento temporal da volumetria mensal de perícias realizadas.
  - **Status no Fluxo de Trabalho**: Distribuição entre Rascunhos, Pendentes de Revisão e Laudos Aprovados.
  - **Criticidade de Falhas (NCs)**: Gravidade dos apontamentos técnicos (Baixa, Média, Alta).
  - **Indicadores Chave (KPIs)**: Total de inspeções, taxa de aprovação percentual, total de não conformidades e laudos do mês vigente.
  - **Filtros por Período**: Visualização de todos os laudos, ano atual ou últimos 6 meses.
- **Painel de Inspeções (Dashboard)**:
  - Busca instantânea por placa, empresa, modelo ou inspetor.
  - Agrupamento visual por status (*Rascunho*, *Pendente de Revisão*, *Aprovado*).
- **Checklist Técnico Completo (Seções 0 a 15)**:
  - **0. Identificação da Inspeção**: Dados do frotista, local, data, horário, responsável e município.
  - **1. Identificação do Veículo**: Busca inteligente por placa (Mercosul/antiga) e integração com a **API FIPE** (marca, modelo, versão, ano e combustível).
  - **2 a 12. Seções de Inspeção Mecânica**: Mais de 100 itens estruturais, motor, suspensão, freios, elétrica, pneus e segurança com opções *Conforme*, *Não Conforme* e *N/A*.
  - **Upload e Galeria Fotográfica**: Anexo de fotos por item com visualizador em tela cheia (*Lightbox*).
  - **13. Avaliação Funcional e Emissões/Ruído**: Medições de gases (CO, HC, Lambda), opacidade diesel, RPM e decibéis de ruído.
  - **14. Registro de Não Conformidades**: Apontamento detalhado de avarias com prazos, fotos, criticidade e recomendações técnicas.
  - **15. Conclusão da Inspeção**: Parecer técnico, classificação final e assinaturas.
- **Múltiplos Métodos de Assinatura**:
  - *Desenhar na Tela*: Assinatura interativa touch/mouse de alta precisão.
  - *Certificado Digital ICP-Brasil / Gov.br*: Registro criptográfico de validade jurídica.
  - *Link Remoto via WhatsApp*: Envio direto de link (`#assinar?id=...`) para assinatura do cliente no smartphone.
- **Emissão e Impressão de Laudos e Recibos**:
  - Laudo pericial formal em PDF nativo com rodapé *full-bleed* anti-corte, numeração sequencial (`Nº XXXX/2026`) e carimbos de CREA.
  - Recibo financeiro avulso de prestação de serviços com dados do pagador e forma de pagamento.

## 🛠️ Tecnologias Utilizadas

- **React 18** & **TypeScript**
- **Vite**
- **Recharts** (gráficos e relatórios estatísticos)
- **Lucide React** (ícones)
- **Estilos Originais ERCR Engenharia Mecânica** (tipografia *IBM Plex Sans* e *IBM Plex Mono*, layout escuro/monocromático de alto contraste).

## 💻 Desenvolvimento

```bash
npm install
npm run dev
```

Acesse em `http://localhost:3000`.