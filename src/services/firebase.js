import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAQFk72dLhbr3lq07G_OZWgBIpPJ_UPC4c",
  authDomain: "aluverse93.firebaseapp.com",
  databaseURL: "https://aluverse93-default-rtdb.firebaseio.com",
  projectId: "aluverse93",
  storageBucket: "aluverse93.firebasestorage.app",
  messagingSenderId: "866936412039",
  appId: "1:866936412039:web:96b36a79289a805f8c2522",
  measurementId: "G-73Q19S8HTM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Initialize Services
export const auth = getAuth(app);

// Set persistence to LOCAL (session persists across browser close/reopen)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn("Persistence setup error:", error);
  });
}

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
// Ensure Storage uses the correct bucket URL. Some Firebase configs use different storageBucket formats;
// specifying the gs:// URL ensures the SDK targets the right bucket.
export const storage = getStorage(app, `gs://${firebaseConfig.projectId}.appspot.com`);

// For local development you can run the Firebase Storage emulator to avoid CORS issues.
// Enable by setting VITE_USE_FIREBASE_EMULATOR=true in your .env and running the emulator.
if (typeof window !== "undefined") {
  try {
    const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
    if (useEmulator) {
      // Default emulator storage host/port
      connectStorageEmulator(storage, 'localhost', 9199);
      console.info('Connected Storage to emulator at localhost:9199');
    }
  } catch (e) {
    // ignore when import.meta.env isn't available in some environments
  }
}

export default app;
