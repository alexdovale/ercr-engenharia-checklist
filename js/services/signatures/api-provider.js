/**
 * Provedor de Assinatura Remota (Integração via API)
 * 
 * Responsável por capturar o contato do cliente e enviar o payload para uma 
 * plataforma externa de assinaturas (ex: ZapSign, Clicksign) ou para um fluxo 
 * de automação via WhatsApp.
 */
class ApiProvider {
  constructor() {
    this.apiUrl = 'https://sua-api-ou-webhook.com/v1/enviar-documento';
  }

  /**
   * Captura o contato preenchido na interface e inicia o fluxo de envio.
   * @param {string} role - 'respIns' (Inspetor) ou 'repCli' (Cliente)
   * @returns {Promise<object>} Objeto com o status pendente e o ID de rastreamento
   */
  async sign(role) {
    // Busca o campo de contato na interface baseado no papel (role)
    // Exemplo: id="remote-contact-repCli"
    const inputContato = document.getElementById(`remote-contact-${role}`);
    const contato = inputContato ? inputContato.value.trim() : null;

    if (!contato) {
      throw new Error(`Por favor, informe o e-mail ou WhatsApp do representante para enviar o link.`);
    }

    try {
      this._mostrarCarregamento(role, 'Disparando link de assinatura...');

      // Chamada para a sua API real ou sistema de automação
      const respostaApi = await this._simularDisparoParaApi(role, contato);

      this._removerCarregamento(role);

      // O retorno não contém a imagem da assinatura ainda, pois ela acontecerá no futuro.
      // Retornamos os metadados de rastreamento.
      return {
        image: null, 
        metadata: {
          timestampEnvio: new Date().toISOString(),
          metodo: 'Assinatura Remota via Link',
          contatoDestino: contato,
          status: 'pendente_assinatura',
          envelopeId: respostaApi.envelopeId, // ID retornado pela Clicksign/ZapSign
          linkParaAcompanhamento: respostaApi.trackingUrl
        }
      };

    } catch (error) {
      this._removerCarregamento(role);
      console.error("Falha ao enviar documento para assinatura:", error);
      throw new Error("Não foi possível enviar o link de assinatura. Tente novamente.");
    }
  }

  /**
   * --- MÉTODOS PRIVADOS ---
   */

  // Simula o disparo de um webhook ou requisição POST para uma API
  _simularDisparoParaApi(role, contato) {
    return new Promise((resolve) => {
      
      /* 
       * Exemplo de como seria a requisição real usando fetch:
       * 
       * const payload = { 
       *   telefone: contato, 
       *   documento: currentRecordId, 
       *   mensagem: "Olá! Segue o link para assinar o laudo da ERCR Engenharia." 
       * };
       * 
       * const response = await fetch(this.apiUrl, {
       *   method: 'POST',
       *   headers: { 'Content-Type': 'application/json' },
       *   body: JSON.stringify(payload)
       * });
       * return await response.json();
       */

      setTimeout(() => {
        resolve({
          success: true,
          envelopeId: "env_" + Math.random().toString(36).substr(2, 9),
          trackingUrl: "https://plataforma-assinatura.com/track/12345"
        });
      }, 1500);
    });
  }

  _mostrarCarregamento(role, mensagem) {
    const btn = document.getElementById(`btn-sign-remote-${role}`);
    if (btn) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = mensagem;
      btn.disabled = true;
    }
  }

  _removerCarregamento(role) {
    const btn = document.getElementById(`btn-sign-remote-${role}`);
    if (btn && btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
      btn.disabled = false;
    }
  }
}

// Instancia e registra o provedor no SignatureManager
const apiProvider = new ApiProvider();
signatureManager.registerProvider('remote', apiProvider);
