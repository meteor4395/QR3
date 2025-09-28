let isAuthenticated = false;
let userRole = null;
let onLoginSuccess = () => {};

const mainContent = document.getElementById('content');
const sidebar = document.getElementById('sidebar');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');

function updateUIForRole(role) {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = role === 'admin' ? 'block' : 'none';
    });
}

async function handleLogout() {
    try {
        await fetch('http://localhost:5000/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        isAuthenticated = false;
        userRole = null;
        logoutBtn.classList.add('hidden');
        userInfo.textContent = '';
        updateUIForRole(null);
        showLoginForm();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

export function showLoginForm() {
    sidebar.classList.add('blurred');
    mainContent.innerHTML = `
        <div class="min-h-screen flex items-center justify-center -m-10">
            <div class="max-w-md w-full space-y-8 p-8 bg-surface rounded-lg shadow">
                <div>
                    <h2 class="text-center text-3xl font-extrabold text-color-default">Sign in to QRix</h2>
                </div>
                <form id="loginForm" class="mt-8 space-y-6">
                    <div class="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label for="username" class="sr-only">Username</label>
                            <input id="username" name="username" type="text" required autocomplete="username"
                                class="appearance-none rounded-none relative block w-full px-3 py-2 form-input rounded-t-md focus:z-10 sm:text-sm"
                                placeholder="Username">
                        </div>
                        <div>
                            <label for="password" class="sr-only">Password</label>
                            <input id="password" name="password" type="password" required autocomplete="current-password"
                                class="appearance-none rounded-none relative block w-full px-3 py-2 form-input rounded-b-md focus:z-10 sm:text-sm"
                                placeholder="Password">
                        </div>
                    </div>
                    <div>
                        <button type="submit"
                            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        
        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password: document.getElementById('password').value })
            });

            if (!response.ok) throw new Error('Invalid credentials');
            
            const data = await response.json();
            isAuthenticated = true;
            userRole = data.user.role;
            sidebar.classList.remove('blurred');
            logoutBtn.classList.remove('hidden');
            userInfo.textContent = `Logged in as: ${username} (${userRole})`;
            updateUIForRole(userRole);
            onLoginSuccess(); // Trigger navigation callback
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    });
}

export function initAuth(loginSuccessCallback) {
    onLoginSuccess = loginSuccessCallback;
    logoutBtn.addEventListener('click', handleLogout);
    showLoginForm(); // Show login form by default
}

export const checkAuth = () => isAuthenticated;
export const getUserRole = () => userRole;