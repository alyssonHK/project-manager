import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, User as FirebaseUser } from "firebase/auth";
import { app } from "./firebase";
import type { User } from "../types";

function mapUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || "",
    email: firebaseUser.email || "",
  };
}

export async function signUp(name: string, email: string, password: string): Promise<User> {
  const auth = getAuth(app);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (cred.user) {
    await updateProfile(cred.user, { displayName: name });
    return mapUser({ ...cred.user, displayName: name });
  }
  throw new Error("Erro ao criar usuário.");
}

export async function signIn(email: string, password: string): Promise<User> {
  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (cred.user) return mapUser(cred.user);
  throw new Error("Usuário não encontrado.");
}

export async function signOutUser(): Promise<void> {
  const auth = getAuth(app);
  console.log('Iniciando signOut do Firebase...');
  await signOut(auth);
  console.log('SignOut do Firebase concluído');
}

export function onAuthStateChangedListener(callback: (user: User | null) => void) {
  const auth = getAuth(app);
  console.log('Configurando listener de mudança de estado de autenticação...');
  return onAuthStateChanged(auth, (firebaseUser) => {
    console.log('Firebase auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
    const user = firebaseUser ? mapUser(firebaseUser) : null;
    callback(user);
  });
} 