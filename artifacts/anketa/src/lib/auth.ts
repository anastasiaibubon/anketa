import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

// The email must be remembered across the redirect round-trip to the
// creator's inbox and back, since the sign-in-with-link call needs it again
// and there's no guarantee it's typed on the same device/tab.
const PENDING_EMAIL_KEY = 'anketa_pending_signin_email';

function buildContinueUrl() {
  const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/login`;
}

export async function sendMagicLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, {
    url: buildContinueUrl(),
    handleCodeInApp: true,
  });
  localStorage.setItem(PENDING_EMAIL_KEY, email);
}

export function isMagicLinkUrl(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

export function getPendingEmail(): string | null {
  return localStorage.getItem(PENDING_EMAIL_KEY);
}

export async function completeMagicLinkSignIn(email: string, url: string): Promise<User> {
  const result = await signInWithEmailLink(auth, email, url);
  localStorage.removeItem(PENDING_EMAIL_KEY);
  return result.user;
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
