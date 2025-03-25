// scripts/live_feed.js
if (!window.liveFeedInitialized) {
    const liveFeedRef = firebase.database().ref('live_feed');
    const feedList = document.querySelector('#live-feed-list');
    const HALF_HOUR = 6 * 60 * 60 * 1000; //6 hours
    const MAX_FEED_ITEMS = 10;

    function setupLiveFeed() {
        if (!feedList) {
            console.error('Live feed list element not found');
            return;
        }

        liveFeedRef.orderByChild('timestamp').limitToLast(MAX_FEED_ITEMS).on('child_added', (snapshot) => {
            const feedId = snapshot.key;
            const feed = snapshot.val();

            const now = Date.now();
            if (now - feed.timestamp > HALF_HOUR) {
                liveFeedRef.child(feedId).remove().catch((err) => {
                    console.error('Error removing old feed:', err);
                });
                return;
            }

            const li = document.createElement('li');
            li.className = 'list-group-item shadow-sm feed text-light border-0 d-flex justify-content-between align-items-center';
            li.dataset.feedId = `feed-${feedId}`; // Unique dataset ID

            // Multiplier formatting and color logic
            const multiplierValue = feed.multiplier ? parseFloat(feed.multiplier) : 0;
            const multiplier = `${multiplierValue}x`; // Always show as "Nx"
            const multiplierClass = multiplierValue >= 1 ? 'text-success' : 'text-muted';

            li.innerHTML = `
                <span>
                    <span>${feed.username}</span> <span class="text-muted">won</span>
                    <span class="text-success fw-bold">${feed.win.toFixed(2)}</span> 
                    <img class="gem" src="icons/gem.png" alt="gem">
                    <span class="${multiplierClass}">(${multiplier})</span> in 
                    <span>${feed.game}</span>
                </span>
                <small class="text-muted ms-2">${new Date(feed.timestamp).toLocaleTimeString()}</small>
            `;
            feedList.insertBefore(li, feedList.firstChild); // Newest first

            // Trim excess items
            const items = feedList.querySelectorAll('li');
            if (items.length > MAX_FEED_ITEMS) {
                items[items.length - 1].remove();
            }
        });

        liveFeedRef.on('child_removed', (snapshot) => {
            const feedId = snapshot.key;
            const li = feedList.querySelector(`[data-feed-id="feed-${feedId}"]`);
            if (li) li.remove();
        });

        // Periodic cleanup
        setInterval(() => {
            liveFeedRef.once('value', (snapshot) => {
                const now = Date.now();
                const feeds = snapshot.val() || {};
                Object.entries(feeds).forEach(([feedId, feed]) => {
                    if (now - feed.timestamp > HALF_HOUR) {
                        liveFeedRef.child(feedId).remove().catch((err) => {
                            console.error('Error cleaning up feed:', err);
                        });
                    }
                });
            });
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    document.addEventListener('DOMContentLoaded', setupLiveFeed);
    window.liveFeedInitialized = true; // Mark as initialized
}