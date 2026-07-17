/**
 * js/app.js
 * Arquivo Principal (Orquestrador)
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Inicializa a Autenticação
  AuthService.init();

  // Variáveis de Estado
  let currentRecordId = null;
  let photoUrls = {}; 
  let currentSeq = null;
  let emissionLog = [];

  // Elementos da Interface
  const screenList = document.getElementById('screen-list');
  const screenForm = document.getElementById('screen-form');
  const listContainer = document.getElementById('inspection-list');
  const sectionsContainer = document.getElementById('sections-container');

  // 2. Escuta o evento de Login bem-sucedido para carregar a lista
  window.addEventListener('auth-success', async (e) => {
    await loadList();
  });

  // 3. Renderiza o Checklist Dinâmico na tela
  UIRender.renderChecklist('sections-container', SECTIONS);

  // 4. Navegação Básica
  document.getElementById('btn-new-inspection').addEventListener('click', () => {
    currentRecordId = null;
    clearFormUI();
    document.getElementById('rec-id-label').textContent = 'NOVA INSPEÇÃO · AINDA NÃO SALVA';
    document.getElementById('btn-delete').style.display = 'none';
    screenList.style.display = 'none';
    screenForm.style.display = '';
  });

  document.getElementById('btn-back-list').addEventListener('click', () => {
    screenForm.style.display = 'none';
    screenList.style.display = '';
    loadList();
  });

  // 5. Função para Carregar a Lista do Firestore
  async function loadList() {
    listContainer.innerHTML = '<div class="list-loading">Carregando inspeções…</div>';
    try {
      const records = await StorageService.getInspectionsList();
      if (records.length === 0) {
        listContainer.innerHTML = '<div class="list-empty">Nenhuma inspeção cadastrada.</div>';
        return;
      }

      // Agrupa por status
      const groups = { rascunho: [], pendente_revisao: [], revisado: [] };
      records.forEach(r => groups[r.status || 'rascunho'].push(r));

      const renderGroup = (status, title) => {
        const items = groups[status].map(rec => `
          <div class="card" data-id="${rec.id}">
            <div class="info">
              <div class="placa">${rec.text?.placa || '(sem placa)'}</div>
              <div class="meta">${rec.text?.empresa || ''}</div>
            </div>
            <button class="btn-delete-card" data-id="${rec.id}" title="Excluir">🗑️</button>
          </div>
        `).join('');
        return `<h3>${title}</h3>${items || '<div class="list-empty">Vazio</div>'}`;
      };

      listContainer.innerHTML = `
        ${renderGroup('rascunho', 'Rascunhos')}
        ${renderGroup('pendente_revisao', 'Pendentes de Revisão')}
        ${renderGroup('revisado', 'Aprovados')}
      `;

      // Adiciona eventos de clique
      listContainer.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.classList.contains('btn-delete-card')) loadRecord(card.dataset.id);
        });
      });

      // Adiciona eventos de exclusão
      listContainer.querySelectorAll('.btn-delete-card').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Deseja realmente excluir esta inspeção?')) {
            await StorageService.deleteInspection(btn.dataset.id);
            loadList();
          }
        });
      });
    } catch (err) {
      console.error("🚨 ERRO AO CARREGAR:", err);
    }
  }

      // Adiciona evento de clique em cada card
      listContainer.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => loadRecord(card.dataset.id));
      });
    } catch (err) {
      console.error("🚨 ERRO DETALHADO AO CARREGAR LISTA:", err);
      listContainer.innerHTML = '<div class="list-empty">Erro ao carregar as inspeções. Verifique o console (F12).</div>';
    }
  }

  // 6. Lógica de Interação com o Formulário (Cliques em botões Conforme/Não Conforme)
  sectionsContainer.addEventListener('click', (e) => {
    const opt = e.target.closest('.opt');
    if (!opt) return;
    const group = opt.closest('.opts');
    group.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
    opt.classList.add('sel');
    opt.querySelector('input').checked = true;
    updateGauges();
  });

  function updateGauges() {
    let c = 0, nc = 0, na = 0;
    const radios = document.querySelectorAll('.opts input[type="radio"]:checked');
    radios.forEach(checked => {
      const v = checked.value;
      if (v === 'conforme' || v === 'realizado') c++;
      else if (v === 'nao_conforme' || v === 'nao_realizado') nc++;
      else na++;
    });
    
    // Contagem total baseada nas perguntas geradas
    const total = document.querySelectorAll('.opts').length;
    const pend = total - c - nc - na;
    
    document.getElementById('cnt-c').textContent = c;
    document.getElementById('cnt-nc').textContent = nc;
    document.getElementById('cnt-na').textContent = na;
    document.getElementById('cnt-pend').textContent = pend;
  }

  // 7. Lógica de Salvamento
  async function collectState() {
    const state = { text: {}, radios: {}, status: document.getElementById('status-select').value, photoUrls: { ...photoUrls }, seq: currentSeq, emissionLog: emissionLog };
    
    // Coleta campos de texto
    document.querySelectorAll('input[type=text], input[type=date], input[type=time], textarea').forEach(el => {
      if (el.id) state.text[el.id] = el.value;
    });
    
    // Coleta botões de rádio
    document.querySelectorAll('input[type=radio]:checked').forEach(r => {
      state.radios[r.name] = r.value;
    });
    
    // Coleta assinaturas através do SignatureManager
    state.signatures = {
      methodUsed: signatureManager.currentMethod,
      respIns: await signatureManager.collectSignature('respIns'),
      repCli: await signatureManager.collectSignature('repCli')
    };
    
    return state;
  }

  document.getElementById('btn-save').addEventListener('click', async () => {
    try {
      const state = await collectState();
      currentRecordId = await StorageService.saveInspection(currentRecordId, state);
      
      const label = document.getElementById('rec-id-label');
      const original = label.textContent;
      label.textContent = 'SALVO ✓';
      setTimeout(() => { label.textContent = `ID ${currentRecordId}`; }, 1500);
      
    } catch (err) {
      console.error("🚨 ERRO DETALHADO AO SALVAR:", err);
      alert("Erro ao salvar: " + err.message);
    }
  });

  // 8. Lógica do PDF
  document.getElementById('btn-pdf').addEventListener('click', async () => {
    try {
      if (!currentSeq) {
        const year = new Date().getFullYear();
        currentSeq = { number: await StorageService.getNextSeqNumber(year), year };
      }
      emissionLog.push(new Date().toISOString());
      
      // Salva antes de gerar o PDF
      const state = await collectState();
      await StorageService.saveInspection(currentRecordId, state);
      
      // Monta o relatório HTML e chama a impressão nativa
      // NOTA: Para funcionar sem Base64 solto no código, você precisará importar a logo
      // Como não temos a logo aqui, deixaremos em branco ou você insere o Base64 novamente
      UIRender.buildPrintReport(SECTIONS, state.signatures, currentSeq, "", "55.141.422/0001-79");
      window.print();
      
    } catch (err) {
      console.error("🚨 ERRO DETALHADO NO PDF:", err);
      alert("Erro ao gerar PDF: " + err.message);
    }
  });

  // Funções Auxiliares (Limpar UI, Carregar UI, etc.)
  function clearFormUI() {
    document.querySelectorAll('input[type=text], input[type=date], input[type=time], textarea').forEach(el => el.value = '');
    document.querySelectorAll('input[type=radio]').forEach(el => el.checked = false);
    document.querySelectorAll('.opt, .crit, .class-opt').forEach(el => el.classList.remove('sel', 'sel-apto', 'sel-restr', 'sel-inapto'));
    document.getElementById('status-select').value = 'rascunho';
    photoUrls = {};
    currentSeq = null;
    emissionLog = [];
    updateGauges();
    
    // Limpa os canvases de assinatura
    canvasProvider.clear('respIns');
    canvasProvider.clear('repCli');
  }

  async function loadRecord(id) {
    const state = await StorageService.getInspection(id);
    if (!state) return;
    
    currentRecordId = id;
    clearFormUI();
    
    // Aplica Textos
    Object.entries(state.text || {}).forEach(([key, val]) => {
      const el = document.getElementById(key);
      if (el) el.value = val;
    });
    
    // Aplica Radios
    Object.entries(state.radios || {}).forEach(([name, val]) => {
      const input = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (input) {
        input.checked = true;
        const label = input.closest('label');
        if (label) label.classList.add('sel'); // Simulação visual simplificada
      }
    });
    
    document.getElementById('status-select').value = state.status || 'rascunho';
    photoUrls = state.photoUrls || {};
    currentSeq = state.seq || null;
    emissionLog = state.emissionLog || [];
    
    document.getElementById('rec-id-label').textContent = `ID ${id}`;
    document.getElementById('btn-delete').style.display = '';
    
    screenList.style.display = 'none';
    screenForm.style.display = '';
    updateGauges();
  }
});
