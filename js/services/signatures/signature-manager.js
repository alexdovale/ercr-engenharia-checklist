/**
 * Gerenciador Central de Assinaturas (Strategy Pattern)
 * Responsável por alternar entre os métodos de assinatura e delegar a coleta de dados.
 */
class SignatureManager {
  constructor() {
    // Define o método padrão como a assinatura em tela (híbrida)
    this.currentMethod = 'canvas'; 
    this.providers = {};
  }

  /**
   * Registra um novo provedor de assinatura (ex: Canvas, ICP, API)
   * @param {string} name - Nome do método (ex: 'canvas', 'icp', 'remote')
   * @param {object} providerInstance - Instância da classe do provedor
   */
  registerProvider(name, providerInstance) {
    this.providers[name] = providerInstance;
  }

  /**
   * Alterna o método de assinatura atual e atualiza a interface
   * @param {string} methodName 
   */
  setMethod(methodName) {
    if (!this.providers[methodName]) {
      console.error(`Provedor de assinatura '${methodName}' não encontrado.`);
      return;
    }
    this.currentMethod = methodName;
    this.updateUI();
  }

  /**
   * Mostra os campos corretos na tela baseados no método selecionado
   */
  updateUI() {
    // 1. Esconde todos os blocos de assinatura dinâmicos
    document.querySelectorAll('.sig-dynamic-container').forEach(el => {
      el.style.display = 'none';
    });

    // 2. Mostra apenas o bloco correspondente ao método atual
    const activeContainer = document.querySelectorAll(`.sig-container-${this.currentMethod}`);
    activeContainer.forEach(el => {
      el.style.display = 'block';
    });
  }

  /**
   * Executa a coleta da assinatura chamando o provedor ativo.
   * @param {string} role - 'respIns' (Inspetor) ou 'repCli' (Cliente)
   * @returns {Promise<object>} Retorna os dados da assinatura (URL da imagem, hash, metadados)
   */
  async collectSignature(role) {
    const provider = this.providers[this.currentMethod];
    if (!provider) {
      throw new Error('Nenhum método de assinatura configurado no momento.');
    }

    // Delega a ação de assinar para o provedor específico
    return await provider.sign(role);
  }
}

// Cria uma instância única (Singleton) para ser usada em todo o sistema
const signatureManager = new SignatureManager();
