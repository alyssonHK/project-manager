import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "./firebase";
import type { TLEditorSnapshot } from "@tldraw/tldraw";

const db = getFirestore(app);

export interface Drawing {
  id: string;
  userId: string;
  name: string;
  records: any; // Mudando para any para aceitar o snapshot completo
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export async function saveDrawing(userId: string, name: string, records: any): Promise<Drawing> {
  const drawingId = `drawing_${Date.now()}`;
  const now = new Date().toISOString();
  
  const drawing: Drawing = {
    id: drawingId,
    userId,
    name,
    records,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(doc(db, "drawings", drawingId), drawing);
  return drawing;
}

export async function updateDrawing(drawingId: string, records: any): Promise<void> {
  const now = new Date().toISOString();
  await setDoc(doc(db, "drawings", drawingId), {
    records,
    updatedAt: now
  }, { merge: true });
}

export async function getDrawingsForUser(userId: string): Promise<Drawing[]> {
  const q = query(collection(db, "drawings"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Drawing);
}

export async function getDrawing(drawingId: string): Promise<Drawing | null> {
  const docRef = doc(db, "drawings", drawingId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as Drawing;
  }
  return null;
}

export async function deleteDrawing(drawingId: string): Promise<void> {
  await setDoc(doc(db, "drawings", drawingId), { deleted: true }, { merge: true });
} 