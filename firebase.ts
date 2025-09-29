import { initializeApp } from "firebase/app";
// FIX: Use specific browser entry point for Firebase auth to solve import errors
import { getAuth, GoogleAuthProvider } from "firebase/auth/browser";
import { getFirestore } from "firebase/firestore";

// --------------------------------------------------------------------------
//  Firebase Configuration
//
//  1. Create a Firebase project at https://console.firebase.google.com/
//  2. Go to Project Settings > General tab.
//  3. Under "Your apps", click the web icon (</>) to register a new web app.
//  4. Copy the `firebaseConfig` object provided and paste it below.
//  5. In the Firebase console, go to "Authentication" -> "Sign-in method"
//     and enable the "Google" provider.
//  6. In the Firebase console, go to "Firestore Database" and create a
//     database.
// --------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyAl04Pg8HSxRvFZk9_mbc76TbpB2uJdj2Y",
  authDomain: "bmsweb-3b5ea.firebaseapp.com",
  projectId: "bmsweb-3b5ea",
  storageBucket: "bmsweb-3b5ea.firebasestorage.app",
  messagingSenderId: "736692258464",
  appId: "1:736692258464:web:efe46c77f73a463047abc5",
  measurementId: "G-104DTR3HKG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
