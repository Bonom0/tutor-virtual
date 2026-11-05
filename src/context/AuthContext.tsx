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
import { initializeProfile } from '../services/api';
import { AuthContext } from './auth';

async function initializeApiProfile(user: User) {
  await initializeProfile(await user.getIdToken());
}

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
    await initializeApiProfile(credential.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await initializeApiProfile(credential.user);
  };

  const signInWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    await initializeApiProfile(credential.user);
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
