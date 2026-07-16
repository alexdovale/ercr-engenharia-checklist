/**
 * js/services/auth.js
 * Gerenciador de Autenticação (Firebase Auth)
 */

const AuthService = {
  
  init: () => {
    // Garante que o Firebase já foi inicializado no config/firebase.js
    const auth = firebase.auth();
    
    const lockScreen = document.getElementById('screen-lock');
    const lockContent = document.getElementById('lock-content');
    const screenList = document.getElementById('screen-list');
    const screenForm = document.getElementById('screen-form');

    // Dicionário de erros traduzidos
    const AUTH_ERROR_MESSAGES = {
      'auth/invalid-email': 'E-mail inválido.',
      'auth/user-disabled': 'Esta conta foi desativada.',
      'auth/user-not-found': 'Não existe conta com este e-mail.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
      'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    };

    const getAuthErrorMessage = (err) => {
      return AUTH_ERROR_MESSAGES[err.code] || 'Não foi possível concluir. Tente novamente.';
    };

    const hideLock = () => { 
      lockScreen.style.display = 'none'; 
    };
    
    const showLock = () => { 
      lockScreen.style.display = 'flex'; 
      if (screenList) screenList.style.display = 'none';
      if (screenForm) screenForm.style.display = 'none';
    };

    const showError = (msg) => { 
      const el = document.getElementById('auth-error');
      if (el) {
        el.textContent = msg; 
        el.style.display = 'block'; 
      }
    };

    /**
     * Renderiza o formulário de Login
     */
    const renderLogin = () => {
      lockContent.innerHTML = `
        <p>Entre com seu e-mail e senha para acessar o checklist.</p>
        <input type="email" id="auth-email" placeholder="E-mail" autocomplete="username">
        <input type="password" id="auth-password" placeholder="Senha" autocomplete="current-password">
        <button class="primary" id="btn-do-login">Entrar</button>
        <div class="lock-error" id="auth-error" style="display:none;"></div>
        <p style="margin-top:14px;">Não tem conta? <a href="#" id="link-to-signup" style="color:#FFFFFF;">Criar conta</a></p>
      `;
      
      const tryLogin = async () => {
        const email = document.getElementById('auth-email').value.trim();
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) { showError('Preencha e-mail e senha.'); return; }
        
        try {
          await auth.signInWithEmailAndPassword(email, pass);
        } catch (err) { 
          showError(getAuthErrorMessage(err)); 
        }
      };

      document.getElementById('btn-do-login').addEventListener('click', tryLogin);
      document.getElementById('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
      document.getElementById('link-to-signup').addEventListener('click', e => { e.preventDefault(); renderSignup(); });
    };

    /**
     * Renderiza o formulário de Cadastro
     */
    const renderSignup = () => {
      lockContent.innerHTML = `
        <p>Crie sua conta de acesso ao checklist.</p>
        <input type="email" id="auth-email" placeholder="E-mail" autocomplete="username">
        <input type="password" id="auth-password" placeholder="Senha (mín. 6 caracteres)" autocomplete="new-password">
        <button class="primary" id="btn-do-signup">Criar Conta e Entrar</button>
        <div class="lock-error" id="auth-error" style="display:none;"></div>
        <p style="margin-top:14px;">Já tem conta? <a href="#" id="link-to-login" style="color:#FFFFFF;">Entrar</a></p>
      `;
      
      const trySignup = async () => {
        const email = document.getElementById('auth-email').value.trim();
        const pass = document.getElementById('auth-password').value;
        if (!email || !pass) { showError('Preencha e-mail e senha.'); return; }
        
        try {
          await auth.createUserWithEmailAndPassword(email, pass);
        } catch (err) { 
          showError(getAuthErrorMessage(err)); 
        }
      };

      document.getElementById('btn-do-signup').addEventListener('click', trySignup);
      document.getElementById('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') trySignup(); });
      document.getElementById('link-to-login').addEventListener('click', e => { e.preventDefault(); renderLogin(); });
    };

    /**
     * Listeners Fixos e Observador de Estado
     */
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => auth.signOut());
    }

    // O Firebase dispara isso automaticamente quando a página carrega ou o usuário loga/desloga
    auth.onAuthStateChanged(user => {
      if (user) {
        hideLock();
        screenList.style.display = '';
        
        // Emite um evento global avisando o resto do sistema que o login foi feito
        window.dispatchEvent(new CustomEvent('auth-success', { detail: { user } }));
      } else {
        showLock();
        renderLogin();
      }
    });
  }
};
