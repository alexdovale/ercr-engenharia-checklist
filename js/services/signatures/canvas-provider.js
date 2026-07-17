/**
 * Provedor de Assinatura Híbrida (Canvas + Metadados)
 */
class CanvasProvider {
  constructor() {
    this.canvases = {};
  }

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
        { timeout: 5000 }
      );
    });
  }

  async sign(role) {
    const canvas = this.canvases[role];
    if (!canvas) throw new Error(`Canvas para ${role} não foi configurado.`);
    if (!canvas._hasDrawn) return null;

    const dataUrl = canvas.toDataURL('image/png');
    const location = await this._getLocation();
    const currentUser = firebase.auth().currentUser;
    const userInfo = currentUser ? { uid: currentUser.uid, email: currentUser.email } : null;

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

// Instancia e registra o provedor
const canvasProvider = new CanvasProvider();
signatureManager.registerProvider('canvas', canvasProvider);

// 🔥 CONFIGURAÇÃO AUTOMÁTICA
function initCanvasProviders() {
  const respIns = document.getElementById('sig-respIns');
  const repCli = document.getElementById('sig-repCli');
  
  if (respIns) canvasProvider.setup('respIns', 'sig-respIns');
  if (repCli) canvasProvider.setup('repCli', 'sig-repCli');
}

document.addEventListener('DOMContentLoaded', initCanvasProviders);
