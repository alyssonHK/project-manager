import type { TLEditorSnapshot } from "@tldraw/tldraw";
import { USE_MOCK } from './runtimeConfig';

export interface Drawing {
  id: string;
  userId: string;
  name: string;
  records: any; // Mudando para any para aceitar o snapshot completo
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}
// Mock helpers
const drawingsKey = 'mock_drawings';
const getMap = (): Map<string, Drawing> => { try { const raw = localStorage.getItem(drawingsKey); return raw ? new Map(JSON.parse(raw)) : new Map(); } catch { return new Map(); } };
const saveMap = (m: Map<string, Drawing>) => localStorage.setItem(drawingsKey, JSON.stringify(Array.from(m.entries())));

export async function saveDrawing(userId: string, name: string, records: any): Promise<Drawing> {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    const id = `drawing_${Date.now()}`;
    const d: Drawing = { id, userId, name, records, createdAt: now, updatedAt: now };
    const m = getMap(); m.set(id, d); saveMap(m); return d;
  }
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const drawingId = `drawing_${Date.now()}`;
  const now = new Date().toISOString();
  const drawing: Drawing = { id: drawingId, userId, name, records, createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'drawings', drawingId), drawing);
  return drawing;
}

export async function updateDrawing(drawingId: string, records: any): Promise<void> {
  if (USE_MOCK) {
    const m = getMap(); const d = m.get(drawingId); if (!d) return; d.records = records; d.updatedAt = new Date().toISOString(); m.set(drawingId, d); saveMap(m); return;
  }
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const now = new Date().toISOString();
  await setDoc(doc(db, 'drawings', drawingId), { records, updatedAt: now }, { merge: true });
}

export async function getDrawingsForUser(userId: string): Promise<Drawing[]> {
  if (USE_MOCK) {
    return Array.from(getMap().values()).filter(d => d.userId === userId && !d.deleted);
  }
  const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const q = query(collection(db, 'drawings'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Drawing);
}

export async function getDrawing(drawingId: string): Promise<Drawing | null> {
  if (USE_MOCK) {
    const m = getMap(); return m.get(drawingId) || null;
  }
  const { getFirestore, doc, getDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const ref = doc(db, 'drawings', drawingId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Drawing) : null;
}

export async function deleteDrawing(drawingId: string): Promise<void> {
  if (USE_MOCK) {
    const m = getMap(); const d = m.get(drawingId); if (d) { d.deleted = true; m.set(drawingId, d); saveMap(m); } return;
  }
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  await setDoc(doc(db, 'drawings', drawingId), { deleted: true }, { merge: true });
}
