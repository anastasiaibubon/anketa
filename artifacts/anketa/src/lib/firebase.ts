import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_QOlff5KMZBDbMIz5upWs0PbUHjF5RRM",
  authDomain: "anketa-8fd17.firebaseapp.com",
  projectId: "anketa-8fd17",
  storageBucket: "anketa-8fd17.firebasestorage.app",
  messagingSenderId: "426369229587",
  appId: "1:426369229587:web:c4f4f2961a7da24eae70e6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
