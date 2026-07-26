// focus\src\config\firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { getDatabase, ref, get, set, child, query, orderByChild, equalTo, update, remove, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Database paths
const DB_PATHS = {
  USERS: 'users',
  U_EMAIL: 'u_email',
  U_EMPLOYMENT_STATUS: 'u_employment_status',
  ONLINE_SESSIONS: 'dtb_online_sessions',
  LOGIN_HISTORY: 'dtb_login_history',
  USER_DEVICES: 'dtb_user_devices',
  USER_NETWORKS: 'dtb_user_networks',
  USER_LOCATIONS: 'dtb_user_locations',
};

export {
  app,
  auth,
  database,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
  child,
  query,
  orderByChild,
  equalTo,
  DB_PATHS
};