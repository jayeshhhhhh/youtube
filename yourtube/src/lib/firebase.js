// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApWxb8JlWRREGg6-VFKuvtgvmBD_wiCl0",
  authDomain: "fir-fc6da.firebaseapp.com",
  projectId: "fir-fc6da",
  storageBucket: "fir-fc6da.firebasestorage.app",
  messagingSenderId: "503650466583",
  appId: "1:503650466583:web:19f293e04d9124f8719552"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
