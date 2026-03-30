// Time Tracker Script
// This script tracks the time a user spends on the page and updates Firebase.
// AUTOMATICALLY LOADS FIREBASE SDKs if not present.

(async function () {
    // 0. Login Check (Prevent access to lessons without login)
    if (!localStorage.getItem("std_id")) {
        const path = window.location.pathname;
        // Don't redirect if already on login/reg pages (though they usually don't include this script)
        if (!path.endsWith("std_login.html") && !path.endsWith("std_reg.html")) {
            alert("يرجى تسجيل الدخول أولاً للوصول إلى هذا المحتوى");
            let redirectUrl = "std_login.html";
            if (path.includes('/page/')) {
                redirectUrl = "../../../std_login.html";
            }
            window.location.href = redirectUrl;
            return;
        }
    }



    // 1. Dynamic Firebase Loading
    const firebaseConfig = {
        apiKey: "AIzaSyAiJVhRbPOR0ty2Zaoyu4FQj9U4_rpnCf8",
        authDomain: "examsy-21dc3.firebaseapp.com",
        projectId: "examsy-21dc3",
        storageBucket: "examsy-21dc3.firebasestorage.app",
        messagingSenderId: "357464025229",
        appId: "1:357464025229:web:b920c8290f985f54339ac4",
        measurementId: "G-CWZ7MR4V26"
    };

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    if (typeof firebase === 'undefined') {

        try {
            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"); // Add Auth SDK
            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
            firebase.initializeApp(firebaseConfig);

        } catch (e) {
            console.error("Time Tracker: Failed to load Firebase SDKs", e);
            return;
        }
    } else {
        // Firebase global exists, ensure app is initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    }

    // 1.1 Load Coins Manager
    if (typeof coinsManager === 'undefined') {
        try {
            const scripts = document.getElementsByTagName('script');
            let coinsManagerUrl = "js/coins_manager.js"; // Default fallback
            for (let script of scripts) {
                if (script.src && script.src.includes('time_tracker.js')) {
                    coinsManagerUrl = script.src.replace('time_tracker.js', 'coins_manager.js');
                    break;
                }
            }
            await loadScript(coinsManagerUrl);

        } catch (e) {
            console.warn("Time Tracker: Failed to load Coins Manager", e);
        }
    }

    // Initialize Auth Listener & Start Logic
    const initTracker = async () => {
        // Double check firebase.auth exists 
        if (!firebase.auth) {

            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js");
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {

                const db = firebase.firestore();
                // ... logic continues ...
                // 1. Fetch Centralized Timer Settings
                try {
                    const timersDoc = await db.collection('settings').doc('lesson_timers').get();
                    if (timersDoc.exists) {
                        const timers = timersDoc.data();
                        // Ensure PAGE_TIME_CONFIG exists before checking
                        if (typeof PAGE_TIME_CONFIG !== 'undefined' && PAGE_TIME_CONFIG.pageId) {
                            const pageId = PAGE_TIME_CONFIG.pageId;

                            // Check if there is a custom time for this page (stored in minutes)
                            if (timers && timers[pageId] && timers[pageId] > 0) {
                                const customTimeMinutes = timers[pageId];
                                PAGE_TIME_CONFIG.targetTimeSeconds = customTimeMinutes * 60;

                            }
                        }
                    }
                } catch (e) {
                    console.error("Time Tracker: Error fetching centralized timers:", e);
                }

                // Proceed with tracker logic...
                startTracker(db);
            } else {

            }
        });
    }

    // Call init
    initTracker();

    // Encapsulate remaining logic in a function to be called after auth
    function startTracker(db) {

        // 2. Check Prerequisites
        const stdId = localStorage.getItem('std_id');

        // Check if we have the ID, if not, we can't save.
        if (!stdId && window.location.hostname !== "localhost") {
            console.error("Time Tracker: STUDENT ID IS MISSING. PLEASE LOG OUT AND LOG IN AGAIN.");
            return;
        }

        if (typeof PAGE_TIME_CONFIG === 'undefined' || !PAGE_TIME_CONFIG.pageId) {
            console.warn("Time Tracker: PAGE_TIME_CONFIG or pageId is missing. Usage: const PAGE_TIME_CONFIG = { pageId: '...' };");
            return;
        }

        let startTime = Date.now();

        let accumulatedTime = 0;
        let alreadyCompleted = false;
        let lastSavedTimestamp = Date.now();
        let initialFetchDone = false;

        // --- Inactivity Pause Logic ---
        const INACTIVITY_LIMIT_MS = 15 * 1000; // 15 seconds
        let isIdle = false;
        let inactivityTimer = null;

        // --- YouTube API Integration ---
        let activePlayers = [];
        const isVideoPlaying = () => {
            return activePlayers.some(player => {
                try {
                    return player && typeof player.getPlayerState === 'function' && player.getPlayerState() === 1; // 1 = YT.PlayerState.PLAYING
                } catch (e) {
                    return false;
                }
            });
        };

        const setupYouTubeAPI = () => {
            // Check if API already loaded
            if (!window.YT) {
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }

            window.onYouTubeIframeAPIReady = () => {
                const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
                iframes.forEach((iframe, index) => {
                    // Force enablejsapi=1
                    let src = iframe.src;
                    if (!src.includes('enablejsapi=1')) {
                        src += (src.includes('?') ? '&' : '?') + 'enablejsapi=1';
                        iframe.src = src;
                    }

                    // Assign an ID if missing
                    if (!iframe.id) iframe.id = `yt-player-${index}`;

                    const player = new YT.Player(iframe.id, {
                        events: {
                            'onStateChange': (event) => {
                                if (event.data === 1) { // PLAYING
                                    onActivity();
                                }
                            }
                        }
                    });
                    activePlayers.push(player);
                });
            };

            // If API already loaded, manually trigger scan
            if (window.YT && window.YT.Player) {
                window.onYouTubeIframeAPIReady();
            }
        };

        setupYouTubeAPI();

        function onActivity() {
            if (isIdle) {
                // Resume: reset lastSavedTimestamp so idle gap is NOT counted
                isIdle = false;
                lastSavedTimestamp = Date.now();
            }
            // Reset the inactivity countdown
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                // If a video is playing, don't go idle, just reset the activity timer
                if (isVideoPlaying()) {
                    onActivity();
                    return;
                }
                // Pause: save current delta before going idle
                saveTime();
                isIdle = true;
            }, INACTIVITY_LIMIT_MS);
        }

        // Listen to all meaningful user interactions
        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
            document.addEventListener(evt, onActivity, { passive: true });
        });

        // Start the countdown immediately on load
        onActivity();

        // Fetch initial state once
        const activityRef = db.collection('std_id').doc(stdId).collection('study_activity').doc(PAGE_TIME_CONFIG.pageId);
        activityRef.get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                accumulatedTime = data.sessionTimeSeconds || 0;
                const target = data.targetTimeSeconds || PAGE_TIME_CONFIG.targetTimeSeconds || 30;
                if (accumulatedTime >= target) {
                    alreadyCompleted = true;
                }
            }
            initialFetchDone = true;
        }).catch(err => {
            console.error("Time Tracker: Error fetching initial state", err);
            initialFetchDone = true;
        });

        // 3. Saving Logic
        const saveTime = async () => {
            if (!initialFetchDone) return;

            // Ensure we don't save 0 if target time hasn't been fetched yet/configured
            const targetToSave = PAGE_TIME_CONFIG.targetTimeSeconds || 0;
            if (targetToSave === 0 && (!window.coinsManager)) {
                // Slight heuristic: if coins manager not loaded yet, maybe we are too early? 
                // But valid target time could be 0? Unlikely for a tracked page.
            }

            // Don't count time while student is idle
            if (isIdle) return;

            const now = Date.now();
            const deltaSeconds = Math.floor((now - lastSavedTimestamp) / 1000);

            if (deltaSeconds <= 0) return;

            // Update local accumulation
            accumulatedTime += deltaSeconds;
            lastSavedTimestamp = now;

            // Session duration for coins (Study Time Reward - continues to track session time)
            const sessionDuration = Math.floor((now - startTime) / 1000);

            // Coins awarding logic (Per session milestones)
            if (window.coinsManager) {
                const COINS_PER_UNIT = 1;
                const SECONDS_PER_UNIT = 5 * 60; // 5 minutes
                const currentUnits = Math.floor(sessionDuration / SECONDS_PER_UNIT); // Still based on session duration

                if (!this.lastAwardedUnits) this.lastAwardedUnits = 0;

                if (currentUnits > this.lastAwardedUnits) {
                    const newUnits = currentUnits - this.lastAwardedUnits;
                    window.coinsManager.addCoins(newUnits * COINS_PER_UNIT, "وقت الدراسة");
                    this.lastAwardedUnits = currentUnits;
                }
            }

            try {
                // Strategy: Increment Delta
                await activityRef.set({
                    pageId: PAGE_TIME_CONFIG.pageId,
                    sessionTimeSeconds: firebase.firestore.FieldValue.increment(deltaSeconds),
                    lastVisited: firebase.firestore.FieldValue.serverTimestamp(),
                    targetTimeSeconds: PAGE_TIME_CONFIG.targetTimeSeconds || 0
                }, { merge: true });

                // Reward for completion if it just happened
                const targetTime = PAGE_TIME_CONFIG.targetTimeSeconds || 30;
                if (!alreadyCompleted && accumulatedTime >= targetTime) {
                    if (window.coinsManager) {
                        window.coinsManager.addCoins(10, "إكمال النشاط");
                    }
                    alreadyCompleted = true; // Mark as done locally to prevent double reward
                }


            } catch (error) {
                console.error("Time Tracker: Error saving time:", error);
                // If save failed, we might want to revert lastSavedTimestamp or accumulatedTime? 
                // For now, simpler to just log given it's a periodic save.
            }
        };

        // Strategy: Periodic Overwrite (Robust "Save on Exit")
        // Increased from 5s to 60s to avoid Firebase Quota Exceeded errors
        setInterval(saveTime, 60000);

        // Also try to save on exit just in case
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                saveTime();
            }
        });

        window.addEventListener('beforeunload', () => {
            saveTime();
        });

        window.saveStudyTime = saveTime;

    } // End of startTracker
})();
