/**
 * js/services/signatures/canvas-provider.js
 * Provedor de Assinatura Híbrida (Canvas + Metadados) - Otimizado para Mobile
 */
class CanvasProvider {
  constructor() {
    this.canvases = {};
  }

  setup(role, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    
    let drawing = false;
    canvas._hasDrawn = false;
    canvas._dirty = false;

    // Função inteligente para pegar a posição (suporta Mouse, Caneta Touch e Dedo)
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      // Se for evento de toque (touch no celular)
      if (e.touches && e.touches.length > 0) {
        return { 
          x: (e.touches[0].clientX - rect.left) * scaleX, 
          y: (e.touches[0].clientY - rect.top) * scaleY 
        };
      }
      
      // Se for pointer ou mouse
      return { 
        x: (e.clientX - rect.left) * scaleX, 
        y: (e.clientY - rect.top) * scaleY 
      };
    };

    const startDraw = (e) => {
      e.preventDefault(); // Trava a tela de descer no mobile
      drawing = true; 
      canvas._hasDrawn = true; 
      canvas._dirty = true;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      if (e.pointerId) canvas.setPointerCapture(e.pointerId);
    };

    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault(); // Continua travando o scroll enquanto o dedo arrasta
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };

    const stopDraw = (e) => {
      if (e && e.preventDefault) e.preventDefault();
      drawing = false;
    };

    // 1. Suporte Moderno: Pointer Events (Mouse e Canetas Digitais)
    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', draw);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => {
      canvas.addEventListener(evt, stopDraw);
    });

    // 2. Suporte Nativo Mobile: Touch Events (Garante bloqueio de scroll no iOS Safari)
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    ['touchend', 'touchcancel'].forEach(evt => {
      canvas.addEventListener(evt, stopDraw, { passive: false });
    });

    this.canvases[role] = canvas;
  }

  clear(role) {
    const canvas = this.canvases[role];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas._hasDrawn = false;
    canvas._dirty = true;
  }

  async _getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => resolve(null),
        { timeout: 5000 } // Tenta pegar por 5 segundos, se falhar, passa em branco para não travar
      );
    });
  }

  async sign(role) {
    const canvas = this.canvases[role];
    if (!canvas) throw new Error(`Canvas para ${role} não foi configurado.`);
    
    // Se o cliente não encostou na tela, retorna nulo (evita imagem branca)
    if (!canvas._hasDrawn) return null;

    const dataUrl = canvas.toDataURL('image/png');
    const location = await this._getLocation();
    
    let userInfo = null;
    // Captura os dados do usuário logado no Firebase (Se existir)
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const currentUser = firebase.auth().currentUser;
      userInfo = currentUser ? { uid: currentUser.uid, email: currentUser.email } : null;
    }

    return {
      image: dataUrl,
      metadata: {
        timestamp: new Date().toISOString(),
        location: location,
        authenticatedUser: userInfo,
        browserInfo: navigator.userAgent
      }
    };
  }
}

// Instancia globalmente
const canvasProvider = new CanvasProvider();

// Registra no SignatureManager (Padrão Strategy que você configurou)
if (typeof signatureManager !== 'undefined') {
  signatureManager.registerProvider('canvas', canvasProvider);
}

// Inicialização automática das telas de assinatura
function initCanvasProviders() {
  if (document.getElementById('sig-respIns')) canvasProvider.setup('respIns', 'sig-respIns');
  if (document.getElementById('sig-repCli')) canvasProvider.setup('repCli', 'sig-repCli');
}

// Chama a inicialização quando o HTML carrega
document.addEventListener('DOMContentLoaded', initCanvasProviders);
