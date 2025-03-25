// scripts/presence.js
const presenceRef = firebase.database().ref('presence'); // Use firebase.database() directly
const onlineCount = document.querySelector('#online-counter');

function setupPresence(userId) {
    if (!userId) {
        console.log('No user ID for presence');
        if (onlineCount) onlineCount.textContent = '0 online';
        return;
    }

    const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
    if (!userData.username) {
        console.log('No username in sessionStorage, skipping presence for:', userId);
        return; // Skip if no valid username
    }

    console.log('Setting up presence for user:', userId);
    const myPresenceRef = presenceRef.child(userId);
    const connectedRef = firebase.database().ref('.info/connected'); // Fix: Use firebase.database()

    connectedRef.on('value', (snap) => {
        console.log('Connected status:', snap.val());
        if (snap.val() === true) {
            const presenceData = {
                last_seen: firebase.database.ServerValue.TIMESTAMP,
                username: userData.username
            };
            console.log('Attempting to set presence:', presenceData);
            myPresenceRef.set(presenceData)
                .then(() => console.log(`Presence set for ${userId}`))
                .catch((err) => console.error('Presence set error:', err.message));
            myPresenceRef.onDisconnect().remove()
                .catch((err) => console.error('OnDisconnect error:', err.message));
        } else {
            console.log('Disconnected from Firebase');
        }
    });

    presenceRef.on('value', (snap) => {
        console.log('Presence snapshot received:', snap.val());
        const users = snap.val() || {};
        const now = Date.now();
        const activeUsers = Object.entries(users).filter(([_, data]) => {
            return now - data.last_seen < 5 * 60 * 1000; // 5 minutes
        }).length;
        console.log('Calculated active users:', activeUsers);
        if (onlineCount) {
            onlineCount.textContent = `${activeUsers} online`;
            console.log('Online count updated to:', activeUsers);
        } else {
            console.error('onlineCount element not found in DOM');
        }
    }, (error) => {
        console.error('Presence listener error:', error.message);
    });
}

firebase.auth().onAuthStateChanged((user) => {
    const userId = user ? user.uid : null;
    console.log('Auth state changed, userId:', userId);
    setupPresence(userId);
});