import type { TaskNote } from "../types";
import { USE_MOCK } from './runtimeConfig';

export async function createTaskNote(data: Omit<TaskNote, 'id' | 'createdAt'>): Promise<TaskNote> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.createTaskNote(data as any);
  }
  const { getFirestore, collection, addDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const createdAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'taskNotes'), { ...data, createdAt });
  return { ...data, id: docRef.id, createdAt };
}

export async function getNotesForTask(taskId: string): Promise<TaskNote[]> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.getNotesForTask(taskId);
  }
  const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const q = query(collection(db, 'taskNotes'), where('taskId', '==', taskId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as TaskNote));
}

export async function updateTaskNote(id: string, data: Partial<TaskNote>): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.updateTaskNote(id, data as any);
    return;
  }
  const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await updateDoc(doc(db, 'taskNotes', id), data);
}

export async function deleteTaskNote(id: string): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.deleteTaskNote(id);
    return;
  }
  const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'taskNotes', id));
}
