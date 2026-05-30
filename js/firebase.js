import { initializeApp } from
    "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBtHwDQLpvYtgRuRhuqmtyGoS3hf7rvYTg",
    authDomain: "livro-da-semana.firebaseapp.com",
    projectId: "livro-da-semana",
    storageBucket: "livro-da-semana.firebasestorage.app",
    messagingSenderId: "1019394418240",
    appId: "1:1019394418240:web:08ce2be722e160372de1a5"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);