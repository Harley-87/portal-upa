import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

// 1. Monitorar o estado (Se já estiver logado, redireciona)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuário já logado:", user.email);
    // Se o login der certo, vamos para o painel (criaremos na próxima etapa)
    window.location.href = "/dashboard.html"; 
  }
});

// 2. Evento de Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Evita recarregar a página
  
  errorMessage.style.display = 'none';
  loginBtn.textContent = 'Verificando...';
  loginBtn.disabled = true;

  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    // O redirecionamento acontece automaticamente no onAuthStateChanged acima
  } catch (error) {
    console.error("Erro de login:", error.code);
    loginBtn.textContent = 'Entrar';
    loginBtn.disabled = false;
    errorMessage.style.display = 'block';
    
    // Tratamento de erros comuns para português
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      errorMessage.textContent = 'E-mail ou senha incorretos.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage.textContent = 'Muitas tentativas. Tente novamente mais tarde.';
    } else {
      errorMessage.textContent = 'Erro ao acessar: ' + error.code;
    }
  }
});