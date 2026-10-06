
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_YOURTUBE_37E77_API_KEY",
  authDomain: "yourtube-37e77.firebaseapp.com",
  projectId: "yourtube-37e77",
  storageBucket: "yourtube-37e77.firebasestorage.app",
  messagingSenderId: "YOUR_YOURTUBE_37E77_MESSAGING_SENDER_ID",
  appId: "YOUR_YOURTUBE_37E77_APP_ID"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };

