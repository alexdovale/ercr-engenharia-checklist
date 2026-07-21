/**
 * js/services/storage.js
 * Serviço de Banco de Dados (Firestore) e Armazenamento de Fotos (Cloudinary)
 */

const StorageService = {
  
  // Referência apenas para o Firestore (O Storage do Firebase não será mais usado para fotos)
  get db() { return firebase.firestore(); },

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
   * Salva ou atualiza uma inspeção no banco de dados (Firestore)
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
   * Exclui uma inspeção inteira
   */
  async deleteInspection(id, photoUrls = {}) {
    try {
      // 1. Apaga as referências de fotos
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
   * Faz o upload de uma foto anexada a um item do checklist DIRETAMENTE PARA O CLOUDINARY
   */
  async uploadPhoto(recordId, itemId, file) {
    // Credenciais Oficiais (Unsigned Upload)
    const cloudName = 'iil5r8l4'; 
    const uploadPreset = 'checklist_fotos'; 

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    // Cria o pacote de dados para enviar a imagem
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    // Organiza a foto em uma pasta com o ID da inspeção lá no Cloudinary
    formData.append('public_id', `inspecoes/${recordId}/${itemId}_${Date.now()}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar a imagem para o servidor do Cloudinary.');
      }

      const data = await response.json();
      
      // Retorna a URL segura (https) otimizada gerada pelo Cloudinary
      return data.secure_url; 

    } catch (error) {
      console.error("Erro no Cloudinary:", error);
      throw new Error("Não foi possível anexar a foto na nuvem.");
    }
  },

  /**
   * Desvincula uma foto da inspeção
   */
  async deletePhoto(recordId, itemId) {
    /* 
     * NOTA DE SEGURANÇA:
     * Por estarmos usando o frontend (sem o API Secret), o Cloudinary não permite 
     * a exclusão física do arquivo por aqui para evitar que hackers apaguem suas fotos.
     * Portanto, apenas removemos o link do seu banco de dados Firebase. 
     * A foto no documento desaparecerá normalmente!
     */
    console.log(`A referência da foto ${itemId} foi desvinculada da inspeção ${recordId}.`);
    return true;
  }
};
