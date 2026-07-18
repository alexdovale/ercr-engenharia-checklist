/**
 * js/ui/render.js
 * Gerenciador de Renderização da Interface e do PDF (Impressão)
 */

const UIRender = {
  
  /**
   * Constrói as seções do checklist no formulário HTML
   */
  renderChecklist: (containerId, sectionsArray) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; // Limpa antes de renderizar

        sectionsArray.forEach(sec => {
      const sheet = document.createElement('section');
      sheet.className = 'sheet';
      sheet.id = `secao-${sec.n}`; // 🔥 ÂNCORA PARA O MENU RÁPIDO
      
      const head = document.createElement('div');
      head.className = 'sheet-head';
      head.innerHTML = `<span class="n">${sec.n}</span><h2>${sec.title}</h2>`;
      sheet.appendChild(head);
      
      const body = document.createElement('div');
      body.className = 'sheet-body';
      
      sec.items.forEach((item, idx) => {
        const isObj = typeof item === 'object';
        const text = isObj ? item.text : item;
        const opts = isObj ? item.opts : [['conforme','Conf.'],['nao_conforme','N.Conf.'],['na','N/A']];
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
            <button type="button" class="photo-btn" title="Anexar foto">📷</button>
            <!-- 🔥 TIREI O CAPTURE="ENVIRONMENT" PARA PERMITIR GALERIA E CÂMERA -->
            <input type="file" accept="image/*" style="display:none">
            <div class="photo-thumb-wrap"></div>
          </div>
        `;
        body.appendChild(row);
      });
      
      sheet.appendChild(body);
      container.appendChild(sheet);
    });

      
      sheet.appendChild(body);
      container.appendChild(sheet);
    });
  },

  /**
   * Monta o bloco visual da assinatura de acordo com o método escolhido para o PDF
   */
  renderizarBlocoAssinatura: (dadosAssinatura, typedNameFallback) => {
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    
    if (!dadosAssinatura) {
      return `<div class="pr-field-line">Assinatura: <b>${esc(typedNameFallback) || '____________________________________'}</b></div>`;
    }

    switch (dadosAssinatura.methodUsed) {
      case 'canvas':
        return `<div class="pr-field-line">Assinatura:<br><img class="pr-signature-img" src="${dadosAssinatura.image}"></div>`;

      case 'icp':
        const meta = dadosAssinatura.metadata.dadosCertificado;
        return `
          <div style="border: 1px solid #111; padding: 10px; font-size: 9px; font-family: monospace; margin-top: 4px;">
            <strong>ASSINADO DIGITALMENTE (ICP-Brasil/Gov.br)</strong><br>
            Assinante: ${meta.nome} (CPF: ${meta.cpf})<br>
            Emissor: ${meta.emissor}<br>
            Hash da Transação: ${dadosAssinatura.metadata.documentHash}<br>
            Data: ${new Date(dadosAssinatura.metadata.timestamp).toLocaleString('pt-BR')}
          </div>
        `;

      case 'remote':
        const rMeta = dadosAssinatura.metadata;
        const status = rMeta.status === 'pendente_assinatura' ? 'PENDENTE DE ASSINATURA PELO CLIENTE' : 'ASSINATURA REMOTA CONCLUÍDA';
        return `
          <div style="border: 1px dashed #666; padding: 10px; font-size: 9px; font-family: monospace; color: #555; margin-top: 4px;">
            <strong>${status}</strong><br>
            Enviado para: ${rMeta.contatoDestino}<br>
            ID do Envelope: ${rMeta.envelopeId}<br>
            Data de Envio: ${new Date(rMeta.timestampEnvio).toLocaleString('pt-BR')}<br>
            <em>A validade deste documento depende da conclusão da assinatura via plataforma externa.</em>
          </div>
        `;
        
      default:
        return `<div class="pr-field-line">Assinatura: <b>${esc(typedNameFallback) || '____________________________________'}</b></div>`;
    }
  },

  /**
   * Auxiliares de formatação
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

  prFooterHTML: (logoB64, cnpj) => {
    // Utilizando o link RAW direto do GitHub conforme solicitado
    const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';
    return `
    <div class="pr-footer">
      <svg class="pr-wave-svg" viewBox="0 0 1000 140" preserveAspectRatio="none">
        <path d="M0,55 C230,130 420,-10 650,45 C820,85 900,60 1000,20 L1000,140 L0,140 Z" fill="#000"/>
      </svg>
      <div class="pr-footer-content">
        <div class="pr-footer-brand">
          <img src="${logoUrl}" alt="ERCR">
          <div class="txt">
            <div class="name">ERCR ENGENHARIA</div>
            <div class="sub">MECÂNICA · CNPJ ${cnpj}</div>
          </div>
        </div>
        <div class="pr-footer-right">
          (21) 96414-6270 &nbsp;·&nbsp; ERCR.ENGENHARIA<br>
          WWW.ERCRENGENHARIA.COM.BR
        </div>
      </div>
    </div>`;
  },

  /**
   * Gera todo o HTML para impressão do Relatório de Inspeção (PDF)
   */
  buildPrintReport: (sectionsArray, signatureData, currentSeq, logoB64, cnpj) => {
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const radioVal = name => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : null; };
    const photoSrc = itemId => { const img = document.querySelector(`[data-photo-item="${itemId}"] .photo-thumb img`); return img ? img.src : null; };
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';

    let html = '<div class="pr-page">';
    
    // 🔥 LOGO CENTRALIZADA NO TOPO DA PRIMEIRA PÁGINA
    html += `<div style="text-align: center; margin-bottom: 25px; margin-top: 10px;">
      <img src="${logoUrl}" style="max-width: 220px; height: auto;" alt="ERCR Engenharia">
    </div>`;

    // Cabeçalho do Relatório[span_0](start_span)[span_0](end_span)
    html += `<div style="position:relative;">
      <div class="pr-title">CHECKLIST DE INSPEÇÃO E PERÍCIA TÉCNICA VEICULAR</div>
      ${currentSeq ? `<div class="pr-seq">${UIRender.formatSeq(currentSeq)}</div>` : ''}
    </div>`;

    // Identificação da Inspeção[span_1](start_span)[span_1](end_span)
    html += `<div class="pr-section-title">IDENTIFICAÇÃO DA INSPEÇÃO</div>`;
    html += `<div class="pr-field-line">Empresa Responsável: <b>${esc(v('empresa'))}</b></div>`;
    html += `<div class="pr-field-pair">
      <div>CNPJ: <b>${esc(v('cnpj'))}</b></div>
      <div>Data da Inspeção: <b>${esc(UIRender.fmtDateBR(v('dataInsp')))}</b></div>
      <div>Horário: <b>${esc(v('horario'))}</b></div>
    </div>`;
    html += `<div class="pr-field-line">Local da Inspeção: <b>${esc(v('local'))}</b></div>`;
    html += `<div class="pr-field-line">Município/UF: <b>${esc(v('municipio'))}</b></div>`;
    html += `<div class="pr-field-pair">
      <div>Responsável pelo Veículo: <b>${esc(v('respVeic'))}</b></div>
      <div>Cargo/Função: <b>${esc(v('cargoFunc'))}</b></div>
    </div>`;
    html += `<div class="pr-field-line">Telefone: <b>${esc(v('telefone'))}</b></div>`;

    // Identificação do Veículo
    html += `<div class="pr-section-title">1. IDENTIFICAÇÃO DO VEÍCULO</div>`;
    [
      ['1.1 Placa', v('placa'), '1.2 Marca/Fabricante', v('marca')],
      ['1.3 Modelo', v('modelo'), '1.4 Ano de Fabricação', v('anoFab')],
      ['1.5 Ano Modelo', v('anoModelo'), '1.6 Número do Chassi', v('chassi')],
      ['1.7 RENAVAM', v('renavam'), '1.8 Número do Motor', v('numMotor')],
      ['1.9 Hodômetro (km)', v('hodometro'), '1.10 Cor', v('cor')],
    ].forEach(([l1,val1,l2,val2])=>{
      html += `<div class="pr-field-pair"><div>${l1}: <b>${esc(val1)}</b></div><div>${l2}: <b>${esc(val2)}</b></div></div>`;
    });
    html += `<div class="pr-field-line">1.11 Tipo de Combustível: <b>${esc(v('combustivel'))}</b></div>`;
    html += `<div class="pr-field-line">1.12 Implemento/Carroceria (quando aplicável): <b>${esc(v('implemento'))}</b></div>`;

    // Loop pelas Seções Dinâmicas
    sectionsArray.forEach(sec=>{
      html += `<div class="pr-section-title">${sec.n}. ${esc(sec.title.toUpperCase())}</div>`;
      html += `<table class="pr-table"><thead><tr><th>Item</th><th>Conforme</th><th>Não Conforme</th><th>N/A</th></tr></thead><tbody>`;
      
      sec.items.forEach((item,idx)=>{
        if(typeof item === 'object') return;
        const itemId = `s${sec.n}-i${idx}`;
        const val = radioVal(itemId);
        const photo = photoSrc(itemId);
        html += `<tr class="pr-row">
          <td class="pr-item-cell">${sec.n}.${idx+1} ${esc(item)}${photo?`<img class="pr-photo-thumb" src="${photo}">`:''}</td>
          <td class="pr-circle-cell"><span class="pr-circle ${val==='conforme'?'filled':''}"></span></td>
          <td class="pr-circle-cell"><span class="pr-circle ${val==='nao_conforme'?'filled':''}"></span></td>
          <td class="pr-circle-cell"><span class="pr-circle ${val==='na'?'filled':''}"></span></td>
        </tr>`;
      });
      html += `</tbody></table>`;
      
      sec.items.forEach((item,idx)=>{
        if(typeof item !== 'object') return;
        const itemId = `s${sec.n}-i${idx}`;
        const val = radioVal(itemId);
        const photo = photoSrc(itemId);
        html += `<div class="pr-special-row">
          <div>${sec.n}.${idx+1} ${esc(item.text)}${photo?`<img class="pr-photo-thumb" src="${photo}">`:''}</div>
          <div class="pr-special-opts">
            ${item.opts.map(([ov,ol])=>`<span><span class="pr-circle ${val===ov?'filled':''}"></span>${esc(ol)}</span>`).join('')}
          </div>
        </div>`;
      });
    });

    // Seção de Não Conformidades
    html += `<div class="pr-section-title">14. REGISTRO DE NÃO CONFORMIDADES</div>`;
    for(let i=1;i<=3;i++){
      const crit = radioVal(`nc${i}-crit`);
      const photo = photoSrc(`nc${i}`);
      html += `<div class="pr-nc-block">
        <h4>NC-0${i}</h4>
        <div class="pr-field-line">Item do Checklist: <b>${esc(v('nc'+i+'-item'))}</b></div>
        <div class="pr-field-line">Descrição da Não Conformidade: <b>${esc(v('nc'+i+'-desc'))}</b></div>
        ${photo?`<img class="pr-photo-thumb" src="${photo}">`:''}
        <div class="pr-crit-row">Criticidade:
          <span><span class="pr-checkbox ${crit==='baixa'?'checked':''}"></span>Baixa</span>
          <span><span class="pr-checkbox ${crit==='media'?'checked':''}"></span>Média</span>
          <span><span class="pr-checkbox ${crit==='alta'?'checked':''}"></span>Alta</span>
        </div>
        <div class="pr-field-line" style="margin-top:4px;">Recomendação Técnica: <b>${esc(v('nc'+i+'-rec'))}</b></div>
        <div class="pr-field-line">Prazo: <b>${esc(UIRender.fmtDateBR(v('nc'+i+'-prazo')))}</b></div>
      </div>`;
    }

    // Conclusão
    const classificacao = radioVal('classificacao');
    html += `<div class="pr-section-title">15. CONCLUSÃO DA INSPEÇÃO</div>`;
    html += `<div class="pr-field-line" style="font-weight:700;">Classificação Final</div>`;
    [['apto','APTO PARA OPERAÇÃO'],['restricoes','APTO PARA OPERAÇÃO COM RESTRIÇÕES'],['inapto','INAPTO PARA OPERAÇÃO']].forEach(([cv,cl])=>{
      html += `<div class="pr-class-opt"><span class="pr-checkbox ${classificacao===cv?'checked':''}"></span> ${cl}</div>`;
    });
    html += `<div class="pr-field-line" style="margin-top:8px;font-weight:700;">Considerações Técnicas</div>`;
    html += `<div class="pr-field-line" style="white-space:pre-wrap;">${esc(v('consideracoes'))}</div>`;

    // Assinaturas
    html += `<div class="pr-field-line" style="margin-top:12px;font-weight:700;">Responsável pela Inspeção</div>`;
    html += `<div class="pr-field-line">Nome: <b>${esc(v('respInsNome'))}</b></div>`;
    html += `<div class="pr-field-line">CREA: <b>${esc(v('respInsCrea'))}</b></div>`;
    html += UIRender.renderizarBlocoAssinatura(signatureData?.respIns, v('respInsAssinatura'));
    html += `<div class="pr-field-line">Data: <b>${esc(UIRender.fmtDateBR(v('respInsData')))}</b></div>`;

    html += `<div class="pr-field-line" style="margin-top:12px;font-weight:700;">Representante do Cliente</div>`;
    html += `<div class="pr-field-line">Nome: <b>${esc(v('repCliNome'))}</b></div>`;
    html += `<div class="pr-field-line">Cargo: <b>${esc(v('repCliCargo'))}</b></div>`;
    html += UIRender.renderizarBlocoAssinatura(signatureData?.repCli, v('repCliAssinatura'));
    html += `<div class="pr-field-line">Data: <b>${esc(UIRender.fmtDateBR(v('repCliData')))}</b></div>`;

    // 🔥 ADICIONAMOS O RODAPÉ DENTRO DA DIV PR-PAGE
    html += UIRender.prFooterHTML(logoB64, cnpj);
    
    html += '</div>'; // Fecha o pr-page

    document.getElementById('print-report').innerHTML = html;
  },

  /**
   * Gera o HTML para impressão do Recibo
   */
  buildReceiptReport: (currentSeq, logoB64, cnpj) => {
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const pagador = v('recPagador') || v('respVeic') || v('empresa');
    const valor = v('valorServico');
    const forma = v('formaPagamento');
    const nf = v('nfNumero');
    const logoUrl = 'https://raw.githubusercontent.com/alexdovale/ercr-engenharia-checklist/main/assets/img/logo-ercr.png';

    let html = '<div class="pr-page">';

    // 🔥 LOGO CENTRALIZADA TAMBÉM NO RECIBO
    html += `<div style="text-align: center; margin-bottom: 25px; margin-top: 10px;">
      <img src="${logoUrl}" style="max-width: 220px; height: auto;" alt="ERCR Engenharia">
    </div>`;

    html += `<div class="pr-title">RECIBO DE PRESTAÇÃO DE SERVIÇO</div>`;
    if(currentSeq) html += `<div class="pr-field-line" style="color:#555;">Referente à inspeção ${UIRender.formatSeq(currentSeq)}</div>`;

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

    // 🔥 ADICIONAMOS O RODAPÉ DENTRO DA DIV PR-PAGE
    html += UIRender.prFooterHTML(logoB64, cnpj);
    
    html += '</div>'; // Fecha o pr-page

    document.getElementById('print-report').innerHTML = html;
  }
};
