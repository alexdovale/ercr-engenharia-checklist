/**
 * js/render.js
 * Gerenciador de Renderização da Interface e do PDF (Impressão Padrão ERCR)
 */

const UIRender = {

  /**
   * =================================================================
   * 1. INTERFACE DE TELA (APP) - Lightbox e Checklist
   * =================================================================
   */
  _injectPhotoStyles: () => {
    if (document.getElementById('ui-photo-styles')) return; // já injetado
    const style = document.createElement('style');
    style.id = 'ui-photo-styles';
    style.textContent = `
      .photo-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }

      .photo-btn {
        border: 1px solid #ccc;
        background: #f5f5f5;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
      }
      .photo-btn:hover { background: #ececec; }

      /* Miniatura no FORMULÁRIO (tela) - tamanho bom para leitura */
      .photo-thumb-wrap .photo-thumb { position: relative; display: inline-block; }
      .photo-thumb-wrap .photo-thumb img {
        width: 160px;
        height: 120px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #ccc;
        cursor: zoom-in;
        display: block;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      }
      .photo-thumb-wrap .photo-remove {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #b00020;
        color: #fff;
        border: 2px solid #fff;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }

      /* Lightbox para ver a foto em tamanho grande */
      .photo-lightbox {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        cursor: zoom-out;
        padding: 24px;
      }
      .photo-lightbox img {
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.5);
      }
    `;
    document.head.appendChild(style);
  },

  _openLightbox: (src) => {
    const overlay = document.createElement('div');
    overlay.className = 'photo-lightbox';
    overlay.innerHTML = `<img src="${src}" alt="Foto ampliada">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  },

  initPhotoDisplay: () => {
    UIRender._injectPhotoStyles();
    if (document.body && document.body.dataset.photoDisplayBound) return;

    document.addEventListener('click', (e) => {
      if (e.target.closest('.photo-remove')) return;
      const thumbImg = e.target.closest('.photo-thumb-wrap img');
      if (thumbImg) UIRender._openLightbox(thumbImg.src);
    });

    if (document.body) document.body.dataset.photoDisplayBound = 'true';
  },

  renderChecklist: (containerId, sectionsArray) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    UIRender._injectPhotoStyles();
    container.innerHTML = ''; 

    sectionsArray.forEach(sec => {
      const sheet = document.createElement('section');
      sheet.className = 'sheet';
      sheet.id = `secao-${sec.n}`; 

      const head = document.createElement('div');
      head.className = 'sheet-head';
      head.innerHTML = `<span class="n">${sec.n}</span><h2>${sec.title}</h2>`;
      sheet.appendChild(head);

      const body = document.createElement('div');
      body.className = 'sheet-body';

      sec.items.forEach((item, idx) => {
        const isObj = typeof item === 'object';
        const text = isObj ? item.text : item;
        
        // Trava de segurança para itens especiais
        const opts = (isObj && item.opts) ? item.opts : [['conforme','Conf.'],['nao_conforme','N.Conf.'],['na','N/A']];
        const itemId = `s${sec.n}-i${idx}`;

        const row = document.createElement('div');
        row.className = 'item-row';
        const numLabel = `${sec.n}.${idx+1}`;
        
        row.innerHTML = `
          <div class="item-text"><span class="item-num">${numLabel}</span>${text}</div>
          <div class="opts" data-item="${itemId}">
            ${opts.map(([val, label]) => {
              const cls = (val === 'conforme' || val === 'realizado') ? 'c' :
                          (val === 'nao_conforme' || val === 'nao_realizado') ? 'nc' : 'na';
              return `<label class="opt ${cls}" data-val="${val}"><input type="radio" name="${itemId}" value="${val}">${label}</label>`;
            }).join('')}
          </div>
          <div class="photo-cell" data-photo-item="${itemId}">
            <button type="button" class="photo-btn" title="Anexar foto">📷 Foto</button>
            <input type="file" accept="image/*" style="display:none">
            <div class="photo-thumb-wrap"></div>
          </div>
        `;
        body.appendChild(row);
      });

      sheet.appendChild(body);
      container.appendChild(sheet);
    });

    UIRender.initPhotoDisplay();
  },

  /**
   * =================================================================
   * 2. MOTOR DE IMPRESSÃO (PDF PADRÃO ERCR ENGENHARIA)
   * =================================================================
   */
  fmtDateBR: (iso) => {
    if(!iso) return '';
    const parts = iso.split('-');
    if(parts.length!==3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  formatSeq: (seq) => {
    if(!seq) return '';
    return `Nº ${String(seq.number).padStart(4,'0')}/${seq.year}`;
  },

  // NOVO RODAPÉ USANDO A IMAGEM OFICIAL DIRETAMENTE
  prFooterHTML: () => {
    const rodapeUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/rodap%C3%A9.png';
    return `
    <div class="pr-footer">
      <img src="${rodapeUrl}" alt="Rodapé ERCR">
    </div>`;
  },

  renderSignatureOnly: (dadosAssinatura, typedNameFallback) => {
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (!dadosAssinatura) return `<div style="padding: 10px 0;"><b>${esc(typedNameFallback) || ''}</b></div>`;

    switch (dadosAssinatura.methodUsed) {
      case 'canvas': 
        return `<img class="pr-signature-img" src="${dadosAssinatura.image}" style="margin: 0 auto;">`;
      case 'icp':
        return `<div style="font-size: 8pt; font-family: monospace; padding: 5px 0;">Assinado Gov.br: ${dadosAssinatura.metadata.dadosCertificado.nome}</div>`;
      case 'remote':
        return `<div style="font-size: 8pt; font-family: monospace; padding: 5px 0; color: #555;">Assinatura Remota: ${dadosAssinatura.metadata.status}</div>`;
      default:
        return `<div style="padding: 10px 0;"><b>${esc(typedNameFallback) || ''}</b></div>`;
    }
  },

  buildPrintReport: (sectionsArray, signatureData, currentSeq, logoB64, cnpj) => {
    const container = document.getElementById('print-report');
    if (!container) return;
    
    const v = id => document.getElementById(id)?.value.trim() || '';
    const radioVal = name => document.querySelector(`input[name="${name}"]:checked`)?.value || null;
    const photoSrc = itemId => document.querySelector(`[data-photo-item="${itemId}"] .photo-thumb img`)?.src || null;
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const checkCircle = (cond) => cond ? '<span class="pr-circle filled"></span>' : '<span class="pr-circle"></span>';

    let html = '<div class="pr-page">';

    html += `
      <div class="pr-header-block">
        <h1 class="pr-title">CHECKLIST DE INSPEÇÃO E PERÍCIA TÉCNICA VEICULAR</h1>
        ${currentSeq ? `<div class="pr-seq">${UIRender.formatSeq(currentSeq)}</div>` : ''}
      </div>
    `;

    html += `<div class="pr-section-title">IDENTIFICAÇÃO DA INSPEÇÃO</div>
             <div class="pr-field-pair">
               <div><strong>Empresa Responsável:</strong> ${esc(v('empresa'))}</div>
               <div><strong>CNPJ:</strong> ${esc(v('cnpj'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>Data da Inspeção:</strong> ${esc(UIRender.fmtDateBR(v('dataInsp')))}</div>
               <div><strong>Horário:</strong> ${esc(v('horario'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>Local da Inspeção:</strong> ${esc(v('local'))}</div>
               <div><strong>Município/UF:</strong> ${esc(v('municipio'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>Responsável pelo Veículo:</strong> ${esc(v('respVeic'))}</div>
               <div><strong>Cargo/Função:</strong> ${esc(v('cargoFunc'))}</div>
             </div>
             <div class="pr-field-line"><strong>Telefone:</strong> ${esc(v('telefone'))}</div>`;

    html += `<div class="pr-section-title">1. IDENTIFICAÇÃO DO VEÍCULO</div>
             <div class="pr-field-pair">
               <div><strong>1.1 Placa:</strong> ${esc(v('placa'))}</div>
               <div><strong>1.2 Marca/Fabricante:</strong> ${esc(v('fipe-marca') || v('fipe-marca-text'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>1.3 Modelo:</strong> ${esc(v('fipe-modelo') || v('fipe-modelo-text'))}</div>
               <div><strong>1.4 Ano de Fabricação:</strong> ${esc(v('anoFab'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>1.5 Ano Modelo:</strong> ${esc(v('fipe-ano') || v('fipe-ano-text'))}</div>
               <div><strong>1.6 Número do Chassi:</strong> ${esc(v('chassi'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>1.7 RENAVAM:</strong> ${esc(v('renavam'))}</div>
               <div><strong>1.8 Número do Motor:</strong> ${esc(v('numMotor'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>1.9 Hodômetro (km):</strong> ${esc(v('km'))}</div>
               <div><strong>1.10 Cor:</strong> ${esc(v('cor'))}</div>
             </div>
             <div class="pr-field-pair">
               <div><strong>1.11 Tipo de Combustível:</strong> ${esc(v('combustivel'))}</div>
               <div><strong>1.12 Implemento/Carroceria:</strong> ${esc(v('implemento'))}</div>
             </div>`;

    sectionsArray.forEach(sec => {
      if (sec.n >= 2 && sec.n <= 13) {
        html += `<div class="pr-section-title">${sec.n}. ${esc(sec.title.toUpperCase())}</div>
                 <table class="pr-table">
                   <thead>
                     <tr>
                       <th class="pr-item-cell">Item</th>
                       <th class="pr-circle-cell">Conforme</th>
                       <th class="pr-circle-cell">Não Conforme</th>
                       <th class="pr-circle-cell">N/A</th>
                     </tr>
                   </thead>
                   <tbody>`;
        
        sec.items.forEach((item, idx) => {
          const itemId = `s${sec.n}-i${idx}`;
          const val = radioVal(itemId);
          const photo = photoSrc(itemId);
          
          html += `<tr>
            <td>
              <strong>${sec.n}.${idx+1}</strong> - ${typeof item === 'object' ? esc(item.text) : esc(item)}
              ${photo ? `<div class="pr-photo-block"><img class="pr-photo-thumb" src="${photo}"></div>` : ''}
            </td>
            <td class="pr-circle-cell">${checkCircle(val === 'conforme' || val === 'realizado')}</td>
            <td class="pr-circle-cell">${checkCircle(val === 'nao_conforme' || val === 'nao_realizado')}</td>
            <td class="pr-circle-cell">${checkCircle(val === 'na_aplicavel' || val === 'na')}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
      }
    });

    html += UIRender.prFooterHTML();
    html += `</div>`; 

    // Página de Não Conformidades
    html += `<div class="pr-page">
              <div class="pr-section-title">14. REGISTRO DE NÃO CONFORMIDADES</div>`;
    
    let hasNC = false;
    for(let i=1; i<=3; i++){
      const idNc = v(`nc${i}-item`);
      const desc = v(`nc${i}-desc`);
      const rec = v(`nc${i}-rec`);
      const prazo = v(`nc${i}-prazo`);
      const crit = radioVal(`nc${i}-crit`);
      const photo = photoSrc(`nc${i}`);

      if (idNc || desc) {
        hasNC = true;
        html += `
          <div class="pr-nc-block">
            <h4>NC-0${i}</h4>
            <div class="pr-field-pair">
              <div><strong>Item do Checklist:</strong> ${esc(idNc)}</div>
              <div><strong>Prazo:</strong> ${esc(UIRender.fmtDateBR(prazo))}</div>
            </div>
            <div class="pr-field-line"><strong>Descrição da Não Conformidade:</strong> ${esc(desc)}</div>
            <div class="pr-field-line"><strong>Recomendação Técnica:</strong> ${esc(rec)}</div>
            <div class="pr-crit-row">
              <strong>Criticidade:</strong> 
              <span>${checkCircle(crit === 'baixa')} Baixa</span>
              <span>${checkCircle(crit === 'media')} Média</span>
              <span>${checkCircle(crit === 'alta')} Alta</span>
            </div>
            ${photo ? `<div class="pr-photo-block"><img class="pr-photo-thumb" src="${photo}"></div>` : ''}
          </div>
        `;
      }
    }
    if (!hasNC) html += `<div class="pr-field-line">Nenhuma Não Conformidade registrada.</div>`;

    const classFinal = radioVal('classificacao');
    html += `<div class="pr-section-title">15. CONCLUSÃO DA INSPEÇÃO</div>
             <div class="pr-nc-block" style="border-left-color: #111;">
                <div style="font-weight:700; margin-bottom:8px;">CLASSIFICAÇÃO FINAL</div>
                <div class="pr-field-line">${checkCircle(classFinal === 'apto')} APTO PARA OPERAÇÃO</div>
                <div class="pr-field-line">${checkCircle(classFinal === 'restricoes')} APTO PARA OPERAÇÃO COM RESTRIÇÕES</div>
                <div class="pr-field-line">${checkCircle(classFinal === 'inapto')} INAPTO PARA OPERAÇÃO</div>
             </div>
             <div class="pr-field-line" style="margin-top:10px;">
               <strong>Considerações Técnicas:</strong> ${esc(v('consideracoes'))}
             </div>`;

    // Assinaturas Lado a Lado
    html += `<div class="pr-section-title">ASSINATURAS</div>
             <div class="pr-field-pair" style="border:none; margin-top:20px;">
               <div style="text-align:center;">
                 ${UIRender.renderSignatureOnly(signatureData?.respIns, v('respInsAssinatura'))}
                 <hr style="border:0; border-bottom:1px solid #000; width:80%; margin:5px auto;">
                 <strong>RESPONSÁVEL PELA INSPEÇÃO</strong><br>
                 Nome: ${esc(v('respInsNome'))}<br>
                 CREA/Registro: ${esc(v('respInsCrea'))}<br>
                 Data: ${esc(UIRender.fmtDateBR(v('respInsData')))}
               </div>
               <div style="text-align:center;">
                 ${UIRender.renderSignatureOnly(signatureData?.repCli, v('repCliAssinatura'))}
                 <hr style="border:0; border-bottom:1px solid #000; width:80%; margin:5px auto;">
                 <strong>REPRESENTANTE DO CLIENTE</strong><br>
                 Nome: ${esc(v('repCliNome'))}<br>
                 Cargo: ${esc(v('repCliCargo'))}<br>
                 Data: ${esc(UIRender.fmtDateBR(v('repCliData')))}
               </div>
             </div>`;
    
    html += UIRender.prFooterHTML();
    html += `</div>`; 

    container.innerHTML = html;
  },

  buildReceiptReport: (currentSeq, logoB64, cnpj) => {
    const v = id => document.getElementById(id)?.value.trim() || '';
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const pagador = v('recPagador') || v('respVeic') || v('empresa');
    const valor = v('valorServico');
    const forma = v('formaPagamento');
    const nf = v('nfNumero');
    const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';

    let html = '<div class="pr-page">';
    html += `<div style="text-align: center; margin-bottom: 25px; margin-top: 10px;">
               <img src="${logoUrl}" style="max-width: 220px; height: auto;" alt="ERCR Engenharia">
             </div>`;
    html += `<div class="pr-title">RECIBO DE PRESTAÇÃO DE SERVIÇO</div>`;
    if(currentSeq) html += `<div class="pr-field-line" style="color:#555; text-align:center;">Referente à inspeção ${UIRender.formatSeq(currentSeq)}</div>`;

    html += `<div class="pr-field-line" style="margin-top:18px;">Recebemos de: <b>${esc(pagador)||'____________________________________'}</b></div>`;
    html += `<div class="pr-field-line">a importância de: <b>${esc(valor)||'____________________________________'}</b></div>`;
    html += `<div class="pr-field-line">Referente a: <b>Serviço de inspeção e perícia técnica veicular${v('placa')?` — veículo placa ${esc(v('placa'))}`:''}</b></div>`;
    if(forma) html += `<div class="pr-field-line">Forma de pagamento: <b>${esc(forma)}</b></div>`;
    if(nf) html += `<div class="pr-field-line">Referente à Nota Fiscal nº: <b>${esc(nf)}</b></div>`;
    html += `<div class="pr-field-line">Data: <b>${esc(UIRender.fmtDateBR(v('dataInsp')) || new Date().toLocaleDateString('pt-BR'))}</b></div>`;

    html += `<div class="pr-field-line" style="margin-top:56px;">
      _________________________________________<br>
      ERCR ENGENHARIA MECÂNICA<br>
      CNPJ ${cnpj}
    </div>`;

    html += `<p style="font-size:8.5px;color:#777;margin-top:20px;">Este recibo é um comprovante informal e não substitui a Nota Fiscal.</p>`;
    html += UIRender.prFooterHTML();
    html += '</div>';

    const container = document.getElementById('print-report');
    if (container) container.innerHTML = html;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', UIRender.initPhotoDisplay);
} else {
  UIRender.initPhotoDisplay();
}
