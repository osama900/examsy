// Time Tracker Script
// This script tracks the time a user spends on the page and updates Firebase.
// AUTOMATICALLY LOADS FIREBASE SDKs if not present.

(async function () {
    console.log("Time Tracker: Initializing...");

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
        console.log("Time Tracker: Loading Firebase SDKs...");
        try {
            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js");
            firebase.initializeApp(firebaseConfig);
            console.log("Time Tracker: Firebase loaded and initialized.");
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

    const db = firebase.firestore();

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

    // Timer Display (Optional - for debugging/visual confirmation)
    // You can comment this out if you don't want it visible
    const timerDisplay = document.createElement('div');
    timerDisplay.style.position = 'fixed';
    timerDisplay.style.bottom = '10px';
    timerDisplay.style.left = '10px';
    timerDisplay.style.background = 'rgba(0, 0, 0, 0.7)';
    timerDisplay.style.color = 'white';
    timerDisplay.style.padding = '5px 10px';
    timerDisplay.style.borderRadius = '5px';
    timerDisplay.style.fontSize = '12px';
    timerDisplay.style.zIndex = '9999';
    timerDisplay.style.pointerEvents = 'none';
    timerDisplay.innerText = "Time: 0s";
    document.body.appendChild(timerDisplay);

    setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        timerDisplay.innerText = `Time: ${diff}s`;
    }, 1000);

    // 3. Saving Logic
    const saveTime = async () => {
        const now = Date.now();
        const sessionDuration = Math.floor((now - startTime) / 1000);

        if (sessionDuration <= 0) return;

        try {
            // Using same collection reference logic
            const studentRef = db.collection('std_id').doc(stdId);
            const activityRef = studentRef.collection('study_activity').doc(PAGE_TIME_CONFIG.pageId);

            // Strategy: Periodic Overwrite
            await activityRef.set({
                pageId: PAGE_TIME_CONFIG.pageId,
                sessionTimeSeconds: sessionDuration,
                lastVisited: firebase.firestore.FieldValue.serverTimestamp(),
                targetTimeSeconds: PAGE_TIME_CONFIG.targetTimeSeconds || 0
            }, { merge: true });

            console.log(`Time Tracker: Saved ${sessionDuration}s successfully.`);
        } catch (error) {
            console.error("Time Tracker: Error saving time:", error);
        }
    };

    // Strategy: Periodic Overwrite (Robust "Save on Exit")
    setInterval(saveTime, 5000);

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

})();
