/**
 * js/app.js
 * Arquivo Principal (Orquestrador) - Versão Final Consolidada com Router, E-mail, Correção de Imagens e html2pdf (iOS)
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
// 🔥 PRÉ-CARREGAMENTO DE IMAGENS DO PDF 🔥
// Garante que as imagens já estejam no cache
// ==========================================
const preloadRodape = new Image();
preloadRodape.src = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/rodap%C3%A9.png';

const preloadFundo = new Image();
preloadFundo.src = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr-icone.png';

const preloadLogoTopo = new Image();
preloadLogoTopo.src = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';


// ==========================================
// 1. OBSERVADOR DE AUTENTICAÇÃO DO FIREBASE
// ==========================================
firebase.auth().onAuthStateChanged((user) => {
  usuarioAtual = user;
  firebaseCarregado = true;
  handleRoute(); 
});

// ==========================================
// 2. MOTOR DO ROUTER (O GUARDAS DE ROTAS)
// ==========================================
function handleRoute() {
  if (!firebaseCarregado) return; 

  let fullHash = window.location.hash || '#login';
  let rota = fullHash.split('?')[0]; 

  // Guarda de Rota
  if (!usuarioAtual && rota !== '#login') {
    window.location.hash = '#login';
    return;
  }
  if (usuarioAtual && rota === '#login') {
    window.location.hash = '#lista';
    return;
  }

  const screenLock = document.getElementById('screen-lock');
  const screenList = document.getElementById('screen-list');
  const screenForm = document.getElementById('screen-form');

  if(screenLock) screenLock.style.display = 'none';
  if(screenList) screenList.style.display = 'none';
  if(screenForm) screenForm.style.display = 'none';

  switch (rota) {
    case '#lista':
      if(screenList) screenList.style.display = 'block';
      if(typeof window.loadList === 'function') window.loadList(); 
      break;

    case '#form':
      if(screenForm) screenForm.style.display = 'block';
      
      let parametros = new URLSearchParams(window.location.hash.split('?')[1]);
      let idInspecao = parametros.get('id');
      
      if (idInspecao) {
        if (currentRecordId !== idInspecao) {
          loadRecord(idInspecao);
        }
      } else {
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

window.addEventListener('hashchange', handleRoute);

// ==========================================
// CÓDIGO DA APLICAÇÃO (UI, FIREBASE, FOTOS)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  
  if(typeof AuthService !== 'undefined') AuthService.init();

  const listContainer = document.getElementById('inspection-list');
  const screenForm = document.getElementById('screen-form');

  if(typeof SECTIONS !== 'undefined' && typeof UIRender !== 'undefined') {
    UIRender.renderChecklist('sections-container', SECTIONS);
  }

  // NAVEGAÇÃO
  const btnNew = document.getElementById('btn-new-inspection');
  if(btnNew) btnNew.addEventListener('click', () => { window.location.hash = '#form'; });

  const btnBack = document.getElementById('btn-back-list');
  if(btnBack) btnBack.addEventListener('click', () => { window.location.hash = '#lista'; });

  const btnLogout = document.getElementById('btn-logout');
  if(btnLogout) {
    btnLogout.addEventListener('click', () => {
      firebase.auth().signOut().then(() => {
        window.location.hash = '#login';
      }).catch(err => alert("Erro ao deslogar: " + err.message));
    });
  }

  // CARREGAR LISTA
  window.loadList = async function() {
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
            window.loadList(); 
          }
        });
      });
    } catch (err) {
      console.error("🚨 ERRO AO CARREGAR:", err);
    }
  }

  // FORMULÁRIO (Checklist e Fotos)
  if(screenForm) {
    screenForm.addEventListener('click', (e) => {
      if (e.target.classList.contains('photo-btn')) e.target.nextElementSibling.click();
    });

    screenForm.addEventListener('change', async (e) => {
      if (e.target.type === 'radio') {
        const name = e.target.name;
        document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
          const label = input.closest('label');
          if (label) label.classList.remove('sel', 'sel-apto', 'sel-restr', 'sel-inapto');
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
        if (selectedLabel && selectedLabel.classList.contains('opt')) updateGauges();
      }

      if (e.target.type === 'file' && e.target.files && e.target.files.length > 0) {
        if (!currentRecordId) {
          alert("Salve a inspeção em 'Rascunho' antes de anexar fotos.");
          e.target.value = '';
          return;
        }

        const itemCell = e.target.closest('.photo-cell');
        const itemId = itemCell.dataset.photoItem;
        const thumbWrap = itemCell.querySelector('.photo-thumb-wrap');
        const files = Array.from(e.target.files);

        if (!Array.isArray(photoUrls[itemId])) photoUrls[itemId] = [];

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

      // WhatsApp Remoto
      if (e.target.type === 'radio' && e.target.value === 'remote') {
        if (!currentRecordId) {
          alert("Por favor, salve antes de solicitar a assinatura remota.");
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
          alert('Preencha um telefone válido antes de solicitar a assinatura.');
          const canvasRadio = document.querySelector('input[type="radio"][value="canvas"]');
          if (canvasRadio) canvasRadio.checked = true;
          return;
        }

        const urlBase = window.location.origin;
        const linkAssinatura = `${urlBase}/assinar.html?id=${currentRecordId}`; 
        const mensagem = `Olá, ${nome}.\n\nSegue o link para assinatura do laudo do veículo *${placa}*:\n${linkAssinatura}\n\nAtenciosamente,\nERCR Engenharia Mecânica.`;
        
        window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, '_blank');
      }
    });
  }

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
        photoUrls[itemId].splice(parseInt(btn.dataset.idx, 10), 1);
        renderPhotoThumbs(itemId, thumbWrap);
      });
    });
  }

  function updateGauges() {
    let c = 0, nc = 0, na = 0;
    document.querySelectorAll('.opts input[type="radio"]:checked').forEach(r => {
      if (r.value === 'conforme' || r.value === 'realizado') c++;
      else if (r.value === 'nao_conforme' || r.value === 'nao_realizado') nc++;
      else na++;
    });
    
    if(document.getElementById('cnt-c')) document.getElementById('cnt-c').textContent = c;
    if(document.getElementById('cnt-nc')) document.getElementById('cnt-nc').textContent = nc;
    if(document.getElementById('cnt-na')) document.getElementById('cnt-na').textContent = na;
    if(document.getElementById('cnt-pend')) document.getElementById('cnt-pend').textContent = (document.querySelectorAll('.opts').length - c - nc - na);
  }

  // SALVAR E PDF
  async function collectState() {
    const state = { 
      text: {}, radios: {}, status: document.getElementById('status-select')?.value || 'rascunho', 
      photoUrls: { ...photoUrls }, seq: currentSeq, emissionLog: emissionLog 
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
        window.history.replaceState(null, null, `#form?id=${currentRecordId}`);
        alert('Salvo com sucesso!');
      } catch (err) {
        alert("Erro: " + err.message);
      }
    });
  }

  // =========================================================
  // BOTÃO GERAR PDF (iOS + PC com html2pdf)
  // =========================================================
  const btnPdf = document.getElementById('btn-pdf');
  if(btnPdf) {
    btnPdf.addEventListener('click', async () => {
      try {
        const originalText = btnPdf.textContent;
        btnPdf.textContent = '⏳ Gerando PDF...';
        btnPdf.disabled = true;

        if (!currentSeq && typeof StorageService !== 'undefined') {
          currentSeq = { number: await StorageService.getNextSeqNumber(new Date().getFullYear()), year: new Date().getFullYear() };
        }
        const state = await collectState();
        currentRecordId = await StorageService.saveInspection(currentRecordId, state);
        window.history.replaceState(null, null, `#form?id=${currentRecordId}`);
        
        if(typeof UIRender !== 'undefined') {
          UIRender.buildPrintReport(SECTIONS, state.signatures, currentSeq, "", "55.141.422/0001-79");
        }
        
        const reportDiv = document.getElementById('print-report');
        const images = Array.from(reportDiv.querySelectorAll('img'));
        let loaded = 0;

        const generatePDF = async () => {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const opt = {
            margin:       0,
            filename:     `Laudo_${state.text?.placa || 'Inspecao'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          try {
            await html2pdf().set(opt).from(reportDiv).save();
          } catch(e) {
            console.error(e);
            alert("Erro ao processar PDF: " + e.message);
          }

          btnPdf.textContent = originalText;
          btnPdf.disabled = false;
        };

        if (images.length === 0) {
          generatePDF();
        } else {
          images.forEach(img => {
            if (img.complete) {
              loaded++;
              if (loaded === images.length) generatePDF();
            } else {
              img.onload = () => { loaded++; if (loaded === images.length) generatePDF(); };
              img.onerror = () => { loaded++; if (loaded === images.length) generatePDF(); };
            }
          });
        }

      } catch (err) {
        alert("Erro: " + err.message);
        btnPdf.textContent = 'Gerar PDF';
        btnPdf.disabled = false;
      }
    });
  }
  
  document.querySelectorAll('.sig-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.target.dataset.target; 
      const canvas = document.getElementById(targetId);
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      const inputTexto = document.getElementById(e.target.dataset.role + 'Assinatura');
      if (inputTexto) inputTexto.value = '';
    });
  });

  // =========================================================
  // BOTÃO RECIBO (iOS + PC com html2pdf)
  // =========================================================
  const btnReceipt = document.getElementById('btn-receipt');
  if (btnReceipt) {
    btnReceipt.addEventListener('click', async () => {
      const originalText = btnReceipt.textContent;
      btnReceipt.textContent = '⏳ Gerando Recibo...';
      btnReceipt.disabled = true;

      const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';
      const cnpj = document.getElementById('cnpj')?.value || '00.000.000/0000-00';
      
      if(typeof UIRender !== 'undefined') UIRender.buildReceiptReport(currentSeq, logoUrl, cnpj);
      
      const reportDiv = document.getElementById('print-report');
      const images = Array.from(reportDiv.querySelectorAll('img'));
      let loaded = 0;

      const generateReceiptPDF = async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const opt = {
          margin:       0,
          filename:     `Recibo_${currentSeq ? currentSeq.number : 'Novo'}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
          await html2pdf().set(opt).from(reportDiv).save();
        } catch(e) {
          console.error(e);
          alert("Erro ao processar Recibo: " + e.message);
        }

        btnReceipt.textContent = originalText;
        btnReceipt.disabled = false;
      };

      if (images.length === 0) {
        generateReceiptPDF();
      } else {
        images.forEach(img => {
          if (img.complete) {
            loaded++;
            if (loaded === images.length) generateReceiptPDF();
          } else {
            img.onload = () => { loaded++; if (loaded === images.length) generateReceiptPDF(); };
            img.onerror = () => { loaded++; if (loaded === images.length) generateReceiptPDF(); };
          }
        });
      }
    });
  }

  // MENU E BOTÃO ÍMÃ
  const navMenu = document.getElementById('quick-nav');
  if (navMenu && typeof SECTIONS !== 'undefined') {
    navMenu.innerHTML = '<option value="">Ir para a seção...</option><option value="secao-0">0. Identificação da Inspeção</option><option value="secao-1">1. Identificação do Veículo</option>';
    SECTIONS.forEach(sec => { navMenu.innerHTML += `<option value="secao-${sec.n}">${sec.n}. ${sec.title}</option>`; });
    navMenu.innerHTML += `<option value="secao-14">14. Registro de Não Conformidades</option><option value="secao-15">15. Conclusão da Inspeção</option>`;
    navMenu.addEventListener('change', (e) => {
      if (!e.target.value) return;
      const alvo = document.getElementById(e.target.value);
      if (alvo) window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY - 140, behavior: 'smooth' });
      e.target.value = ''; 
    });
  }

  const gaugePendente = document.querySelector('.gauge.pend');
  if (gaugePendente) {
    gaugePendente.style.cursor = 'pointer';
    gaugePendente.addEventListener('click', () => {
      const pendentes = Array.from(document.querySelectorAll('.item-row')).filter(row => row.querySelector('.opts') && !row.querySelector('.opts input:checked'));
      if (pendentes.length === 0) return alert("Parabéns! Não há itens pendentes.");
      
      const alvo = pendentes[0];
      window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY - 180, behavior: 'smooth' });
      alvo.style.backgroundColor = '#FFEBEE';
      setTimeout(() => { alvo.style.backgroundColor = 'transparent'; }, 1500);
    });
  }

  window.clearFormUI = function() {
    document.querySelectorAll('input[type=text], input[type=date], input[type=time], textarea').forEach(el => el.value = '');
    document.querySelectorAll('input[type=radio]').forEach(el => el.checked = false);
    document.querySelectorAll('.opt, .crit').forEach(el => el.classList.remove('sel'));
    document.querySelectorAll('.class-opt').forEach(el => el.classList.remove('sel-apto', 'sel-restr', 'sel-inapto'));
    
    if(document.getElementById('fipe-marca')) document.getElementById('fipe-marca').value = '';
    if(document.getElementById('fipe-modelo')) { document.getElementById('fipe-modelo').innerHTML = '<option value="">Aguardando Marca...</option>'; document.getElementById('fipe-modelo').disabled = true; }
    if(document.getElementById('fipe-ano')) { document.getElementById('fipe-ano').innerHTML = '<option value="">Aguardando Modelo...</option>'; document.getElementById('fipe-ano').disabled = true; }
    if(document.getElementById('chassi')) document.getElementById('chassi').style.border = "";
    if(document.getElementById('numMotor')) document.getElementById('numMotor').style.border = "";

    document.querySelectorAll('.photo-thumb-wrap').forEach(w => w.innerHTML = '');
    photoUrls = {}; currentSeq = null; updateGauges();
    
    if (typeof canvasProvider !== 'undefined') {
      canvasProvider.clear('respIns'); canvasProvider.clear('repCli');
    }
  }

  window.loadRecord = async function(id) {
    const state = await StorageService.getInspection(id);
    if (!state) return;
    currentRecordId = id;
    clearFormUI();
    
    Object.entries(state.text || {}).forEach(([key, val]) => { if (document.getElementById(key)) document.getElementById(key).value = val; });
    Object.entries(state.radios || {}).forEach(([name, val]) => {
      const input = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (input) { 
        input.checked = true; 
        const lbl = input.closest('label');
        if (lbl) {
          if (lbl.classList.contains('opt') || lbl.classList.contains('crit')) lbl.classList.add('sel'); 
          else if (lbl.classList.contains('class-opt')) lbl.classList.add(`sel-${val === 'apto' ? 'apto' : val === 'restricoes' ? 'restr' : 'inapto'}`);
        }
      }
    });

    if(document.getElementById('status-select')) document.getElementById('status-select').value = state.status || 'rascunho';
    
    photoUrls = {};
    Object.entries(state.photoUrls || {}).forEach(([itemId, val]) => photoUrls[itemId] = Array.isArray(val) ? val : [val]);
    Object.keys(photoUrls).forEach(itemId => {
      const cell = document.querySelector(`.photo-cell[data-photo-item="${itemId}"]`);
      if (cell && cell.querySelector('.photo-thumb-wrap')) renderPhotoThumbs(itemId, cell.querySelector('.photo-thumb-wrap'));
    });

    currentSeq = state.seq || null;
    if(document.getElementById('rec-id-label')) document.getElementById('rec-id-label').textContent = `ID ${id}`;
    if(document.getElementById('btn-delete')) document.getElementById('btn-delete').style.display = '';
    updateGauges();
  }
});
