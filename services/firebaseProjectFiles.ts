import type { ProjectFile } from "../types";
import { USE_MOCK } from './runtimeConfig';

// Helpers para mock localStorage
const storageKey = 'mock_project_files';
const getMap = (): Map<string, ProjectFile> => {
  try { const raw = localStorage.getItem(storageKey); return raw ? new Map(JSON.parse(raw)) : new Map(); } catch { return new Map(); }
};
const saveMap = (m: Map<string, ProjectFile>) => localStorage.setItem(storageKey, JSON.stringify(Array.from(m.entries())));

export async function uploadProjectFile(projectId: string, file: File): Promise<ProjectFile> {
  if (USE_MOCK) {
    const id = `file_${Math.random().toString(36).slice(2)}`;
    const url = URL.createObjectURL(file);
    const uploadedAt = new Date().toISOString();
    const pf: ProjectFile = { id, projectId, name: file.name, type: file.type, size: file.size, uploadedAt } as any;
    (pf as any).url = url;
    const map = getMap();
    map.set(id, pf);
    saveMap(map);
    return pf;
  }
  const { getFirestore, collection, addDoc } = await import('firebase/firestore');
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const storage = getStorage(app);
  const storageRef = ref(storage, `projectFiles/${projectId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const uploadedAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'projectFiles'), { projectId, name: file.name, type: file.type, size: file.size, url, uploadedAt });
  return { id: docRef.id, projectId, name: file.name, type: file.type, size: file.size, url, uploadedAt } as any;
}

export async function getFilesForProject(projectId: string): Promise<ProjectFile[]> {
  if (USE_MOCK) {
    return Array.from(getMap().values()).filter(f => f.projectId === projectId);
  }
  const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const q = query(collection(db, 'projectFiles'), where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectFile));
}

export async function deleteProjectFile(id: string, projectId: string, fileName: string): Promise<void> {
  if (USE_MOCK) {
    const map = getMap();
    const pf = map.get(id) as any;
    if (pf && pf.url) {
      try { URL.revokeObjectURL(pf.url); } catch {}
    }
    map.delete(id);
    saveMap(map);
    return;
  }
  const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
  const { getStorage, ref, deleteObject } = await import('firebase/storage');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const storage = getStorage(app);
  const storageRef = ref(storage, `projectFiles/${projectId}/${fileName}`);
  try { await deleteObject(storageRef); } catch (error: any) { if (error.code !== 'storage/object-not-found') throw error; }
  await deleteDoc(doc(db, 'projectFiles', id));
}

export async function uploadProjectImage(projectId: string, file: File): Promise<string> {
  if (USE_MOCK) {
    // Return object URL to simulate hosted asset
    return URL.createObjectURL(file);
  }
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const { app } = await import('./firebase');
  const storage = getStorage(app);
  const storageRef = ref(storage, `projectImages/${projectId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
