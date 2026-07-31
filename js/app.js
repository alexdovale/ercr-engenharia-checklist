/**
 * js/app.js
 * Arquivo Principal (Orquestrador) - Versão Final Consolidada com Router e E-mail do Emissor
 */

// ==========================================
// VARIÁVEIS GLOBAIS DE CONTROLE
// ==========================================
let usuarioAtual = null;
let firebaseCarregado = false;
let currentRecordId = null;
let photoUrls = {}; 
let currentSeq = null;
let emissionLog = [];

// ==========================================
// 1. OBSERVADOR DE AUTENTICAÇÃO DO FIREBASE
// ==========================================
firebase.auth().onAuthStateChanged((user) => {
  usuarioAtual = user;
  firebaseCarregado = true;
  
  // O AuthStateChanged funciona como um "gatilho" para iniciar o Router
  handleRoute(); 
});

// ==========================================
// 2. MOTOR DO ROUTER (O GUARDAS DE ROTAS)
// ==========================================
function handleRoute() {
  // Impede de rotear antes do Firebase verificar o login
  if (!firebaseCarregado) return; 

  // Pega a URL atual (ex: "#form?id=123"). Se não tiver, vai pro login
  let fullHash = window.location.hash || '#login';
  
  // Pega só o nome da rota principal (ignora o que vem depois do "?")
  let rota = fullHash.split('?')[0]; 

  // --- 🛡️ GUARDA DE ROTA ---
  // Se NÃO está logado e tentou acessar tela restrita -> Força ir pro login
  if (!usuarioAtual && rota !== '#login') {
    window.location.hash = '#login';
    return; // Para a função aqui
  }

  // Se JÁ ESTÁ logado e tentou acessar a tela de login -> Força ir pra lista
  if (usuarioAtual && rota === '#login') {
    window.location.hash = '#lista';
    return;
  }

  // --- 📺 GERENCIAMENTO DAS TELAS ---
  const screenLock = document.getElementById('screen-lock');
  const screenList = document.getElementById('screen-list');
  const screenForm = document.getElementById('screen-form');

  // Oculta todas as telas primeiro
  if(screenLock) screenLock.style.display = 'none';
  if(screenList) screenList.style.display = 'none';
  if(screenForm) screenForm.style.display = 'none';

  // Mostra apenas a tela correta baseada no Hash
  switch (rota) {
    case '#lista':
      if(screenList) screenList.style.display = 'block';
      loadList(); // Carrega os dados do Firebase para a lista
      break;

    case '#form':
      if(screenForm) screenForm.style.display = 'block';
      
      // Lê os parâmetros da URL para saber se deve carregar um ID salvo
      let parametros = new URLSearchParams(window.location.hash.split('?')[1]);
      let idInspecao = parametros.get('id');
      
      if (idInspecao) {
        // Se a rota veio com ID e o currentRecordId é diferente, carrega do banco
        if (currentRecordId !== idInspecao) {
          loadRecord(idInspecao);
        }
      } else {
        // Se a rota não tem ID, é uma Nova Inspeção
        currentRecordId = null;
        clearFormUI();
        const lbl = document.getElementById('rec-id-label');
        if (lbl) lbl.textContent = 'NOVA INSPEÇÃO · AINDA NÃO SALVA';
        const btnDelete = document.getElementById('btn-delete');
        if (btnDelete) btnDelete.style.display = 'none';
      }
      break;

    case '#login':
    default:
      if(screenLock) screenLock.style.display = 'flex';
      break;
  }
}

// 3. ESCUTA MUDANÇAS NA URL (Quando o usuário clica no "Voltar" do navegador/celular)
window.addEventListener('hashchange', handleRoute);


