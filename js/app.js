/**
 * js/app.js
 * Arquivo Principal (Orquestrador) - Versão Final Consolidada
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

  // 2. Escuta o evento de Login bem-sucedido
  window.addEventListener('auth-success', async (e) => {
    await loadList();
  });

  // 3. Renderiza o Checklist Dinâmico
  UIRender.renderChecklist('sections-container', SECTIONS);

  // 4. Navegação
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

  // 5. Função Carregar Lista (Status + Exclusão)
  async function loadList() {
    listContainer.innerHTML = '<div class="list-loading">Carregando inspeções…</div>';
    try {
      const records = await StorageService.getInspectionsList();
      if (records.length === 0) {
        listContainer.innerHTML = '<div class="list-empty">Nenhuma inspeção cadastrada.</div>';
        return;
      }

      const groups = { rascunho: [], pendente_revisao: [], revisado: [] };
      records.forEach(r => groups[r.status || 'rascunho'].push(r));

      const renderGroup = (status, title) => {
        const items = groups[status].map(rec => `
          <div class="card" data-id="${rec.id}">
            <div class="info">
              <div class="placa">${rec.text?.placa || '(sem placa)'}</div>
              <div class="meta">${rec.text?.empresa || ''}</div>
            </div>
            <button class="btn-delete-card" data-id="${rec.id}" data-photos='${JSON.stringify(rec.photoUrls || {})}' title="Excluir">🗑️</button>
          </div>
        `).join('');
        return `<h3>${title}</h3>${items || '<div class="list-empty">Vazio</div>'}`;
      };

      listContainer.innerHTML = `${renderGroup('rascunho', 'Rascunhos')}${renderGroup('pendente_revisao', 'Pendentes de Revisão')}${renderGroup('revisado', 'Aprovados')}`;

      listContainer.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.classList.contains('btn-delete-card')) loadRecord(card.dataset.id);
        });
      });

      listContainer.querySelectorAll('.btn-delete-card').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Deseja realmente excluir esta inspeção?')) {
            const id = btn.dataset.id;
            const photos = JSON.parse(btn.dataset.photos || '{}');
            await StorageService.deleteInspection(id, photos);
            loadList();
          }
        });
      });
    } catch (err) {
      console.error("🚨 ERRO AO CARREGAR:", err);
    }
  }

  // 6. Lógica de Checklist e Fotos (Global para todo o formulário)
  screenForm.addEventListener('click', (e) => {
    if (e.target.classList.contains('photo-btn')) {
      e.target.nextElementSibling.click();
    }
  });

  screenForm.addEventListener('change', async (e) => {
    // 6.1 Tratativa dos Botões de Seleção (Seções 2 a 15)
    if (e.target.type === 'radio') {
      const name = e.target.name;
      const group = document.querySelectorAll(`input[name="${name}"]`);
      
      group.forEach(input => {
        const label = input.closest('label');
        if (label) {
          label.classList.remove('sel', 'sel-apto', 'sel-restr', 'sel-inapto');
        }
      });

      const selectedLabel = e.target.closest('label');
      if (selectedLabel) {
        if (selectedLabel.classList.contains('opt') || selectedLabel.classList.contains('crit')) {
          selectedLabel.classList.add('sel');
        } else if (selectedLabel.classList.contains('class-opt')) {
          const val = e.target.value;
          if (val === 'apto') selectedLabel.classList.add('sel-apto');
          if (val === 'restricoes') selectedLabel.classList.add('sel-restr');
          if (val === 'inapto') selectedLabel.classList.add('sel-inapto');
        }
      }

      if (selectedLabel && selectedLabel.classList.contains('opt')) {
        updateGauges();
      }
    }

    // 6.2 Tratativa de Upload de Imagens
    if (e.target.type === 'file' && e.target.files.length > 0) {
      if (!currentRecordId) {
        alert("Salve a inspeção em 'Rascunho' antes de anexar fotos para criar o banco de imagens.");
        e.target.value = '';
        return;
      }

      const file = e.target.files[0];
      const itemCell = e.target.closest('.photo-cell');
      const itemId = itemCell.dataset.photoItem;
      const thumbWrap = itemCell.querySelector('.photo-thumb-wrap');

      thumbWrap.innerHTML = 'Carregando...';

      try {
        const url = await StorageService.uploadPhoto(currentRecordId, itemId, file);
        photoUrls[itemId] = url;
        thumbWrap.innerHTML = `
          <div class="photo-thumb">
            <img src="${url}">
            <button type="button" class="photo-remove" data-item="${itemId}">x</button>
          </div>`;
        
        const removeBtn = thumbWrap.querySelector('.photo-remove');
        if (removeBtn) {
          removeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            delete photoUrls[itemId];
            thumbWrap.innerHTML = '';
          });
        }
      } catch (err) {
        console.error("Erro no upload:", err);
        alert("Falha ao subir foto: " + err.message);
        thumbWrap.innerHTML = '';
      }
    }
  });

  function updateGauges() {
    let c = 0, nc = 0, na = 0;
    document.querySelectorAll('.opts input[type="radio"]:checked').forEach(r => {
      const v = r.value;
      if (v === 'conforme' || v === 'realizado') c++;
      else if (v === 'nao_conforme' || v === 'nao_realizado') nc++;
      else na++;
    });
    document.getElementById('cnt-c').textContent = c;
    document.getElementById('cnt-nc').textContent = nc;
    document.getElementById('cnt-na').textContent = na;
    document.getElementById('cnt-pend').textContent = (document.querySelectorAll('.opts').length - c - nc - na);
  }

  // 7. Salvamento e PDF
  async function collectState() {
    const state = { 
      text: {}, 
      radios: {}, 
      status: document.getElementById('status-select').value, 
      photoUrls: { ...photoUrls }, 
      seq: currentSeq, 
      emissionLog: emissionLog 
    };
    document.querySelectorAll('input[type=text], input[type=date], input[type=time], textarea').forEach(el => { 
      if (el.id) state.text[el.id] = el.value; 
    });
    document.querySelectorAll('input[type=radio]:checked').forEach(r => { 
      state.radios[r.name] = r.value; 
    });
    
    if (typeof signatureManager !== 'undefined') {
      state.signatures = {
        methodUsed: signatureManager.currentMethod,
        respIns: await signatureManager.collectSignature('respIns'),
        repCli: await signatureManager.collectSignature('repCli')
      };
    }
    return state;
  }

  document.getElementById('btn-save').addEventListener('click', async () => {
    try {
      const state = await collectState();
      currentRecordId = await StorageService.saveInspection(currentRecordId, state);
      alert('Salvo com sucesso!');
    } catch (err) {
      console.error("🚨 ERRO AO SALVAR:", err);
      alert("Erro: " + err.message);
    }
  });

  document.getElementById('btn-pdf').addEventListener('click', async () => {
    try {
      if (!currentSeq) currentSeq = { number: await StorageService.getNextSeqNumber(new Date().getFullYear()), year: new Date().getFullYear() };
      const state = await collectState();
      currentRecordId = await StorageService.saveInspection(currentRecordId, state);
      UIRender.buildPrintReport(SECTIONS, state.signatures, currentSeq, "", "55.141.422/0001-79");
      window.print();
    } catch (err) {
      console.error("🚨 ERRO NO PDF:", err);
      alert("Erro: " + err.message);
    }
  });
  
  /**
   * ==========================================
   * ROTINAS EXTRAS E NAVEGAÇÃO DE UX (MÓDULO SEQUENCIAL CORRIGIDO)
   * ==========================================
   */

  // 1. LIMPAR ASSINATURAS (Desenho e Texto)
  document.querySelectorAll('.sig-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.target.dataset.target; 
      const role = e.target.dataset.role;       
      
      const canvas = document.getElementById(targetId);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      const inputTexto = document.getElementById(role + 'Assinatura');
      if (inputTexto) inputTexto.value = '';
    });
  });

  // 2. GERAR RECIBO
  const btnReceipt = document.getElementById('btn-receipt');
  if (btnReceipt) {
    btnReceipt.addEventListener('click', () => {
      const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';
      const cnpj = document.getElementById('cnpj').value || '00.000.000/0000-00';
      
      UIRender.buildReceiptReport(currentSeq, logoUrl, cnpj);
      window.print();
    });
  }

  // 3. CONSTRUTOR DO MENU DE NAVEGAÇÃO (0 ATÉ 15 EM ORDEM)
  const navMenu = document.getElementById('quick-nav');
  if (navMenu && typeof SECTIONS !== 'undefined') {
    navMenu.innerHTML = '<option value="">Ir para a seção...</option>';
    
    // Injeta Seção 0 e Seção 1 de Cabeçalho Fixos
    navMenu.innerHTML += `<option value="secao-0">0. Identificação da Inspeção</option>`;
    navMenu.innerHTML += `<option value="secao-1">1. Identificação do Veículo</option>`;
    
    // Injeta as Seções Dinâmicas (2 até 13)
    SECTIONS.forEach(sec => {
      navMenu.innerHTML += `<option value="secao-${sec.n}">${sec.n}. ${sec.title}</option>`;
    });
    
    // Injeta as Seções Finais Estáticas (14 e 15)
    navMenu.innerHTML += `<option value="secao-14">14. Registro de Não Conformidades</option>`;
    navMenu.innerHTML += `<option value="secao-15">15. Conclusão da Inspeção</option>`;

    navMenu.addEventListener('change', (e) => {
      if (!e.target.value) return;
      const secaoAlvo = document.getElementById(e.target.value);
      if (secaoAlvo) {
        const y = secaoAlvo.getBoundingClientRect().top + window.scrollY - 140;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
      e.target.value = ''; 
    });
  }

  // 4. BOTÃO ÍMÃ: ENCONTRAR PENDENTES
  const gaugePendente = document.querySelector('.gauge.pend');
  if (gaugePendente) {
    gaugePendente.style.cursor = 'pointer';
    gaugePendente.addEventListener('click', () => {
      const rows = document.querySelectorAll('.item-row');
      const pendentes = [];
      
      rows.forEach(row => {
        const opts = row.querySelector('.opts');
        if (opts && !opts.querySelector('input:checked')) {
          pendentes.push(row);
        }
      });

      if (pendentes.length === 0) {
        alert("Parabéns! Não há itens pendentes nesta inspeção.");
        return;
      }

      const alvo = pendentes[0];
      const y = alvo.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      alvo.style.transition = 'background-color 0.3s';
      alvo.style.backgroundColor = '#FFEBEE';
      setTimeout(() => { alvo.style.backgroundColor = 'transparent'; }, 1500);
    });
  }

  /**
   * ==========================================
   * FUNÇÕES AUXILIARES DE ESTADO (UI)
   * ==========================================
   */
  function clearFormUI() {
    document.querySelectorAll('input[type=text], input[type=date], input[type=time], textarea').forEach(el => el.value = '');
    document.querySelectorAll('input[type=radio]').forEach(el => el.checked = false);
    
    document.querySelectorAll('.opt, .crit').forEach(el => el.classList.remove('sel'));
    document.querySelectorAll('.class-opt').forEach(el => el.classList.remove('sel-apto', 'sel-restr', 'sel-inapto'));
    
    // Reseta caixas de seleção da FIPE
    const selM = document.getElementById('fipe-marca');
    const selMod = document.getElementById('fipe-modelo');
    const selA = document.getElementById('fipe-ano');
    if(selM) selM.value = '';
    if(selMod) { selMod.innerHTML = '<option value="">Aguardando Marca...</option>'; selMod.disabled = true; }
    if(selA) { selA.innerHTML = '<option value="">Aguardando Modelo...</option>'; selA.disabled = true; }

    // Reseta as bordas indicadoras da busca por placa
    document.getElementById('chassi').style.border = "";
    document.getElementById('numMotor').style.border = "";

    photoUrls = {}; 
    currentSeq = null; 
    updateGauges();
    
    if (typeof canvasProvider !== 'undefined') {
      canvasProvider.clear('respIns'); 
      canvasProvider.clear('repCli');
    }
  }

  async function loadRecord(id) {
    const state = await StorageService.getInspection(id);
    if (!state) return;
    currentRecordId = id;
    clearFormUI();
    Object.entries(state.text || {}).forEach(([key, val]) => { 
      const el = document.getElementById(key); 
      if (el) el.value = val; 
    });
    
    Object.entries(state.radios || {}).forEach(([name, val]) => {
      const input = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (input) { 
        input.checked = true; 
        const label = input.closest('label');
        
        if (label) {
          if (label.classList.contains('opt') || label.classList.contains('crit')) {
            label.classList.add('sel'); 
          } else if (label.classList.contains('class-opt')) {
            if (val === 'apto') label.classList.add('sel-apto');
            if (val === 'restricoes') label.classList.add('sel-restr');
            if (val === 'inapto') label.classList.add('sel-inapto');
          }
        }
      }
    });

    document.getElementById('status-select').value = state.status || 'rascunho';
    photoUrls = state.photoUrls || {};
    currentSeq = state.seq || null;
    document.getElementById('rec-id-label').textContent = `ID ${id}`;
    screenList.style.display = 'none'; 
    screenForm.style.display = '';
    updateGauges();
  }

});
