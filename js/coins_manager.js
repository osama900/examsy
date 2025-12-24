/**
 * Coins Manager - Examsy
 * Handles awarding coins, checking daily bonus, and Firestore synchronization.
 */

(async function () {
    const COINS_CONFIG = {
        DAILY_LOGIN: 5,
        STUDY_TIME_UNIT: 5 * 60, // 5 minutes
        COINS_PER_STUDY_UNIT: 1,
        ACTIVITY_COMPLETION: 10,
        QUIZ_FULL_SCORE: 50
    };

    const firebaseConfig = {
        apiKey: "AIzaSyAiJVhRbPOR0ty2Zaoyu4FQj9U4_rpnCf8",
        authDomain: "examsy-21dc3.firebaseapp.com",
        projectId: "examsy-21dc3",
        storageBucket: "examsy-21dc3.firebasestorage.app",
        messagingSenderId: "357464025229",
        appId: "1:357464025229:web:b920c8290f985f54339ac4",
        measurementId: "G-CWZ7MR4V26"
    };

    class CoinsManager {
        constructor() {
            this.stdId = localStorage.getItem('std_id');
            this.coins = parseInt(localStorage.getItem('std_coins') || '0');
            this.db = null;
            this.initialized = false;
        }

        async init() {
            if (!this.stdId) return;

            // 1. Ensure Firebase is ready
            await this.ensureFirebase();
            this.db = firebase.firestore();

            // 2. Load current coins from Firestore (Sync with server)
            try {
                const doc = await this.db.collection('std_id').doc(this.stdId).get();
                if (doc.exists) {
                    const serverCoins = doc.data().coins || 0;
                    if (serverCoins !== this.coins) {
                        this.coins = serverCoins;
                        localStorage.setItem('std_coins', this.coins);
                        this.updateUI();
                    }
                    await this.checkDailyLogin(doc.data().last_login_date);
                } else {
                    // New user or no record
                    await this.db.collection('std_id').doc(this.stdId).set({ coins: this.coins }, { merge: true });
                }
            } catch (e) {
                console.warn("CoinsManager: Firestore sync error", e);
            }

            this.initialized = true;
            this.updateUI();

            // 3. Process pending toasts from previous pages
            this.processPendingToasts();

            console.log("CoinsManager: Initialized with", this.coins, "coins.");
        }

        processPendingToasts() {
            try {
                const pending = JSON.parse(localStorage.getItem('coin_toast_queue') || '[]');
                if (pending.length > 0) {
                    localStorage.setItem('coin_toast_queue', '[]'); // Clear immediately
                    pending.forEach((msg, index) => {
                        // Delay multiple toasts so they don't overlap too much
                        setTimeout(() => this.showToast(msg, false), index * 1000);
                    });
                }
            } catch (e) { console.error("Error processing toasts", e); }
        }

        async ensureFirebase() {
            if (typeof firebase === 'undefined') {
                await this.loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
            }
            if (typeof firebase.firestore === 'undefined') {
                await this.loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
            }
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
        }

        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        async checkDailyLogin(lastLoginTimestamp) {
            // Check session storage first to avoid duplicate checks in same session
            if (sessionStorage.getItem('daily_login_checked')) {
                return;
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

            let lastLogin = 0;
            if (lastLoginTimestamp) {
                const d = (typeof lastLoginTimestamp.toDate === 'function') ? lastLoginTimestamp.toDate() : new Date(lastLoginTimestamp);
                lastLogin = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            }

            if (today > lastLogin) {
                console.log("CoinsManager: Awarding daily login bonus.");
                // Set flag BEFORE awaiting to prevent race conditions
                sessionStorage.setItem('daily_login_checked', 'true');

                await this.addCoins(COINS_CONFIG.DAILY_LOGIN, "مكافأة الدخول اليومي");
                this.db.collection('std_id').doc(this.stdId).update({
                    last_login_date: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(e => {
                    console.error("Error updating login date", e);
                    // If update failed, maybe clear flag? No, safer to just try next time.
                });
            } else {
                // Already logged in today
                sessionStorage.setItem('daily_login_checked', 'true');
            }
        }

        async addCoins(amount, reason = "") {
            if (!this.stdId) return;

            // Optimistic update
            this.coins += amount;
            localStorage.setItem('std_coins', this.coins);
            this.updateUI();

            // Queue toast for this page or next
            const message = `+${amount} كوينز! (${reason})`;
            this.showToast(message, true);

            // Background update to Firestore
            if (this.db) {
                this.db.collection('std_id').doc(this.stdId).set({ coins: this.coins }, { merge: true })
                    .catch(e => console.error("CoinsManager: DB Update failed", e));

                // Log transaction
                this.db.collection('std_id').doc(this.stdId).collection('coin_transactions').add({
                    amount: amount,
                    reason: reason,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(e => console.error("CoinsManager: Transaction logging failed", e));
            }
        }

        updateUI() {
            const coinDisplays = document.querySelectorAll('#user-coins-count');
            coinDisplays.forEach(display => {
                display.textContent = this.coins;
                display.classList.add('coin-pop');
                setTimeout(() => display.classList.remove('coin-pop'), 400);
            });
        }

        showToast(message, persistent = false) {
            if (persistent) {
                // Add to queue in case page changes
                try {
                    const queue = JSON.parse(localStorage.getItem('coin_toast_queue') || '[]');
                    queue.push(message);
                    localStorage.setItem('coin_toast_queue', JSON.stringify(queue));

                    // If we stay on page, we'll remove it when toast finishes, 
                    // but for now let's just show it.
                } catch (e) { }
            }

            let toastContainer = document.getElementById('coin-toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'coin-toast-container';
                toastContainer.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(toastContainer);
            }

            const toast = document.createElement('div');
            toast.className = 'coin-toast';
            toast.style.cssText = `
                background: linear-gradient(135deg, #f39c12, #d35400);
                color: white;
                padding: 12px 24px;
                border-radius: 50px;
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 12px;
                direction: rtl;
                font-weight: bold;
                animation: coinSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                font-family: sans-serif;
            `;
            toast.innerHTML = `
                <span style="font-size: 24px;">🪙</span>
                <span>${message}</span>
            `;
            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'coinSlideOut 0.5s ease-in forwards';
                setTimeout(() => {
                    toast.remove();
                    // Clean up from queue if it was persistent
                    if (persistent) {
                        try {
                            const queue = JSON.parse(localStorage.getItem('coin_toast_queue') || '[]');
                            const index = queue.indexOf(message);
                            if (index > -1) {
                                queue.splice(index, 1);
                                localStorage.setItem('coin_toast_queue', JSON.stringify(queue));
                            }
                        } catch (e) { }
                    }
                }, 500);
            }, 4000);
        }
    }

    // Initialize Global
    window.coinsManager = new CoinsManager();

    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes coinSlideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes coinSlideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(120%); opacity: 0; }
        }
        @keyframes coinPop {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); color: #f1c40f; text-shadow: 0 0 10px rgba(241, 196, 15, 0.5); }
            100% { transform: scale(1); }
        }
        .coin-pop {
            display: inline-block;
            animation: coinPop 0.4s ease-out;
        }
        .coin-icon-header {
            font-size: 1.2rem;
            margin-left: 5px;
            animation: coinSpin 3s linear infinite;
            display: inline-block;
        }
        @keyframes coinSpin {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.coinsManager.initialized) {
                window.coinsManager.init();
            }
        });
    } else {
        if (!window.coinsManager.initialized) {
            window.coinsManager.init();
        }
    }
})();
