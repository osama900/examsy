
// Progress Tracker Script
// Fetches student activity from Firestore and updates elements with data-page-id attributes.

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Progress Tracker: Initializing...");

    const stdId = localStorage.getItem('std_id');
    const stdName = localStorage.getItem('std_name'); // Get name for exam lookup

    if (!stdId) {
        console.warn("Progress Tracker: No student ID found. Progress will not be shown.");
        return;
    }

    if (typeof firebase === 'undefined') {
        console.error("Progress Tracker: Firebase SDK not found.");
        return;
    }

    // Initialize logic AFTER Auth is ready
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            console.log("Progress Tracker: Waiting for login...");
            return;
        }

        const db = firebase.firestore();

        try {
            // 1. Fetch Study Activity (Time based) & Centralized Timers
            const [activitySnapshot, timersDoc] = await Promise.all([
                db.collection('std_id').doc(stdId).collection('study_activity').get(),
                db.collection('settings').doc('lesson_timers').get()
            ]);

            const activityMap = {};
            activitySnapshot.forEach(doc => {
                activityMap[doc.id] = doc.data();
            });

            const timerMap = timersDoc.exists ? timersDoc.data() : {};

            // 2. Fetch Exam Results (Score based)
            let examMap = {};
            if (user.email) {
                try {
                    // Fetch all exams for this student by EMAIL
                    const examsSnapshot = await db.collection('examResults')
                        .where('studentEmail', '==', user.email)
                        .get();

                    examsSnapshot.forEach(doc => {
                        const data = doc.data();

                        // We map by 'testName' (e.g., "7-3-1-1")
                        // Ensure your quiz page title starts with the ID!
                        if (data.testName) {
                            const tName = data.testName.trim();
                            if (!examMap[tName]) {
                                examMap[tName] = { score: data.score, maxScore: data.maxScore };
                            } else {
                                if (data.score > examMap[tName].score) {
                                    examMap[tName] = { score: data.score, maxScore: data.maxScore };
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error("Error fetching exams:", e);
                }
            }

            // Find all elements that need progress indicators
            const lessonElements = document.querySelectorAll('[data-page-id]');

            lessonElements.forEach(element => {
                const pageId = element.getAttribute('data-page-id'); // e.g., "7-4-3-1"
                const studyData = activityMap[pageId];

                // Determine if this is a Quiz or a Time-based activity
                // Heuristic: If pageId ends with '-1' (common for quizzes here) OR we have an exam result for it.
                // Better: Check if we have an exam result match first.

                let isQuiz = false;
                // Check if pageId looks like a quiz ID (often pure numbers/dashes or ends in -1)
                // Or if we found a result for it.
                if (examMap[pageId]) {
                    isQuiz = true;
                } else if (element.href && element.href.includes("1.html")) {
                    // Fallback heuristic: file ending in "1.html" is usually a quiz
                    isQuiz = true;
                }

                // Default state: Red X
                let icon = "❌";
                let color = "red";
                let title = "Not completed";

                if (isQuiz) {
                    const examResult = examMap[pageId];

                    if (examResult) {
                        const score = examResult.score || 0;
                        const maxScore = examResult.maxScore || 1;

                        const greenThreshold = maxScore - 1;
                        const passingScore = maxScore / 2;

                        if (score >= greenThreshold) {
                            icon = "✅";
                            color = "green";
                            title = `ممتاز! العلامة: ${score}/${maxScore}`;
                        } else if (score >= passingScore) {
                            icon = "⚠️";
                            color = "orange";
                            title = `ناجح. العلامة: ${score}/${maxScore}`;
                        } else {
                            icon = "❌";
                            color = "red";
                            title = `حاول مرة أخرى. العلامة: ${score}/${maxScore}`;
                        }
                    } else {
                        // Not taken
                        icon = "❌";
                        color = "red";
                        title = "لم يتم تقديم الاختبار بعد";
                    }

                } else {
                    // Standard Time Logic
                    const sessionTime = studyData ? (studyData.sessionTimeSeconds || 0) : 0;

                    // Determine Target Time
                    // 1. Centralized Settings (Minutes -> Seconds)
                    // 2. Stored Target (Seconds)
                    // 3. Default (30s)
                    let targetTime = 30;
                    if (timerMap[pageId]) {
                        targetTime = timerMap[pageId] * 60;
                    } else if (studyData && studyData.targetTimeSeconds) {
                        targetTime = studyData.targetTimeSeconds;
                    }

                    console.log(`Debug Tracker: Checking ${pageId} -> Spent: ${sessionTime}s / Target: ${targetTime}s (Found in Settings: ${!!timerMap[pageId]})`);

                    if (sessionTime >= targetTime) {
                        icon = "✅";
                        color = "green";
                    } else if (sessionTime >= (targetTime - 5)) {
                        icon = "⚠️";
                        color = "orange";
                    } else {
                        icon = "❌";
                        color = "red";
                    }
                    title = `Time: ${sessionTime}s / ${targetTime}s`;
                }

                // Create Icon Element
                // Check if icon already exists to avoid duplicates on re-runs
                if (element.querySelector('.status-icon')) return;

                const indicator = document.createElement('span');
                indicator.className = 'status-icon';
                indicator.textContent = icon;
                indicator.title = title;

                element.appendChild(indicator);
            });

        } catch (error) {
            console.error("Progress Tracker: Error fetching data:", error);
        }
    });
});
