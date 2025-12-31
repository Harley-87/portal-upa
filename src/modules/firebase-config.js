// Importa as funções que precisamos do SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// COLE AQUI SUA CONFIGURAÇÃO DO CONSOLE DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDJWOFhzb99NF1QEzxxdQkozH11VtC5vb8",
  authDomain: "portal-upa-veneza.firebaseapp.com",
  projectId: "portal-upa-veneza",
  storageBucket: "portal-upa-veneza.firebasestorage.app",
  messagingSenderId: "938691607200",
  appId: "1:938691607200:web:7a7828b48d989e63a2e7c5"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados e exporta para usar nos outros arquivos
export const db = getFirestore(app);
// export const auth = getAuth(app)
export const auth = getAuth(app);