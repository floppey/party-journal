// src/auth.ts
import { auth, db } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  User,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await ensureProfile(result.user);
  return result.user;
}

export async function sendEmailLink(email: string) {
  const actionCodeSettings = {
    url: `${window.location.origin}/signin`,
    handleCodeInApp: true,
  };
  // Persist email for same-device link completion
  try {
    window.localStorage.setItem("emailForSignIn", email);
  } catch {
    // ignore storage failures
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export async function completeEmailLinkSignIn(email: string) {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    await ensureProfile(result.user);
    try {
      window.localStorage.removeItem("emailForSignIn");
    } catch {}
    return result.user;
  }
  throw new Error("Not an email sign-in link");
}

// Try to complete email link sign-in using stored email; returns a status
export async function completeEmailLinkIfPresent(): Promise<
  | { status: "no-link" }
  | { status: "need-email" }
  | { status: "signed-in"; user: User }
> {
  if (!isSignInWithEmailLink(auth, window.location.href))
    return { status: "no-link" };
  let email: string | null = null;
  try {
    email = window.localStorage.getItem("emailForSignIn");
  } catch {}
  if (!email) return { status: "need-email" };
  const result = await signInWithEmailLink(auth, email, window.location.href);
  await ensureProfile(result.user);
  try {
    window.localStorage.removeItem("emailForSignIn");
  } catch {}
  return { status: "signed-in", user: result.user };
}

export async function ensureProfile(user: User) {
  const ref = doc(db, "profiles", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp(),
    });
  }
}

export function onUserChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Lightweight client hook to access auth state
import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}

export async function logout() {
  await signOut(auth);
}
