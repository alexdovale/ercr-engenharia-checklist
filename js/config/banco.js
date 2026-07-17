/**
 * js/config/firebase.js
 * Configuração e Inicialização do SDK do Firebase
 */

const firebaseConfig = {
  apiKey: "AIzaSyBD1jDTCBbDC4iV9p-tGIXSt69d52t4aIw",
  authDomain: "ercr-engenharia-checklist.firebaseapp.com",
  projectId: "ercr-engenharia-checklist",
  storageBucket: "ercr-engenharia-checklist.firebasestorage.app",
  messagingSenderId: "333973981305",
  appId: "1:333973981305:web:6bc856e4b0fb2621f6aca8",
  measurementId: "G-8M134SKP6H"
};

// Verifica se o Firebase já não foi inicializado acidentalmente antes de iniciar
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log("🔥 Firebase inicializado com sucesso.");
}