// ==========================================
// CÓDIGO DA APLICAÇÃO (UI, FIREBASE, FOTOS)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  
  // Inicializa a Autenticação manual (caso precise, embora o onAuthStateChanged já cuide da sessão)
  if(typeof AuthService !== 'undefined') AuthService.init();

  const listContainer = document.getElementById('inspection-list');
  const screenForm = document.getElementById('screen-form');

  // 3. Renderiza o Checklist Dinâmico
  if(typeof SECTIONS !== 'undefined' && typeof UIRender !== 'undefined') {
    UIRender.renderChecklist('sections-container', SECTIONS);
  }

  // ==========================================
  // 4. BOTÕES DE NAVEGAÇÃO
  // ==========================================
  
  // Botão Nova Inspeção (Muda o hash sem parâmetros)
  const btnNew = document.getElementById('btn-new-inspection');
  if(btnNew) {
    btnNew.addEventListener('click', () => {
      window.location.hash = '#form';
    });
  }

  // Botão Voltar (Retorna para a lista)
  const btnBack = document.getElementById('btn-back-list');
  if(btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.hash = '#lista';
    });
  }

  // Botão Sair (Logout)
  const btnLogout = document.getElementById('btn-logout');
  if(btnLogout) {
    btnLogout.addEventListener('click', () => {
      firebase.auth().signOut().then(() => {
        window.location.hash = '#login';
      }).catch(err => alert("Erro ao deslogar: " + err.message));
    });
  }

  // ==========================================
  // 5. FUNÇÃO CARREGAR LISTA
  // ==========================================
  async function loadList() {
    if(!listContainer) return;
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
              <!-- 🔥 MOSTRA QUEM EMITIU AQUI: -->
              <div class="meta" style="color: #555; font-size: 10.5px; margin-top: 6px; font-weight: 500;">
                👤 Emitido por: ${rec.creatorEmail || 'Usuário anterior'}
              </div>
            </div>
            <button class="btn-delete-card" data-id="${rec.id}" data-photos='${JSON.stringify(rec.photoUrls || {})}' title="Excluir">🗑️</button>
          </div>
        `).join('');
        return `<h3>${title}</h3>${items || '<div class="list-empty">Vazio</div>'}`;
      };

      listContainer.innerHTML = `${renderGroup('rascunho', 'Rascunhos')}${renderGroup('pendente_revisao', 'Pendentes de Revisão')}${renderGroup('revisado', 'Aprovados')}`;

      // Quando clica no Card, atualiza a Rota passando o ID
      listContainer.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.classList.contains('btn-delete-card')) {
            window.location.hash = `#form?id=${card.dataset.id}`;
          }
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

  // ==========================================
  // 6. LÓGICA DO FORMULÁRIO (Checklist e Fotos)
  // ==========================================
  if(screenForm) {
    screenForm.addEventListener('click', (e) => {
      if (e.target.classList.contains('photo-btn')) {
        e.target.nextElementSibling.click();
      }
    });

    screenForm.addEventListener('change', async (e) => {
      // 6.1 Tratativa dos Botões de Seleção
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

      // 6.2 Upload de Imagens
      if (e.target.type === 'file' && e.target.files && e.target.files.length > 0) {
        if (!currentRecordId) {
          alert("Salve a inspeção em 'Rascunho' antes de anexar fotos para criar o banco de imagens.");
          e.target.value = '';
          return;
        }

        const itemCell = e.target.closest('.photo-cell');
        const itemId = itemCell.dataset.photoItem;
        const thumbWrap = itemCell.querySelector('.photo-thumb-wrap');
        const files = Array.from(e.target.files);

        if (!Array.isArray(photoUrls[itemId])) {
          photoUrls[itemId] = photoUrls[itemId] ? [photoUrls[itemId]] : [];
        }

        const loadingTags = files.map(() => {
          const tag = document.createElement('div');
          tag.className = 'photo-thumb';
          tag.textContent = '…';
          thumbWrap.appendChild(tag);
          return tag;
        });

        for (let i = 0; i < files.length; i++) {
          try {
            const url = await StorageService.uploadPhoto(currentRecordId, itemId, files[i]);
            photoUrls[itemId].push(url);
          } catch (err) {
            console.error("Erro no upload:", err);
            alert("Falha ao subir foto: " + err.message);
          } finally {
            loadingTags[i].remove();
          }
        }

        renderPhotoThumbs(itemId, thumbWrap);
        e.target.value = '';
      }

      // 6.3 Disparo de Assinatura Remota (WhatsApp)
      if (e.target.type === 'radio' && e.target.value === 'remote') {
        if (!currentRecordId) {
          alert("Por favor, clique em 'Salvar' (como Rascunho) antes de solicitar a assinatura remota. Precisamos gerar um ID para o link do cliente!");
          const canvasRadio = document.querySelector('input[type="radio"][value="canvas"]');
          if (canvasRadio) canvasRadio.checked = true;
          return;
        }

        const telefoneInput = document.getElementById('telefone');
        const nomeInput = document.getElementById('repCliNome') || document.getElementById('respVeic');
        const placaInput = document.getElementById('placa');

        const telefone = telefoneInput ? telefoneInput.value.replace(/\D/g, '') : '';
        const nome = nomeInput && nomeInput.value ? nomeInput.value.trim() : 'Cliente';
        const placa = placaInput && placaInput.value ? placaInput.value.trim() : 'Veículo';

        if (!telefone || telefone.length < 10) {
          alert('Por favor, preencha um número de telefone válido no campo "Telefone" antes de solicitar a assinatura.');
          const canvasRadio = document.querySelector('input[type="radio"][value="canvas"]');
          if (canvasRadio) canvasRadio.checked = true;
          return;
        }

        const urlBase = window.location.origin;
        const linkAssinatura = `${urlBase}/assinar.html?id=${currentRecordId}`; 
        
        const mensagem = `Olá, ${nome}.\n\nSegue o link para assinatura digital do laudo de inspeção do veículo placa *${placa}*.\n\nPor favor, acesse o link abaixo para conferir e assinar:\n${linkAssinatura}\n\nAtenciosamente,\nERCR Engenharia Mecânica.`;
        const mensagemCodificada = encodeURIComponent(mensagem);
        const urlWhatsapp = `https://wa.me/55${telefone}?text=${mensagemCodificada}`;
        
        window.open(urlWhatsapp, '_blank');
      }
    });
  }

  // ==========================================
  // FUNÇÕES AUXILIARES DE RENDER E FOTOS
  // ==========================================
  function renderPhotoThumbs(itemId, thumbWrap) {
    const urls = photoUrls[itemId] || [];
    thumbWrap.innerHTML = urls.map((url, idx) => `
      <div class="photo-thumb">
        <img src="${url}">
        <button type="button" class="photo-remove" data-item="${itemId}" data-idx="${idx}">x</button>
      </div>
    `).join('');

    thumbWrap.querySelectorAll('.photo-remove').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        photoUrls[itemId].splice(idx, 1);
        renderPhotoThumbs(itemId, thumbWrap);
      });
    });
  }

  function updateGauges() {
    let c = 0, nc = 0, na = 0;
    document.querySelectorAll('.opts input[type="radio"]:checked').forEach(r => {
      const v = r.value;
      if (v === 'conforme' || v === 'realizado') c++;
      else if (v === 'nao_conforme' || v === 'nao_realizado') nc++;
      else na++;
    });
    
    const elemC = document.getElementById('cnt-c');
    const elemNc = document.getElementById('cnt-nc');
    const elemNa = document.getElementById('cnt-na');
    const elemPend = document.getElementById('cnt-pend');

    if(elemC) elemC.textContent = c;
    if(elemNc) elemNc.textContent = nc;
    if(elemNa) elemNa.textContent = na;
    if(elemPend) elemPend.textContent = (document.querySelectorAll('.opts').length - c - nc - na);
  }

  // ==========================================
  // 7. SALVAMENTO E PDF
  // ==========================================
  async function collectState() {
    const state = { 
      text: {}, 
      radios: {}, 
      status: document.getElementById('status-select')?.value || 'rascunho', 
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

  const btnSave = document.getElementById('btn-save');
  if(btnSave) {
    btnSave.addEventListener('click', async () => {
      try {
        const state = await collectState();
        currentRecordId = await StorageService.saveInspection(currentRecordId, state);
        
        // Atualiza a URL para refletir que a inspeção agora tem um ID (sem recarregar a tela)
        window.history.replaceState(null, null, `#form?id=${currentRecordId}`);
        
        alert('Salvo com sucesso!');
      } catch (err) {
        console.error("🚨 ERRO AO SALVAR:", err);
        alert("Erro: " + err.message);
      }
    });
  }

  const btnPdf = document.getElementById('btn-pdf');
  if(btnPdf) {
    btnPdf.addEventListener('click', async () => {
      try {
        if (!currentSeq && typeof StorageService !== 'undefined') {
          currentSeq = { number: await StorageService.getNextSeqNumber(new Date().getFullYear()), year: new Date().getFullYear() };
        }
        const state = await collectState();
        currentRecordId = await StorageService.saveInspection(currentRecordId, state);
        window.history.replaceState(null, null, `#form?id=${currentRecordId}`);
        
        if(typeof UIRender !== 'undefined') {
          UIRender.buildPrintReport(SECTIONS, state.signatures, currentSeq, "", "55.141.422/0001-79");
        }
        window.print();
      } catch (err) {
        console.error("🚨 ERRO NO PDF:", err);
        alert("Erro: " + err.message);
      }
    });
  }
  
  // Limpar Assinaturas
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

  // Gerar Recibo
  const btnReceipt = document.getElementById('btn-receipt');
  if (btnReceipt) {
    btnReceipt.addEventListener('click', () => {
      const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';
      const cnpj = document.getElementById('cnpj')?.value || '00.000.000/0000-00';
      
      if(typeof UIRender !== 'undefined') UIRender.buildReceiptReport(currentSeq, logoUrl, cnpj);
      window.print();
    });
  }

  // ==========================================
  // CONSTRUTOR DO MENU DE NAVEGAÇÃO E BOTÃO ÍMÃ
  // ==========================================
  const navMenu = document.getElementById('quick-nav');
  if (navMenu && typeof SECTIONS !== 'undefined') {
    navMenu.innerHTML = '<option value="">Ir para a seção...</option>';
    navMenu.innerHTML += `<option value="secao-0">0. Identificação da Inspeção</option>`;
    navMenu.innerHTML += `<option value="secao-1">1. Identificação do Veículo</option>`;
    SECTIONS.forEach(sec => { navMenu.innerHTML += `<option value="secao-${sec.n}">${sec.n}. ${sec.title}</option>`; });
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

  // ==========================================
  // FUNÇÕES DE LIMPEZA E CARREGAMENTO GERAL
  // ==========================================
  // Colocada no escopo global para o Router conseguir chamar
  window.clearFormUI = function() {
    document.querySelectorAll('input[type=text], input[type=date], input[type=time], textarea').forEach(el => el.value = '');
    document.querySelectorAll('input[type=radio]').forEach(el => el.checked = false);
    
    document.querySelectorAll('.opt, .crit').forEach(el => el.classList.remove('sel'));
    document.querySelectorAll('.class-opt').forEach(el => el.classList.remove('sel-apto', 'sel-restr', 'sel-inapto'));
    
    const selM = document.getElementById('fipe-marca');
    const selMod = document.getElementById('fipe-modelo');
    const selA = document.getElementById('fipe-ano');
    if(selM) selM.value = '';
    if(selMod) { selMod.innerHTML = '<option value="">Aguardando Marca...</option>'; selMod.disabled = true; }
    if(selA) { selA.innerHTML = '<option value="">Aguardando Modelo...</option>'; selA.disabled = true; }

    const chassi = document.getElementById('chassi');
    const motor = document.getElementById('numMotor');
    if(chassi) chassi.style.border = "";
    if(motor) motor.style.border = "";

    document.querySelectorAll('.photo-thumb-wrap').forEach(w => w.innerHTML = '');

    photoUrls = {}; 
    currentSeq = null; 
    updateGauges();
    
    if (typeof canvasProvider !== 'undefined') {
      canvasProvider.clear('respIns'); 
      canvasProvider.clear('repCli');
    }
  }

  // Colocada no escopo global para o Router conseguir chamar
  window.loadRecord = async function(id) {
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

    const statusSel = document.getElementById('status-select');
    if(statusSel) statusSel.value = state.status || 'rascunho';

    const rawPhotos = state.photoUrls || {};
    photoUrls = {};
    Object.entries(rawPhotos).forEach(([itemId, val]) => {
      photoUrls[itemId] = Array.isArray(val) ? val : [val];
    });

    Object.keys(photoUrls).forEach(itemId => {
      const cell = document.querySelector(`.photo-cell[data-photo-item="${itemId}"]`);
      const thumbWrap = cell ? cell.querySelector('.photo-thumb-wrap') : null;
      if (thumbWrap) renderPhotoThumbs(itemId, thumbWrap);
    });

    currentSeq = state.seq || null;
    const lbl = document.getElementById('rec-id-label');
    if(lbl) lbl.textContent = `ID ${id}`;
    
    const btnDelete = document.getElementById('btn-delete');
    if (btnDelete) btnDelete.style.display = '';

    updateGauges();
  }

});
