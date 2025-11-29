// Toggle between login and register
document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('registerSection').classList.add('active');
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerSection').classList.remove('active');
    document.getElementById('loginSection').classList.add('active');
});

// Password visibility toggle
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        const icon = button.querySelector('.eye-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '👁️‍🗨️';
        } else {
            input.type = 'password';
            icon.textContent = '👁️';
        }
    });
});

// Demo account quick login
document.querySelectorAll('.demo-account').forEach(account => {
    account.addEventListener('click', () => {
        const email = account.dataset.email;
        const password = account.dataset.password;
        document.getElementById('loginEmail').value = email;
        document.getElementById('loginPassword').value = password;
    });
});

// Login Form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    errorDiv.textContent = '';
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
    
    try {
        await api.login(email, password);
        window.location.href = 'app.html';
    } catch (error) {
        errorDiv.textContent = error.message || 'Échec de la connexion. Vérifiez vos identifiants.';
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
    }
});

// Register Form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    errorDiv.textContent = '';
    successDiv.textContent = '';
    
    // Validation
    if (password !== passwordConfirm) {
        errorDiv.textContent = 'Les mots de passe ne correspondent pas.';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
        return;
    }
    
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
    
    try {
        // Register with viewer role by default
        await api.register(email, password);
        
        successDiv.textContent = '✓ Compte créé avec succès ! Connexion en cours...';
        
        // Auto-login after registration
        setTimeout(async () => {
            try {
                await api.login(email, password);
                window.location.href = 'app.html';
            } catch (loginError) {
                errorDiv.textContent = 'Compte créé mais échec de connexion. Veuillez vous connecter manuellement.';
                setTimeout(() => {
                    document.getElementById('showLogin').click();
                    document.getElementById('loginEmail').value = email;
                }, 2000);
            }
        }, 1000);
        
    } catch (error) {
        errorDiv.textContent = error.message || 'Échec de la création du compte. Cet email est peut-être déjà utilisé.';
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
    }
});
