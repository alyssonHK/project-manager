import type { Note } from "../types";
import { USE_MOCK } from './runtimeConfig';

export async function createNote(data: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.createNote(data as any);
  }
  const { getFirestore, collection, addDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const createdAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'notes'), { ...data, createdAt });
  return { ...data, id: docRef.id, createdAt };
}

export async function getNotesForProject(projectId: string): Promise<Note[]> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.getNotesForProject(projectId);
  }
  const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const q = query(collection(db, 'notes'), where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Note));
}

export async function updateNote(id: string, data: Partial<Note>): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.updateNote(id, data as any);
    return;
  }
  const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await updateDoc(doc(db, 'notes', id), data);
}

export async function deleteNote(id: string): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.deleteNote(id);
    return;
  }
  const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'notes', id));
}
