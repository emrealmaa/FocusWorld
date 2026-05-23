import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBXpzw7t5BdpbGBsq14MwnizEJAZOi4ckw',
  authDomain: 'focusworld-47097.firebaseapp.com',
  databaseURL: 'https://focusworld-47097-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'focusworld-47097',
  storageBucket: 'focusworld-47097.firebasestorage.app',
  messagingSenderId: '95363600492',
  appId: '1:95363600492:web:6638b29e96441b30a3d1a9',
};

// Guard against double-initialization (Hermes / fast-refresh re-evaluation)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth must only be called once per app instance.
// If already initialized (e.g. hot reload), fall back to getAuth().
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
