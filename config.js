// Your web app's Firebase configuration
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

// Initialize Firebase (using compat version)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();