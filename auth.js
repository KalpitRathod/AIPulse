document.addEventListener('DOMContentLoaded', () => {
    if (!supabaseClient) {
        document.getElementById('auth-error').textContent = 'Supabase client not initialized. Add credentials in supabase-client.js';
        document.getElementById('auth-error').classList.remove('d-none');
        return;
    }

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const forgotForm = document.getElementById('forgot-form');
    const errorDiv = document.getElementById('auth-error');
    const successDiv = document.getElementById('auth-success');

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.classList.add('d-none');
            successDiv.classList.add('d-none');
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('d-none');
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    if(signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.classList.add('d-none');
            successDiv.classList.add('d-none');
            
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('d-none');
            } else {
                successDiv.textContent = 'Account created successfully! You can now log in.';
                successDiv.classList.remove('d-none');
                signupForm.reset();
            }
        });
    }

    if(forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.classList.add('d-none');
            successDiv.classList.add('d-none');
            
            const email = document.getElementById('forgot-email').value;
            
            const { error } = await supabaseClient.from('password_requests').insert([{ email }]);
            
            if (error) {
                errorDiv.textContent = "Error submitting request. Verify database schema.";
                errorDiv.classList.remove('d-none');
                console.error(error);
            } else {
                successDiv.textContent = 'Request submitted to Network Admin.';
                successDiv.classList.remove('d-none');
                forgotForm.reset();
            }
        });
    }
});
