import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { app } from "./firebase";
import type { Task } from "../types";

const db = getFirestore(app);

export async function createTask(data: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const createdAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, "tasks"), {
    ...data,
    createdAt,
  });
  return { ...data, id: docRef.id, createdAt };
}

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  await updateDoc(doc(db, "tasks", id), data);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, "tasks", id));
} 