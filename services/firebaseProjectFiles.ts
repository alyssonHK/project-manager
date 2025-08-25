import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "./firebase";
import type { ProjectFile } from "../types";

const db = getFirestore(app);
const storage = getStorage(app);

export async function uploadProjectFile(projectId: string, file: File): Promise<ProjectFile> {
  const storageRef = ref(storage, `projectFiles/${projectId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const uploadedAt = new Date().toISOString();
  const docRef = await addDoc(collection(db, "projectFiles"), {
    projectId,
    name: file.name,
    type: file.type,
    size: file.size,
    url,
    uploadedAt,
  });
  return { id: docRef.id, projectId, name: file.name, type: file.type, size: file.size, url, uploadedAt };
}

export async function getFilesForProject(projectId: string): Promise<ProjectFile[]> {
  const q = query(collection(db, "projectFiles"), where("projectId", "==", projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectFile));
}

export async function deleteProjectFile(id: string, projectId: string, fileName: string): Promise<void> {
  const storageRef = ref(storage, `projectFiles/${projectId}/${fileName}`);
  try {
    await deleteObject(storageRef);
  } catch (error: any) {
    // Se o erro for 404 (objeto não encontrado), apenas ignore
    if (error.code !== 'storage/object-not-found') {
      throw error;
    }
  }
  await deleteDoc(doc(db, "projectFiles", id));
}

export async function uploadProjectImage(projectId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `projectImages/${projectId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
} 