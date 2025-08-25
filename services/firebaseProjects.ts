import { getFirestore, collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { app } from "./firebase";
import type { Project } from "../types";

const db = getFirestore(app);

export async function createProject(data: Omit<Project, 'id' | 'ownerUid'>, ownerUid: string): Promise<Project> {
  const docRef = await addDoc(collection(db, "projects"), {
    ...data,
    ownerUid,
  });
  return { ...data, id: docRef.id, ownerUid };
}

export async function getProjectsForUser(uid: string): Promise<Project[]> {
  const q = query(collection(db, "projects"), where("ownerUid", "==", uid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = getFirestore(app);
  const docRef = doc(db, "projects", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Project;
  }
  return null;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const db = getFirestore(app);
  const docRef = doc(db, "projects", id);
  await updateDoc(docRef, data);
}

export async function deleteProject(id: string): Promise<void> {
  const db = getFirestore(app);
  const docRef = doc(db, "projects", id);
  await deleteDoc(docRef);
}