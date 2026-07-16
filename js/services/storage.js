/**
 * js/services/storage.js
 * Serviço de Banco de Dados e Armazenamento (Firestore e Firebase Storage)
 */

const StorageService = {
  
  // Referências para o Firestore e Storage (inicializados no config/firebase.js)
  get db() { return firebase.firestore(); },
  get storage() { return firebase.storage(); },

  /**
   * Obtém a lista de todas as inspeções para o painel inicial
   */
  async getInspectionsList() {
    try {
      const snap = await this.db.collection('inspections').orderBy('updatedAt', 'desc').get();
      if (snap.empty) return [];
      
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error("Erro ao carregar lista:", err);
      throw new Error("Não foi possível carregar as inspeções.");
    }
  },

  /**
   * Carrega uma inspeção específica pelo ID
   */
  async getInspection(id) {
    try {
      const doc = await this.db.collection('inspections').doc(id).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (err) {
      console.error("Erro ao carregar inspeção:", err);
      throw new Error("Não foi possível carregar esta inspeção.");
    }
  },

  /**
   * Salva ou atualiza uma inspeção no banco de dados
   * Se o ID for nulo, cria um novo documento.
   */
  async saveInspection(id, data) {
    try {
      let docRef;
      if (id) {
        docRef = this.db.collection('inspections').doc(id);
      } else {
        docRef = this.db.collection('inspections').doc();
      }
      
      const payload = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      await docRef.set(payload, { merge: true });
      return docRef.id;
    } catch (err) {
      console.error("Erro ao salvar:", err);
      throw new Error("Não foi possível salvar a inspeção. Verifique sua conexão.");
    }
  },

  /**
   * Exclui uma inspeção inteira, incluindo todas as fotos atreladas a ela
   */
  async deleteInspection(id, photoUrls = {}) {
    try {
      // 1. Apaga as fotos do Storage primeiro
      const itemIds = Object.keys(photoUrls);
      for (const itemId of itemIds) {
        await this.deletePhoto(id, itemId);
      }
      
      // 2. Apaga o documento principal do Firestore
      await this.db.collection('inspections').doc(id).delete();
    } catch (err) {
      console.error("Erro ao excluir inspeção:", err);
      throw new Error("Não foi possível excluir a inspeção.");
    }
  },

  /**
   * Gera o número sequencial (Nº XXXX/2026) com segurança para evitar duplicidade
   */
  async getNextSeqNumber(year) {
    const ref = this.db.collection('counters').doc('seq_' + year);
    try {
      return await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? (snap.data().value || 0) : 0;
        const next = current + 1;
        tx.set(ref, { value: next });
        return next;
      });
    } catch (err) {
      console.error('Falha ao gerar o número sequencial:', err);
      throw new Error('Não foi possível gerar o número do laudo.');
    }
  },

  /**
   * Comprime uma imagem antes de enviá-la para economizar espaço e dados
   */
  compressImage(file, maxWidth = 900, quality = 0.6) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxWidth) { 
            h = Math.round(h * (maxWidth / w)); 
            w = maxWidth; 
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; 
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Faz o upload de uma foto anexada a um item do checklist
   */
  async uploadPhoto(recordId, itemId, file) {
    try {
      const dataUrl = await this.compressImage(file);
      const path = `inspections/${recordId}/photos/${itemId}.jpg`;
      const ref = this.storage.ref(path);
      
      await ref.putString(dataUrl, 'data_url');
      const downloadURL = await ref.getDownloadURL();
      return downloadURL;
    } catch (err) {
      console.error("Erro no upload da foto:", err);
      throw new Error("Não foi possível anexar a foto.");
    }
  },

  /**
   * Remove uma foto específica do Storage
   */
  async deletePhoto(recordId, itemId) {
    try {
      const path = `inspections/${recordId}/photos/${itemId}.jpg`;
      await this.storage.ref(path).delete();
    } catch (err) {
      // Ignora erro se o arquivo já não existir
      console.warn("Foto não encontrada para exclusão ou já apagada.", err);
    }
  }
};
