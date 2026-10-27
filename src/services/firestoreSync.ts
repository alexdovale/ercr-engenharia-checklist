import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where
} from 'firebase/firestore';
import { db, auth, googleProvider, signInWithPopup, handleFirestoreError, OperationType } from './firebase';
import { InspectionData } from '../types/inspection';
import { StorageService } from './storage';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  total: number;
  lastSyncTime: string;
  error?: string;
  userEmail?: string | null;
}

const LAST_SYNC_KEY = 'ercr_last_firestore_sync';

export const FirestoreSyncService = {
  // Get formatted last sync time
  getLastSyncTime(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  },

  setLastSyncTime(isoDate: string) {
    try {
      localStorage.setItem(LAST_SYNC_KEY, isoDate);
    } catch {}
  },

  // Check if current user is logged into Firebase
  getCurrentAuthUser() {
    return auth.currentUser;
  },

  // Log in with Google to enable Cloud Backup
  async loginWithGoogle(): Promise<{ uid: string; email: string | null }> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return {
        uid: result.user.uid,
        email: result.user.email
      };
    } catch (err: any) {
      console.error('Erro no login do Google:', err);
      throw new Error(err.message || 'Falha na autenticação com Google.');
    }
  },

  // Execute full two-way synchronization between LocalStorage and Firestore
  async synchronizeAll(): Promise<SyncResult> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('AUTH_REQUIRED');
    }

    const path = 'inspections';
    let pushed = 0;
    let pulled = 0;

    try {
      // 1. Fetch remote inspections for current user (or all if admin)
      const q = query(collection(db, path), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const remoteMap = new Map<string, InspectionData>();
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as InspectionData;
        if (data.id) {
          remoteMap.set(data.id, data);
        }
      });

      // 2. Fetch local inspections
      const localList = await StorageService.getInspectionsList();
      const localMap = new Map<string, InspectionData>();
      localList.forEach((item) => {
        if (item.id) {
          localMap.set(item.id, item);
        }
      });

      // 3. Compare local items to remote
      for (const [id, localItem] of localMap.entries()) {
        const remoteItem = remoteMap.get(id);

        // Ensure item has current user's ID
        const normalizedLocal: InspectionData = {
          ...localItem,
          userId: user.uid,
          creatorEmail: user.email || localItem.creatorEmail || 'alexdovale222@gmail.com',
          updatedAt: localItem.updatedAt || new Date().toISOString()
        };

        if (!remoteItem) {
          // Push new local item to Firestore
          const docRef = doc(db, path, id);
          await setDoc(docRef, normalizedLocal);
          pushed++;
        } else {
          // Both exist: last-modified wins
          const localTime = new Date(normalizedLocal.updatedAt || 0).getTime();
          const remoteTime = new Date(remoteItem.updatedAt || 0).getTime();

          if (localTime > remoteTime) {
            // Local is newer: push to Firestore
            const docRef = doc(db, path, id);
            await setDoc(docRef, normalizedLocal);
            pushed++;
          } else if (remoteTime > localTime) {
            // Remote is newer: pull into local
            localMap.set(id, remoteItem);
            pulled++;
          }
        }
      }

      // 4. Download any remote items not present in local
      for (const [id, remoteItem] of remoteMap.entries()) {
        if (!localMap.has(id)) {
          localMap.set(id, remoteItem);
          pulled++;
        }
      }

      // 5. Save updated combined list locally
      const mergedList = Array.from(localMap.values()).sort((a, b) => {
        const da = new Date(b.updatedAt || b.createdAt || 0).getTime();
        const db = new Date(a.updatedAt || a.createdAt || 0).getTime();
        return da - db;
      });

      localStorage.setItem('ercr_inspections_db', JSON.stringify(mergedList));

      const nowIso = new Date().toISOString();
      this.setLastSyncTime(nowIso);

      return {
        success: true,
        pushed,
        pulled,
        total: mergedList.length,
        lastSyncTime: nowIso,
        userEmail: user.email
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  // Background auto-backup for a single inspection
  async backupSingleInspection(inspection: InspectionData): Promise<boolean> {
    const user = auth.currentUser;
    if (!user || !inspection.id) return false;

    const path = `inspections/${inspection.id}`;
    try {
      const docRef = doc(db, 'inspections', inspection.id);
      const payload: InspectionData = {
        ...inspection,
        userId: user.uid,
        creatorEmail: user.email || inspection.creatorEmail || 'alexdovale222@gmail.com',
        updatedAt: inspection.updatedAt || new Date().toISOString()
      };
      await setDoc(docRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.warn('Falha no auto-backup do Firestore (possivelmente offline):', err);
      return false;
    }
  }
};
