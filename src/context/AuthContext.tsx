import { useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { criarUsuarioSeNaoExistir } from '../firebase/firestore';
import { AuthContext } from './auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await criarUsuarioSeNaoExistir(credential.user.uid, {
      nome: email.split('@')[0],
      email,
      provedor: 'password',
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await criarUsuarioSeNaoExistir(credential.user.uid, {
      nome: credential.user.displayName ?? email.split('@')[0],
      email,
      provedor: 'password',
    });
  };

  const signInWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    await criarUsuarioSeNaoExistir(credential.user.uid, {
      nome: credential.user.displayName ?? credential.user.email?.split('@')[0] ?? 'usuario',
      email: credential.user.email ?? '',
      provedor: 'google.com',
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUpWithEmail, signInWithEmail, signInWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
