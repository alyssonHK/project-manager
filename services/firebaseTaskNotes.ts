import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { app } from "./firebase";
import type { TaskNote } from "../types";

const db = getFirestore(app);

export async function createTaskNote(data: Omit<TaskNote, 'id' | 'createdAt'>): Promise<TaskNote> {
  const createdAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, "taskNotes"), {
    ...data,
    createdAt,
  });
  return { ...data, id: docRef.id, createdAt };
}

export async function getNotesForTask(taskId: string): Promise<TaskNote[]> {
  const q = query(collection(db, "taskNotes"), where("taskId", "==", taskId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskNote));
}

export async function updateTaskNote(id: string, data: Partial<TaskNote>): Promise<void> {
  await updateDoc(doc(db, "taskNotes", id), data);
}

export async function deleteTaskNote(id: string): Promise<void> {
  await deleteDoc(doc(db, "taskNotes", id));
} 