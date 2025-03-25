const firebaseConfig = {
    apiKey: "AIzaSyB3qxbdlQybj7atz4JDG7G4XUtGWQaMmKQ",
    authDomain: "bloxlucky-b5637.firebaseapp.com",
    databaseURL: "https://bloxlucky-b5637-default-rtdb.firebaseio.com",
    projectId: "bloxlucky-b5637",
    storageBucket: "bloxlucky-b5637.appspot.com",
    messagingSenderId: "526685690012",
    appId: "1:526685690012:web:74587047cd891a442af559",
    measurementId: "G-Y2929MVP44"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized');
} catch (error) {
    console.error('Firebase init failed:', error);
}

const loginBtn = document.querySelector('.navbar .btn-secondary[data-bs-target="#loginModel"]');
const signupBtn = document.querySelector('.navbar .btn-primary[data-bs-target="#signupModel"]');
const logoutBtn = document.getElementById('logoutbtn');
const dashboardBtn = document.querySelector('.navbar a.btn[href="dashboard.html"]');
const balanceSpan = document.getElementById('navbar-balance');
const profileImg = document.getElementById('navbar-pfp');

const dashboardElements = {
    welcome: document.getElementById('dashboard-welcome'),
    balance: document.getElementById('dashboard-balance'),
    userId: document.getElementById('dashboard-user-id'),
    email: document.getElementById('dashboard-email'),
    joinDate: document.getElementById('dashboard-join-date'),
    gamesPlayed: document.getElementById('dashboard-games-played'),
    level: document.getElementById('dashboard-level'),
    pfp: document.getElementById('dashboard-pfp'),
    updateUsername: document.getElementById('dashboard-update-username'),
    mobileUserId: document.getElementById('mobile-dashboard-user-id'),
    mobileEmail: document.getElementById('mobile-dashboard-email'),
    mobileGamesPlayed: document.getElementById('mobile-dashboard-games-played'),
    mobileJoinDate: document.getElementById('mobile-dashboard-join-date')
};

const pfpInput = document.getElementById('pfpInput');
const accountForm = document.querySelector('.account-update-form');

let currentUser = null;

// update element content and remove placeholders
function updateElement(element, value, isSrc = false) {
    if (element) {
        if (isSrc) {
            element.src = value;
            element.onerror = () => element.src = 'pfps/default.webp';
        } else {
            element.textContent = value;
        }
        element.classList.remove('placeholder', 'placeholder-glow');
        console.log(`Set ${element.id} to:`, value);
    } else {
        console.error(`${element?.id || 'Element'} not found`);
    }
}

function updateUI(data) {
    console.log('updateUI called with:', data);
    const timestamp = new Date().getTime();
    const pfpUrl = data.loggedIn ? `pfps/userpfp/${data.uid}.webp?v=${timestamp}` : 'pfps/default.webp';
    const dropdownContainer = document.querySelector('.dropdown-container');

    if (data.loggedIn) {
        console.log('Logged in, updating navbar');
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        dashboardBtn.style.display = 'block';
        dropdownContainer.style.display = 'block';
        updateElement(balanceSpan, data.balance.toFixed(2));
        updateElement(profileImg, pfpUrl, true);

        const isDashboard = window.location.pathname === '/dashboard' || window.location.href.includes('dashboard.html');
        console.log('Current URL:', window.location.href);
        console.log('Pathname:', window.location.pathname);
        console.log('Is dashboard page?', isDashboard);

        if (isDashboard) {
            console.log('Checking dashboard elements');
            const dashboardData = {
                welcome: `Welcome back, ${data.username}`,
                balance: data.balance.toFixed(2),
                userId: data.uid,
                email: data.email,
                joinDate: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A',
                gamesPlayed: data.total_games_played || 0,
                level: data.account_level || 1,
                pfp: pfpUrl,
                updateUsername: data.username,
                mobileUserId: data.uid,
                mobileEmail: data.email,
                mobileGamesPlayed: data.total_games_played || 0,
                mobileJoinDate: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'
            };

            // Update dashboard
            Object.entries(dashboardData).forEach(([key, value]) => {
                const element = dashboardElements[key];
                if (key === 'pfp') {
                    updateElement(element, value, true);
                } else if (key === 'updateUsername') {
                    if (element) element.placeholder = value;
                } else {
                    updateElement(element, value);
                }
            });
        }
    } else {
        console.log('Not logged in, resetting navbar');
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'block';
        dashboardBtn.style.display = 'none';
        dropdownContainer.style.display = 'none';
        updateElement(balanceSpan, '0.00');
        updateElement(profileImg, 'pfps/default.webp', true);
    }

    console.log('Repainting navbar');
    const navbar = document.querySelector('.navbar');
    navbar.style.display = 'none';
    navbar.offsetHeight;
    navbar.style.display = '';
}

