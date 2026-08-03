import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// Firebase project configuration (public values — safe to commit).
// These only identify the Firebase project; actual secrets live server-side.
const firebaseConfig = {
  apiKey: "AIzaSyAzpTQEbjv7PetT6T85YSvJbZaCUY-31to",
  authDomain: "squadcode-d454e.firebaseapp.com",
  projectId: "squadcode-d454e",
  storageBucket: "squadcode-d454e.firebasestorage.app",
  messagingSenderId: "618869907810",
  appId: "1:618869907810:web:73fc02db2e16cd84f38c3b",
  measurementId: "G-39ERSLF5QL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase Messaging is not supported by this browser.", e);
}

export { messaging };
