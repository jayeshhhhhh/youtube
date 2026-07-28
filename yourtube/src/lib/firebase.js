// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyxbdclt2ocA5zgE-MDy1ndYIFqVMAr30",
  authDomain: "youtube",
  projectId: "fir-fc6da",
  storageBucket: "yourtube-8cda9.firebasestorage.app",
  messagingSenderId: "921641878423",
  appId: "1:921641878423:web:0d65801eebaf2b25f03ad2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
