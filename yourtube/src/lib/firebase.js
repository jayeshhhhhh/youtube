
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDSIDS06zreYqj6kRDjI0dG5vMsChzmBJo",
  authDomain: "yourtube-37e77.firebaseapp.com",
  projectId: "yourtube-37e77",
  storageBucket: "yourtube-37e77.firebasestorage.app",
  messagingSenderId: "567342845878",
  appId: "1:567342845878:web:50e467a260d767b6ccfb17",
  measurementId: "G-X0M9GR5VPR"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };

