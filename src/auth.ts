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
    url: window.location.origin,
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export async function completeEmailLinkSignIn(email: string) {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    await ensureProfile(result.user);
    return result.user;
  }
  throw new Error("Not an email sign-in link");
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
