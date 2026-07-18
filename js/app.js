/**
 * js/app.js
 * Arquivo Principal (Orquestrador) - Versão Final
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
    
    // 6.1. Opções das seções de 2 a 13 (Conforme / Não Conforme)
    const opt = e.target.closest('.opt');
    if (opt) {
      const group = opt.closest('.opts');
      group.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
      opt.classList.add('sel');
      opt.querySelector('input').checked = true;
      updateGauges();
    }

    // 6.2. Opções da Seção 14 (Criticidade: Baixa, Média, Alta)
    const crit = e.target.closest('.crit');
    if (crit) {
      const group = crit.closest('.crit-opts');
      group.querySelectorAll('.crit').forEach(o => o.classList.remove('sel'));
      crit.classList.add('sel');
      crit.querySelector('input').checked = true;
    }

    // 6.3. Opções da Seção 15 (Classificação Final)
    const classOpt = e.target.closest('.class-opt');
    if (classOpt) {
      const group = classOpt.closest('.class-opts');
      // Limpa seleções anteriores
      group.querySelectorAll('.class-opt').forEach(o => {
        o.classList.remove('sel-apto', 'sel-restr', 'sel-inapto');
      });
      // Aplica a cor certa de acordo com a escolha
      const val = classOpt.dataset.val;
      if (val === 'apto') classOpt.classList.add('sel-apto');
      if (val === 'restricoes') classOpt.classList.add('sel-restr');
      if (val === 'inapto') classOpt.classList.add('sel-inapto');
      
      classOpt.querySelector('input').checked = true;
    }
    
    // 6.4. Botão de Foto (agora funciona em todas as seções)
    if (e.target.classList.contains('photo-btn')) {
      e.target.nextElementSibling.click();
    }
  });

  // Evento global para upload de fotos em qualquer lugar do formulário
  screenForm.addEventListener('change', async (e) => {
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
    
    // Tratativa para coletar assinaturas com segurança
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
   * ROTINAS EXTRAS E NAVEGAÇÃO DE UX
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

  // 3. MENU DE NAVEGAÇÃO RÁPIDA (Alimenta o Select com as Seções)
  const navMenu = document.getElementById('quick-nav');
  if (navMenu && typeof SECTIONS !== 'undefined') {
    SECTIONS.forEach(sec => {
      navMenu.innerHTML += `<option value="secao-${sec.n}">${sec.n}. ${sec.title}</option>`;
    });

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
    
    // Limpa a cor de todas as opções (de todas as seções)
    document.querySelectorAll('.opt, .crit').forEach(el => el.classList.remove('sel'));
    document.querySelectorAll('.class-opt').forEach(el => el.classList.remove('sel-apto', 'sel-restr', 'sel-inapto'));
    
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
        
        // Reconstrói a seleção visual dependendo de qual seção for
        if (label.classList.contains('opt') || label.classList.contains('crit')) {
          label.classList.add('sel'); 
        } else if (label.classList.contains('class-opt')) {
          if (val === 'apto') label.classList.add('sel-apto');
          if (val === 'restricoes') label.classList.add('sel-restr');
          if (val === 'inapto') label.classList.add('sel-inapto');
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
