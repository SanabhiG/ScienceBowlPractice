// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDNk5EGWDPBr8MkUFNdfvhP1NvnDxWERq8",
  authDomain: "science-bowl-practice-8800a.firebaseapp.com",
  databaseURL: "https://science-bowl-practice-8800a-default-rtdb.firebaseio.com",
  projectId: "science-bowl-practice-8800a",
  storageBucket: "science-bowl-practice-8800a.firebasestorage.app",
  messagingSenderId: "240054855565",
  appId: "1:240054855565:web:2897ab544b9f1c1b3d3fc4",
  measurementId: "G-4TD0W788X5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);