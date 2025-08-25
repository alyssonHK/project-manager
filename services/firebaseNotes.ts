import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { app } from "./firebase";
import type { Note } from "../types";

const db = getFirestore(app);

export async function createNote(data: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
  const createdAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, "notes"), {
    ...data,
    createdAt,
  });
  return { ...data, id: docRef.id, createdAt };
}

export async function getNotesForProject(projectId: string): Promise<Note[]> {
  const q = query(collection(db, "notes"), where("projectId", "==", projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
}

export async function updateNote(id: string, data: Partial<Note>): Promise<void> {
  await updateDoc(doc(db, "notes", id), data);
}

export async function deleteNote(id: string): Promise<void> {
  await deleteDoc(doc(db, "notes", id));
} 