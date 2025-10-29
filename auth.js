// Frontend auth flow for Word Scramble Game
// This file only handles the UI interactions and redirects
// The actual authentication will be implemented by backend developers

document.addEventListener('DOMContentLoaded', () => {
    // Get form elements
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    
    // Show signup form and hide login form
    if (showSignupLink) {
        showSignupLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        });
    }
    
    // Show login form and hide signup form
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            
            // Placeholder for backend login API call
            console.log('Login request for:', username);
            alert('Login functionality will be implemented by backend developers.');
            
            // For now, just redirect to the game
            window.location.href = 'index.html';
        });
    }
    
    // Handle signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('signup-username').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            
            // Placeholder for backend signup API call
            console.log('Signup request for:', username, email);
            alert('Account created successfully! Redirecting to the game...');
            
            // Direct link to the game after signup
            window.location.href = 'index.html';
        });
    }
});