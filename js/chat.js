const chatRef = firebase.database().ref('chat');
const HALF_HOUR = 6 * 60 * 60 * 1000; // 6 hours now
const MAX_MESSAGES = 15;
const messagesList = document.querySelector('.messages');
const messageInput = document.querySelector('.write_msg');
const sendButton = document.querySelector('.msg_send_btn');

let currentUserId = null;
let username = null;

function sanitizeInput(input) {
    return input
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '');
}

function setupChat() {
    console.log('Setting up chat');
    chatRef.on('value', (snapshot) => {
        console.log('Chat data updated:', snapshot.val());
        const messages = snapshot.val() || {};
        const messageArray = Object.entries(messages)
            .map(([msgId, msg]) => ({ msgId, ...msg }))
            .filter(msg => Date.now() - msg.timestamp <= HALF_HOUR)
            .sort((a, b) => a.timestamp - b.timestamp); // Oldest first
        messagesList.innerHTML = '';
        messageArray.slice(-MAX_MESSAGES).forEach(({ msgId, ...msg }) => {
            renderMessage(msgId, msg);
        });
        messagesList.scrollTop = messagesList.scrollHeight;
    });
    setInterval(() => {
        console.log('Running periodic cleanup');
        enforceRules();
    }, 5 * 60 * 1000); // Every 5 minutes
}

firebase.auth().onAuthStateChanged((user) => {
    console.log('Chat auth state changed:', user ? user.uid : 'No user');
    if (user) {
        currentUserId = user.uid;
        $.get('scripts/server/check_login.php')
            .done((data) => {
                console.log('Chat login check:', data);
                if (data.loggedIn) {
                    username = data.username;
                } else {
                    currentUserId = null;
                    username = null;
                }
            })
            .fail((xhr) => {
                console.error('Chat login check failed:', xhr.responseText);
                currentUserId = null;
                username = null;
            });
    } else {
        currentUserId = null;
        username = null;
    }
    messageInput.disabled = false;
    messageInput.placeholder = 'Type a message';
});

async function sendMessage() {
    let messageText = messageInput.value.trim();
    if (!messageText) return;

    if (!currentUserId || !username) {
        alertUser('You need to sign in to send messages');
        return;
    }

    const maxMessageLength = 200;
    messageText = sanitizeInput(messageText);
    if (messageText.length > maxMessageLength) {
        alertUser(`Message must be ${maxMessageLength} characters or less`);
        return;
    }

    try {
        await chatRef.push({
            message: messageText,
            timestamp: Date.now(),
            user_id: currentUserId,
            username: username
        });
        console.log('Message sent:', messageText);
        messageInput.value = '';
        enforceRules(); // Enforce rules immediately after sending
    } catch (error) {
        console.error('Error sending message:', error);
        alertUser('Failed to send message');
    }
}

function alertUser(text) {
    console.log('Showing alert:', text);
    const alert = document.createElement('div');
    alert.className = 'login-alert text-center text-muted p-2';
    alert.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    alert.textContent = text;
    const chatBox = document.querySelector('#chat-box');
    if (chatBox) chatBox.insertBefore(alert, messagesList);
    setTimeout(() => alert.remove(), 2000);
}

function renderMessage(msgId, msg) {
    if (messagesList.querySelector(`[data-msg-id="${msgId}"]`)) {
        console.log('Skipping duplicate message:', msgId);
        return;
    }

    const li = document.createElement('li');
    li.className = 'card mb-2';
    li.dataset.msgId = msgId;
    li.dataset.timestamp = msg.timestamp;
    li.dataset.userId = msg.user_id;
    li.setAttribute('data-bs-toggle', 'modal');
    li.setAttribute('data-bs-target', '#chatModal');

    const safeMessage = sanitizeInput(msg.message);
    const safeUsername = sanitizeInput(msg.username).substring(0, 20);

    li.innerHTML = `
        <div class="card-body p-2">
            <div class="d-flex align-items-center mb-1">
                <img src="pfps/default.webp" class="rounded-circle me-2" alt="pfp" width="32" height="32">
                <span class="username fw-bold me-2">${safeUsername}</span>
                <small class="text-muted">${new Date(msg.timestamp).toLocaleTimeString()}</small>
            </div>
            <p class="card-text mb-0">${safeMessage}</p>
        </div>
    `;

    messagesList.appendChild(li);
    console.log('Rendered message:', msgId);

    $.get(`scripts/server/get_pfp_url.php?uid=${msg.user_id}`)
        .done((data) => {
            const basePfpUrl = data.success ? data.pfp_url : 'pfps/default.webp';
            const pfpUrl = `${basePfpUrl}?v=${Date.now()}`; // Append timestamp to bypass cache
            const img = li.querySelector('img');
            if (img) img.src = pfpUrl;
        })
        .fail((xhr) => {
            console.error('PFP fetch failed for', msg.user_id, ':', xhr.responseText);
        });
}

