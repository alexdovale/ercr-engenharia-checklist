/**
 * Provedor de Assinatura Híbrida (Canvas + Metadados)
 * Captura o desenho da assinatura em tela e anexa dados de auditoria (Geolocalização, Usuário, Data/Hora).
 */
class CanvasProvider {
  constructor() {
    this.canvases = {};
  }

  /**
   * Configura os eventos de toque e mouse para um elemento canvas específico
   * @param {string} role - 'respIns' (Inspetor) ou 'repCli' (Cliente)
   * @param {string} canvasId - O ID do elemento <canvas> no HTML
   */
  setup(role, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
    
    let drawing = false;
    canvas._hasDrawn = false;
    canvas._dirty = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    canvas.addEventListener('pointerdown', e => {
      drawing = true; 
      canvas._hasDrawn = true; 
      canvas._dirty = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    canvas.addEventListener('pointermove', e => {
      if (!drawing) return;
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault();
    });

    ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => {
      canvas.addEventListener(evt, () => { drawing = false; });
    });

    // Armazena a referência para uso posterior
    this.canvases[role] = canvas;
  }

  /**
   * Limpa o desenho do canvas
   * @param {string} role - 'respIns' ou 'repCli'
   */
  clear(role) {
    const canvas = this.canvases[role];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas._hasDrawn = false;
    canvas._dirty = true;
  }

  /**
   * Captura a geolocalização do dispositivo (requer permissão do navegador)
   * @returns {Promise<object|null>} Coordenadas ou nulo se negado/falhar
   */
  async _getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.warn("Geolocalização não disponível ou negada pelo usuário.", error);
          resolve(null); // Retorna nulo se o usuário negar para não travar o processo
        },
        { timeout: 5000 } // Desiste após 5 segundos para não atrasar o salvamento
      );
    });
  }

  /**
   * Método principal chamado pelo SignatureManager
   * @param {string} role - 'respIns' ou 'repCli'
   * @returns {Promise<object>} Objeto contendo a imagem Base64 e os metadados
   */
  async sign(role) {
    const canvas = this.canvases[role];
    if (!canvas) throw new Error(`Canvas para ${role} não foi configurado.`);

    // Se o usuário não desenhou nada, retorna nulo para este papel
    if (!canvas._hasDrawn) {
      return null;
    }

    // Pega a imagem base64
    const dataUrl = canvas.toDataURL('image/png');

    // Coleta dados de auditoria
    const location = await this._getLocation();
    
    // Obtém o usuário logado no Firebase naquele momento
    const currentUser = firebase.auth().currentUser;
    const userInfo = currentUser ? { uid: currentUser.uid, email: currentUser.email } : null;

    return {
      image: dataUrl, // A imagem que será enviada ao Firebase Storage
      metadata: {
        timestamp: new Date().toISOString(), // Hora exata da assinatura local
        location: location,                  // Onde a assinatura foi feita
        authenticatedUser: userInfo,         // Quem estava logado no tablet/celular
        browserInfo: navigator.userAgent     // Dados do dispositivo
      }
    };
  }
}

// Instancia e registra o provedor no SignatureManager
const canvasProvider = new CanvasProvider();
signatureManager.registerProvider('canvas', canvasProvider);
