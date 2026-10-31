import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const effectiveFirebaseConfig = {
  ...firebaseAppletConfig,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    firebaseAppletConfig.projectId,
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY?.trim() ||
    firebaseAppletConfig.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
    firebaseAppletConfig.authDomain,
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID?.trim() ||
    firebaseAppletConfig.appId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
    firebaseAppletConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    firebaseAppletConfig.messagingSenderId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID?.trim() ||
    firebaseAppletConfig.firestoreDatabaseId,
};

export const ACTIVE_FIREBASE_PROJECT_ID = effectiveFirebaseConfig.projectId;

// Initialize Firebase
const app = initializeApp(effectiveFirebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId according to integration instructions
export const db = getFirestore(app, effectiveFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handling enum and interface as specified in the Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.warn('Firebase client is offline or network is warming up.');
    }
  }
}

testConnection();

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  collection,
  query,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
};
export type { User };
