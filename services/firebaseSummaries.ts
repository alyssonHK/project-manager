import { USE_MOCK } from './runtimeConfig';

export async function saveTasksSummary(uid: string, summaryText: string): Promise<void> {
  if (USE_MOCK) {
    try {
      const mock: any = await import('./firebaseMock');
      if (typeof mock.saveTasksSummary === 'function') {
        await mock.saveTasksSummary(uid, summaryText);
      }
    } catch (e) {
      // noop
    }
    return;
  }

  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const id = `${uid}_tasks_overview`;
  await setDoc(doc(db, 'summaries', id), {
    uid,
    summary: summaryText,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function getTasksSummary(uid: string): Promise<{ summary: string; updatedAt: string } | null> {
  if (USE_MOCK) {
    try {
      const mock: any = await import('./firebaseMock');
      if (typeof mock.getTasksSummary === 'function') {
        return await mock.getTasksSummary(uid);
      }
    } catch (e) {
      // noop
    }
    return null;
  }

  const { getFirestore, doc, getDoc } = await import('firebase/firestore');
  const { app } = await import('./firebase');
  const db = getFirestore(app);
  const id = `${uid}_tasks_overview`;
  const ref = doc(db, 'summaries', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return { summary: data.summary || data.text || '', updatedAt: data.updatedAt || '' };
}