function fetchUserData(refresh = false) {
    return new Promise((resolve, reject) => {
        const url = refresh ? 'scripts/server/check_login.php?refresh=true' : 'scripts/server/check_login.php';
        console.log('Fetching from:', url);
        $.get(url)
            .done((data) => {
                console.log('Fetch success:', data);
                updateUI(data);
                if (data.loggedIn) {
                    sessionStorage.setItem('user_data', JSON.stringify({
                        uid: data.uid,
                        username: data.username,
                        email: data.email,
                        balance: data.balance,
                        created_at: data.created_at,
                        last_login: data.last_login,
                        account_level: data.account_level,
                        total_games_played: data.total_games_played
                    }));
                    console.log('Stored user_data in session');
                } else {
                    sessionStorage.removeItem('user_data');
                    console.log('Cleared session storage');
                }
                if (!data.loggedIn && window.location.href.includes('dashboard.html')) {
                    console.log('Not logged in on dashboard, redirecting');
                    window.location.href = 'index.html';
                }
                resolve(data);
            })
            .fail((xhr) => {
                console.error('Fetch failed:', xhr.status, xhr.responseText);
                updateUI({ loggedIn: false });
                sessionStorage.removeItem('user_data');
                if (window.location.href.includes('dashboard.html')) {
                    console.log('Fetch failed on dashboard, redirecting');
                    window.location.href = 'index.html';
                }
                reject(xhr);
            });
    });
}

function loginWithGoogle() {
    console.log('Starting Google login');
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const idToken = result.credential?.idToken;
            console.log('Google auth success, sending to server');
            $.ajax({
                url: 'scripts/server/login.php',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ method: 'google', idToken: idToken }),
                success: (response) => {
                    console.log('Login response:', response);
                    if (response.status === 'success') {
                        $('#loginModel').modal('hide');
                        fetchUserData(true).then(() => window.location.href = 'dashboard.html');
                    } else {
                        alert('Google auth failed: ' + response.error);
                    }
                },
                error: (xhr) => alert('Google auth failed: ' + xhr.responseText)
            });
        })
        .catch((error) => alert('Google auth error: ' + error.message));
}

function signUp(method) {
    if (method === 'email') {
        alert('Email signup is not available. Please use Google to sign up.');
        return;
    }
    loginWithGoogle();
}

function login(method) {
    if (method === 'email') {
        alert('Email login is not available. Please use Google to log in.');
        return;
    }
    loginWithGoogle();
}

function logout() {
    console.log('Logout initiated');
    $.ajax({
        url: 'scripts/server/logout.php',
        type: 'POST',
        success: (response) => {
            console.log('Logout.php response:', response);
            firebase.auth().signOut()
                .then(() => {
                    console.log('Firebase signOut successful');
                    updateUI({ loggedIn: false });
                    window.location.href = 'index.html';
                })
                .catch((error) => console.error('Firebase signOut failed:', error));
        },
        error: (xhr) => {
            console.error('Logout.php failed:', xhr.responseText);
            alert('Logout failed: ' + xhr.responseText);
        }
    });
}

function dashboard() {
    window.location.href = 'dashboard.html';
}

accountForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newUsername = dashboardElements.updateUsername.value.trim(); // Fixed here
    if (!newUsername) return;

    $.ajax({
        url: 'scripts/server/update_username.php',
        type: 'POST',
        data: { username: newUsername },
        success: (response) => {
            if (response.status === 'success') {
                alert('Username updated!');
                const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
                userData.username = newUsername;
                sessionStorage.setItem('user_data', JSON.stringify(userData));
                updateUI(userData);
                fetchUserData(true);
            } else {
                alert('Update failed: ' + response.message);
            }
        },
        error: (xhr) => alert('Update failed: ' + xhr.responseText)
    });
});

pfpInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pfp', file);

    profileImg.classList.add('placeholder', 'placeholder-glow');
    profileImg.src = '';
    dashboardElements.pfp.classList.add('placeholder', 'placeholder-glow');
    dashboardElements.pfp.src = '';

    $.ajax({
        url: 'scripts/server/upload_pfp.php',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: (response) => {
            if (response.status === 'success') {
                alert('Profile picture updated!');
                const pfpUrlWithCacheBust = `${response.pfp_url}?v=${new Date().getTime()}`;
                profileImg.src = pfpUrlWithCacheBust;
                profileImg.classList.remove('placeholder', 'placeholder-glow');
                dashboardElements.pfp.src = pfpUrlWithCacheBust;
                dashboardElements.pfp.classList.remove('placeholder', 'placeholder-glow');
                const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
                userData.pfp_url = pfpUrlWithCacheBust;
                sessionStorage.setItem('user_data', JSON.stringify(userData));
                updateUI(userData);
                fetchUserData(true);
            } else {
                alert('Upload failed: ' + response.message);
                profileImg.classList.remove('placeholder', 'placeholder-glow');
                dashboardElements.pfp.classList.remove('placeholder', 'placeholder-glow');
            }
        },
        error: (xhr) => {
            alert('Upload error: ' + xhr.responseText);
            profileImg.classList.remove('placeholder', 'placeholder-glow');
            dashboardElements.pfp.classList.remove('placeholder', 'placeholder-glow');
        }
    });
});

firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    console.log('Auth state changed, user:', user ? user.uid : 'null');
    fetchUserData(true).then((data) => {
        console.log('Fetch result:', data);
        if (!data.loggedIn) {
            sessionStorage.removeItem('user_data');
            updateUI({ loggedIn: false });
            if (window.location.href.includes('dashboard.html')) {
                console.log('Not logged in on dashboard, redirecting');
                window.location.href = 'index.html';
            }
        }
    }).catch((error) => console.error('Fetch error:', error));
});

$(document).on('click', '#logoutbtn', logout);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Email login is not available. Please use Google to log in.');
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Email signup is not available. Please use Google to sign up.');
        });
    }
});