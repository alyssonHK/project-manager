import type { Project } from "../types";
import { USE_MOCK } from './runtimeConfig';

export async function createProject(data: Omit<Project, 'id' | 'ownerUid'>, ownerUid: string): Promise<Project> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    // mock infere ownerUid do usuário logado; manter compatibilidade
    return mock.createProject(data);
  }
  const { getFirestore, collection, addDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const docRef = await addDoc(collection(db, 'projects'), { ...data, ownerUid });
  return { ...data, id: docRef.id, ownerUid };
}

export async function getProjectsForUser(uid: string): Promise<Project[]> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.getProjectsForUser(uid);
  }
  const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const q = query(collection(db, 'projects'), where('ownerUid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.getProjectById(id);
  }
  const { getFirestore, doc, getDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const ref = doc(db, 'projects', id);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.updateProject(id, data as any);
    return;
  }
  const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await updateDoc(doc(db, 'projects', id), data);
}

export async function deleteProject(id: string): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.deleteProject(id);
    return;
  }
  const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'projects', id));
}
