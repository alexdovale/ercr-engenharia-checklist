/**
 * js/render.js
 * Gerenciador de Renderização da Interface e do PDF (Com Rodapé HTML Moderno via TFOOT)
 */

const UIRender = {

  /**
   * =================================================================
   * 1. INTERFACE DE TELA (APP) - Lightbox e Checklist
   * =================================================================
   */
  _injectPhotoStyles: () => {
    if (document.getElementById('ui-photo-styles')) return; 
    const style = document.createElement('style');
    style.id = 'ui-photo-styles';
    style.textContent = `
      .photo-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
      .photo-btn { border: 1px solid #ccc; background: #f5f5f5; border-radius: 6px; padding: 6px 10px; font-size: 13px; cursor: pointer; white-space: nowrap; }
      .photo-btn:hover { background: #ececec; }
      .photo-thumb-wrap .photo-thumb { position: relative; display: inline-block; }
      .photo-thumb-wrap .photo-thumb img { width: 160px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc; cursor: zoom-in; display: block; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
      .photo-thumb-wrap .photo-remove { position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; background: #b00020; color: #fff; border: 2px solid #fff; font-size: 13px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
      .photo-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: zoom-out; padding: 24px; }
      .photo-lightbox img { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
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

    if (!Array.isArray(sectionsArray)) return;

    sectionsArray.forEach(sec => {
      const sheet = document.createElement('section');
      sheet.className = 'sheet';
      sheet.id = `secao-${sec.n}`; 

      const head = document.createElement('div');
      head.className = 'sheet-head';
      head.innerHTML = `<span class="n">${sec.n}</span><h2>${sec.title || ''}</h2>`;
      sheet.appendChild(head);

      const body = document.createElement('div');
      body.className = 'sheet-body';

      if (sec.n === 13) {
        body.innerHTML = `
          <div class="field" style="margin-bottom:15px;">
            <label style="font-size:12px; font-weight:bold;">TIPO DE MOTOR</label>
            <div class="opts" style="display:flex; gap:15px; margin-top:5px;">
              <label class="opt"><input type="radio" name="tipoMotor13" value="ciclo_otto"> Ciclo Otto (Gasolina/Álcool/GNV)</label>
              <label class="opt"><input type="radio" name="tipoMotor13" value="diesel"> Diesel</label>
            </div>
          </div>
          <div class="field-grid">
            <div class="field"><label>RPM Marcha Lenta</label><input type="text" id="rpmLenta" placeholder="ex: 800"></div>
            <div class="field"><label>RPM Alta</label><input type="text" id="rpmAlta" placeholder="ex: 2500"></div>
            <div class="field"><label>Nível de Ruído (dB)</label><input type="text" id="nivelRuido" placeholder="ex: 85"></div>
            <div class="field"><label>Limite Permitido (dB)</label><input type="text" id="limiteRuido" placeholder="ex: 95"></div>
          </div>
          <h3 style="font-size:12px; margin-top:20px; margin-bottom:10px; padding-bottom:5px; border-bottom:1px solid #eee;">MEDIÇÕES DE GASES / OPACIDADE</h3>
          <div class="field-grid">
            <div class="field"><label>CO (%) - Lenta</label><input type="text" id="coLenta"></div>
            <div class="field"><label>CO (%) - Alta</label><input type="text" id="coAlta"></div>
            <div class="field"><label>HC (ppm) - Lenta</label><input type="text" id="hcLenta"></div>
            <div class="field"><label>HC (ppm) - Alta</label><input type="text" id="hcAlta"></div>
            <div class="field"><label>Fator Lambda (Alta)</label><input type="text" id="lambdaAlta"></div>
            <div class="field" style="grid-column:1/-1"><label>Opacidade (k) - Veículos Diesel</label><input type="text" id="opacidade" placeholder="Valor medido"></div>
          </div>
          <div class="field" style="margin-top:15px;">
            <label style="font-size:12px; font-weight:bold;">RESULTADO DA AVALIAÇÃO DE EMISSÕES</label>
            <div class="opts" style="display:flex; gap:15px; margin-top:5px;">
              <label class="opt c" data-val="conforme"><input type="radio" name="resultEmissoes" value="conforme"> Aprovado (Conforme)</label>
              <label class="opt nc" data-val="nao_conforme"><input type="radio" name="resultEmissoes" value="nao_conforme"> Reprovado (Não Conforme)</label>
              <label class="opt na" data-val="na"><input type="radio" name="resultEmissoes" value="na"> N/A (Isento)</label>
            </div>
          </div>
          <div class="field">
            <label>Foto do Equipamento / Ticket de Medição</label>
            <div class="photo-cell" data-photo-item="s13-ticket" style="align-items:flex-start; margin-top:5px;">
              <button type="button" class="photo-btn" title="Anexar foto">📷 Anexar Foto do Ticket</button>
              <input type="file" accept="image/*" style="display:none">
              <div class="photo-thumb-wrap"></div>
            </div>
          </div>
        `;
        sheet.appendChild(body);
        container.appendChild(sheet);
        return; 
      }

      if (Array.isArray(sec.items)) {
        sec.items.forEach((item, idx) => {
          const isObj = typeof item === 'object';
          const text = isObj ? item.text : item;
          
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
      }

      sheet.appendChild(body);
      container.appendChild(sheet);
    });

    UIRender.initPhotoDisplay();
  },

  /**
   * =================================================================
   * 2. MOTOR DE IMPRESSÃO (RODAPÉ MODERNO EM HTML/VETOR)
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

  // 🔥 RODAPÉ MODERNO EM HTML/SVG (Sem imagens estáticas) 🔥
  prFooterHTML: () => {
    const svgEngrenagem = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    const svgPhone = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
    const svgInsta = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`;

    return `
    <div class="pr-modern-footer">
      <div class="pr-mf-content">
        <div class="pr-mf-left">
          <div class="pr-mf-logo-icon">${svgEngrenagem}</div>
          <div class="pr-mf-brand-group">
            <div class="pr-mf-title">ERCR ENGENHARIA</div>
            <div class="pr-mf-subtitle">MECÂNICA</div>
          </div>
        </div>
        <div class="pr-mf-right">
          <div class="pr-mf-contact-row">
            <span><i class="pr-icon">${svgPhone}</i> (21) 96414-6270</span>
            <span><i class="pr-icon">${svgInsta}</i> ERCR.ENGENHARIA</span>
          </div>
          <div class="pr-mf-site">WWW.ERCRENGENHARIA.COM.BR</div>
          <div class="pr-mf-cnpj">CNPJ: 55.141.422/0001-79</div>
        </div>
      </div>
    </div>`;
  },

  renderSignatureOnly: (dadosAssinatura, typedNameFallback) => {
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (!dadosAssinatura) return `<div style="padding: 10px 0;"><b>${esc(typedNameFallback) || ''}</b></div>`;

    switch (dadosAssinatura.methodUsed) {
      case 'canvas': 
        return `<img class="pr-signature-img" src="${dadosAssinatura.image}" style="margin: 0 auto;">`;
      case 'icp':
        return `<div style="font-size: 8pt; font-family: monospace; padding: 5px 0;">Assinado Gov.br: ${dadosAssinatura.metadata?.dadosCertificado?.nome || 'Validado'}</div>`;
      case 'remote':
        return `<div style="font-size: 8pt; font-family: monospace; padding: 5px 0; color: #555;">Assinatura Remota: ${dadosAssinatura.metadata?.status || 'Concluída'}</div>`;
      default:
        return `<div style="padding: 10px 0;"><b>${esc(typedNameFallback) || ''}</b></div>`;
    }
  },

  buildPrintReport: (sectionsArray, signatureData, currentSeq, logoB64, cnpj) => {
    const container = document.getElementById('print-report');
    if (!container) return;
    
    const v = id => {
      const el = document.getElementById(id);
      if (!el) return '';
      return typeof el.value !== 'undefined' ? String(el.value).trim() : String(el.textContent || '').trim();
    };
    const radioVal = name => {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : null;
    };
    const photoSrc = itemId => {
      const el = document.querySelector(`[data-photo-item="${itemId}"] .photo-thumb img`);
      return el ? el.src : null;
    };
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const checkCircle = (cond) => cond ? '<span class="pr-circle filled"></span>' : '<span class="pr-circle"></span>';

    const logoOficialUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';

    // Início da Estrutura baseada em tabela para repetição via TFOOT em qualquer mobile
    let html = `
      <table style="width: 100%; border: none; border-collapse: collapse;">
        <thead>
          <tr><td style="border: none; padding: 0;"></td></tr>
        </thead>
        <tbody>
          <tr><td style="border: none; padding: 0;">
            <div style="width: 100%;">
    `;

    html += `
      <div class="pr-header-block">
        <img src="${logoOficialUrl}" class="pr-top-logo" alt="ERCR Engenharia">
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

    if (Array.isArray(sectionsArray)) {
      sectionsArray.forEach(sec => {
        if (sec.n >= 2 && sec.n <= 12) {
          html += `<div class="pr-section-title">${sec.n}. ${esc((sec.title || '').toUpperCase())}</div>
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
          
          if (Array.isArray(sec.items)) {
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
          }
          html += `</tbody></table>`;
        }
      });
    }

    const sec13 = sectionsArray.find(s => s.n === 13);
    if (sec13) {
      const tipoMot = radioVal('tipoMotor13');
      const resEmissoes = radioVal('resultEmissoes');
      const ticketPhoto = photoSrc('s13-ticket');

      html += `<div class="pr-section-title">13. ${esc((sec13.title || '').toUpperCase())}</div>
               
               <div class="pr-field-line" style="margin-bottom:8px;">
                 <strong>Tipo de Motor:</strong> 
                 ${checkCircle(tipoMot === 'ciclo_otto')} Ciclo Otto &nbsp;&nbsp;&nbsp; 
                 ${checkCircle(tipoMot === 'diesel')} Diesel
               </div>
               
               <table class="pr-table" style="margin-bottom:8px;">
                 <thead><tr><th>Medições</th><th>Valores</th></tr></thead>
                 <tbody>
                   <tr><td>RPM Marcha Lenta</td><td>${esc(v('rpmLenta'))}</td></tr>
                   <tr><td>RPM Alta</td><td>${esc(v('rpmAlta'))}</td></tr>
                   <tr><td>Nível de Ruído (dB) / Limite Permitido</td><td>Medido: ${esc(v('nivelRuido'))} | Limite: ${esc(v('limiteRuido'))}</td></tr>
                   <tr><td>CO (%) - Lenta / Alta</td><td>Lenta: ${esc(v('coLenta'))} | Alta: ${esc(v('coAlta'))}</td></tr>
                   <tr><td>HC (ppm) - Lenta / Alta</td><td>Lenta: ${esc(v('hcLenta'))} | Alta: ${esc(v('hcAlta'))}</td></tr>
                   <tr><td>Fator Lambda (Alta)</td><td>${esc(v('lambdaAlta'))}</td></tr>
                   <tr><td>Opacidade (k) - Diesel</td><td>${esc(v('opacidade'))}</td></tr>
                 </tbody>
               </table>
               
               <div class="pr-field-line" style="margin-bottom:8px;">
                 <strong>Resultado da Avaliação de Emissões:</strong> 
                 ${checkCircle(resEmissoes === 'conforme')} Aprovado &nbsp;&nbsp; 
                 ${checkCircle(resEmissoes === 'nao_conforme')} Reprovado &nbsp;&nbsp; 
                 ${checkCircle(resEmissoes === 'na')} N/A (Isento)
               </div>
               
               ${ticketPhoto ? `
                 <div class="pr-field-line"><strong>Anexo (Ticket de Medição / Foto):</strong></div>
                 <div class="pr-photo-block"><img class="pr-photo-thumb" src="${ticketPhoto}" style="max-width:300px;"></div>
               ` : ''}`;
    }

    html += `<div class="pr-section-title">14. REGISTRO DE NÃO CONFORMIDADES</div>`;
    
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
    
    if (!hasNC) html += `<div class="pr-field-line" style="margin-bottom: 20px;">Nenhuma Não Conformidade registrada.</div>`;

    const classFinal = radioVal('classificacao');
    html += `<div class="pr-section-title">15. CONCLUSÃO DA INSPEÇÃO</div>
             <div class="pr-nc-block" style="border-left-color: #111;">
                <div style="font-weight:700; margin-bottom:8px;">CLASSIFICAÇÃO FINAL</div>
                <div class="pr-field-line">${checkCircle(classFinal === 'apto')} APTO PARA OPERAÇÃO</div>
                <div class="pr-field-line">${checkCircle(classFinal === 'restricoes')} APTO PARA OPERAÇÃO COM RESTRIÇÕES</div>
                <div class="pr-field-line">${checkCircle(classFinal === 'inapto')} INAPTO PARA OPERAÇÃO</div>
             </div>
             <div class="pr-field-line" style="margin-top:10px; margin-bottom: 30px;">
               <strong>Considerações Técnicas:</strong> ${esc(v('consideracoes'))}
             </div>`;
    
    const canvasInspetor = document.getElementById('sig-respIns');
    if (canvasInspetor) {
      const blank = document.createElement('canvas');
      blank.width = canvasInspetor.width;
      blank.height = canvasInspetor.height;
      if (canvasInspetor.toDataURL() !== blank.toDataURL()) {
        if (!signatureData) signatureData = {};
        if (!signatureData.respIns) signatureData.respIns = {};
        signatureData.respIns.methodUsed = 'canvas';
        signatureData.respIns.image = canvasInspetor.toDataURL('image/png');
      }
    }

    const canvasCliente = document.getElementById('sig-repCli');
    if (canvasCliente) {
      const blank = document.createElement('canvas');
      blank.width = canvasCliente.width;
      blank.height = canvasCliente.height;
      if (canvasCliente.toDataURL() !== blank.toDataURL()) {
        if (!signatureData) signatureData = {};
        if (!signatureData.repCli) signatureData.repCli = {};
        signatureData.repCli.methodUsed = 'canvas';
        signatureData.repCli.image = canvasCliente.toDataURL('image/png');
      }
    }

    html += `<div class="pr-section-title">ASSINATURAS</div>
             <div class="pr-field-pair" style="border:none; margin-top:20px; align-items: flex-end;">
               <div style="text-align:center; width: 48%;">
                 ${UIRender.renderSignatureOnly(signatureData?.respIns, v('respInsAssinatura'))}
                 <hr style="border:0; border-bottom:1px solid #000; width:100%; margin:5px auto;">
                 <strong>RESPONSÁVEL PELA INSPEÇÃO</strong><br>
                 Nome: ${esc(v('respInsNome'))}<br>
                 CREA/Registro: ${esc(v('respInsCrea'))}<br>
                 Data: ${esc(UIRender.fmtDateBR(v('respInsData')))}
               </div>
               <div style="text-align:center; width: 48%;">
                 ${UIRender.renderSignatureOnly(signatureData?.repCli, v('repCliAssinatura'))}
                 <hr style="border:0; border-bottom:1px solid #000; width:100%; margin:5px auto;">
                 <strong>REPRESENTANTE DO CLIENTE</strong><br>
                 Nome: ${esc(v('repCliNome'))}<br>
                 Cargo: ${esc(v('repCliCargo'))}<br>
                 Data: ${esc(UIRender.fmtDateBR(v('repCliData')))}
               </div>
             </div>`;
    
    // Fechamento da tabela principal e inclusão do rodapé no TFOOT
    html += `
            </div>
          </td></tr>
        </tbody>
        <tfoot>
          <tr><td style="border: none; padding: 0;">
            ${UIRender.prFooterHTML()}
          </td></tr>
        </tfoot>
      </table>
    `;

    container.innerHTML = html;
  },

  buildReceiptReport: (currentSeq, logoB64, cnpj) => {
    const v = id => {
      const el = document.getElementById(id);
      if (!el) return '';
      return typeof el.value !== 'undefined' ? String(el.value).trim() : String(el.textContent || '').trim();
    };
    
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const pagador = v('recPagador') || v('respVeic') || v('empresa');
    const valor = v('valorServico');
    const forma = v('formaPagamento');
    const nf = v('nfNumero');
    const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';

    let html = '<div style="width: 100%;">';
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
    html += `</div>`;

    html += UIRender.prFooterHTML();

    const container = document.getElementById('print-report');
    if (container) container.innerHTML = html;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', UIRender.initPhotoDisplay);
} else {
  UIRender.initPhotoDisplay();
}