function enforceRules() {
    chatRef.once('value', (snapshot) => {
        const messages = snapshot.val() || {};
        const now = Date.now();
        const messageArray = Object.entries(messages)
            .map(([msgId, msg]) => ({ msgId, ...msg }))
            .sort((a, b) => a.timestamp - b.timestamp); // Oldest first

        // old messages check
        const expired = messageArray.filter(msg => now - msg.timestamp > HALF_HOUR);
        
        // remove expired, check if remaining exceed 15
        const remaining = messageArray.filter(msg => now - msg.timestamp <= HALF_HOUR);
        const excess = remaining.length > MAX_MESSAGES ? remaining.slice(0, remaining.length - MAX_MESSAGES) : [];

        // delete
        const toDelete = [...expired, ...excess];
        if (toDelete.length > 0) {
            const updates = {};
            toDelete.forEach(({ msgId }) => {
                updates[msgId] = null;
            });
            chatRef.update(updates)
                .then(() => console.log(`Cleaned up ${toDelete.length} messages (expired: ${expired.length}, excess: ${excess.length})`))
                .catch((error) => console.error('Cleanup failed:', error));
        } else {
            console.log('No messages to clean up');
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    console.log('Chat DOM loaded');
    setupChat();

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    } else {
        console.warn('Send button not found');
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    } else {
        console.warn('Message input not found');
    }

    messagesList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;

        const userId = li.dataset.userId;
        if (!userId) return;

        const modal = document.querySelector('#chatModal');
        if (!modal) {
            console.warn('Chat modal not found');
            return;
        }

        const usernameSpan = modal.querySelector('.modal-title span');
        const userIdP = modal.querySelector('.row:nth-child(1) .col-md-6:nth-child(1) p');
        const joinDateP = modal.querySelector('.row:nth-child(1) .col-md-6:nth-child(2) p');
        const gamesPlayedP = modal.querySelector('.row:nth-child(2) .col-md-6:nth-child(1) p');

        const username = li.querySelector('.username').textContent;
        usernameSpan.textContent = username;
        userIdP.textContent = userId;

        if (userId === currentUserId) {
            $.get('scripts/server/check_login.php')
                .done((data) => {
                    if (data.loggedIn) {
                        joinDateP.textContent = data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A';
                        gamesPlayedP.textContent = data.total_games_played || '0';
                    } else {
                        joinDateP.textContent = 'N/A';
                        gamesPlayedP.textContent = 'N/A';
                    }
                })
                .fail((xhr) => {
                    console.error('Fetch error for current user:', xhr.responseText);
                    joinDateP.textContent = 'N/A';
                    gamesPlayedP.textContent = 'N/A';
                });
        } else {
            $.get(`scripts/server/check_login.php?uid=${userId}`)
                .done((data) => {
                    if (data.loggedIn) {
                        joinDateP.textContent = data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A';
                        gamesPlayedP.textContent = data.total_games_played || '0';
                    } else {
                        joinDateP.textContent = 'N/A';
                        gamesPlayedP.textContent = 'N/A';
                    }
                })
                .fail((xhr) => {
                    console.error('Fetch error for user:', xhr.responseText);
                    joinDateP.textContent = 'N/A';
                    gamesPlayedP.textContent = 'N/A';
                });
        }
    });

    const sidebarToggleBtn = document.querySelector('.navbar .btn i.bi-caret-left-fill')?.parentElement;
    const sidebar = document.querySelector('.sidebar');
    const chatToggleBtn = document.querySelector('#chat .chat-header .btn i.bi-caret-right-fill')?.parentElement;
    const chat = document.querySelector('#chat');
    const chatReopenBtn = document.querySelector('#chat-toggle-btn');

    if (window.innerWidth >= 992) {
        chat?.classList.remove('closed');
    } else if (window.innerWidth >= 768 && window.innerWidth < 992) {
        chat?.classList.add('closed');
    }

    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => sidebar.classList.toggle('closed'));
    } else {
        console.warn('Sidebar toggle setup failed');
    }

    if (chatToggleBtn && chat) {
        chatToggleBtn.addEventListener('click', () => chat.classList.toggle('closed'));
    } else {
        console.warn('Chat toggle setup failed');
    }

    if (chatReopenBtn && chat) {
        chatReopenBtn.addEventListener('click', () => chat.classList.remove('closed'));
    } else {
        console.warn('Chat reopen setup failed');
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth < 768 && chatReopenBtn) {
            chatReopenBtn.style.display = 'none';
        }
    });

    messageInput.disabled = false;
    messageInput.placeholder = 'Type a message';
});