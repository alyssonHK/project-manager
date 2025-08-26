import type { Task } from "../types";
import { USE_MOCK } from './runtimeConfig';

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.createTask(data as any);
  }
  const { getFirestore, collection, addDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const createdAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'tasks'), { ...data, createdAt });
  return { ...data, id: docRef.id, createdAt };
}

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.getTasksForProject(projectId);
  }
  const { getFirestore, collection, getDocs, query, where } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const q = query(collection(db, 'tasks'), where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.updateTask(id, data as any);
    return;
  }
  const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await updateDoc(doc(db, 'tasks', id), data);
}

export async function deleteTask(id: string): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    await mock.deleteTask(id);
    return;
  }
  const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await deleteDoc(doc(db, 'tasks', id));
}
