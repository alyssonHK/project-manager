import type { User } from "../types";
import { USE_MOCK } from './runtimeConfig';

export async function signUp(name: string, email: string, password: string): Promise<User> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.signUp(name, email, password);
  }
  const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
  const { app } = await import('./firebase');
  const auth = getAuth(app);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (cred.user) {
    await updateProfile(cred.user, { displayName: name });
    return { uid: cred.user.uid, name: name, email: cred.user.email || '' };
  }
  throw new Error('Erro ao criar usuário.');
}

export async function signIn(email: string, password: string): Promise<User> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.signIn(email, password);
  }
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
  const { app } = await import('./firebase');
  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (cred.user) return { uid: cred.user.uid, name: cred.user.displayName || '', email: cred.user.email || '' };
  throw new Error('Usuário não encontrado.');
}

export async function signOutUser(): Promise<void> {
  if (USE_MOCK) {
    const mock = await import('./firebaseMock');
    return mock.signOut();
  }
  const { getAuth, signOut } = await import('firebase/auth');
  const { app } = await import('./firebase');
  const auth = getAuth(app);
  await signOut(auth);
}

export function onAuthStateChangedListener(callback: (user: User | null) => void) {
  if (USE_MOCK) {
    // bridge mock signature to our listener
    import('./firebaseMock').then((mock) => {
      mock.onAuthStateChanged((u: User | null) => callback(u));
    });
    return () => {};
  }
  // We want to return a synchronous unsubscribe function to the caller
  // even though we use dynamic imports. We achieve this by tracking the
  // actual unsubscribe returned by onAuthStateChanged once the import
  // completes, and exposing a sync function that will call it (or mark
  // cancellation if called earlier).
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const { app } = await import('./firebase');
    const auth = getAuth(app);
    unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? { uid: firebaseUser.uid, name: firebaseUser.displayName || '', email: firebaseUser.email || '' } : null;
      callback(user);
    });
    if (cancelled && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  })();

  return () => {
    cancelled = true;
    if (unsubscribe) {
      try { unsubscribe(); } catch (e) { /* swallow */ }
      unsubscribe = null;
    }
  };
}
