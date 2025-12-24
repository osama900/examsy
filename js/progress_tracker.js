
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

    const db = firebase.firestore();

    try {
        // 1. Fetch Study Activity (Time based)
        const activitySnapshot = await db.collection('std_id').doc(stdId).collection('study_activity').get();
        const activityMap = {};
        activitySnapshot.forEach(doc => {
            activityMap[doc.id] = doc.data();
        });

        // 2. Fetch Exam Results (Score based)
        // Specific logic for quizzes like 7-3-1-1
        // We query examResults where name == stdName
        let examMap = {};
        if (stdName) {
            try {
                // Fetch all exams for this student
                const examsSnapshot = await db.collection('examResults')
                    .where('name', '==', stdName)
                    .get();

                examsSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.testName) {
                        // Initialize if not exists
                        // We store the object: { score, maxScore }
                        // We want to keep the HIGHEST score.
                        if (!examMap[data.testName]) {
                            examMap[data.testName] = { score: data.score, maxScore: data.maxScore };
                        } else {
                            if (data.score > examMap[data.testName].score) {
                                examMap[data.testName] = { score: data.score, maxScore: data.maxScore };
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
            const pageId = element.getAttribute('data-page-id');
            const studyData = activityMap[pageId];

            // Default state: Red X (No data or invalid)
            let icon = "❌";
            let color = "red";
            let title = "Not completed";

            // Special handling for Quiz 7-3-1-1 based on EXAM RESULTS
            // The testName in DB is likely "7-3-1-1" based on page title.
            // We can also try looser matching if needed, but strict is safer if titles match.
            // Or fallback to checking specific ID.
            if (pageId === "7-3-1-1") {
                const examResult = examMap[pageId]; // Try exact match first (Title == ID)

                if (examResult) {
                    const score = examResult.score || 0;
                    const maxScore = examResult.maxScore || 1; // Prevent div by zero

                    // Logic:
                    // Green: Score is Full Mark or Full Mark - 1
                    // Orange: Score is passing (>= 50%) but less than Green threshold
                    // Red: Failing (< 50%)

                    const greenThreshold = maxScore - 1;
                    const passingScore = maxScore / 2;

                    if (score >= greenThreshold) {
                        icon = "✅";
                        color = "green";
                        title = `ممتاز! العلامة: ${score}/${maxScore}`;
                    } else if (score >= passingScore) {
                        icon = "⚠️"; // Orange Triangle
                        color = "orange";
                        title = `ناجح. العلامة: ${score}/${maxScore}`;
                    } else {
                        // Fail
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
                // Standard Time Logic for other pages
                if (studyData) {
                    const sessionTime = studyData.sessionTimeSeconds || 0;
                    const targetTime = studyData.targetTimeSeconds || 30;

                    if (sessionTime >= targetTime) {
                        icon = "✅";
                        color = "green";
                    } else if (sessionTime >= (targetTime - 5)) {
                        icon = "⚠️"; // Orange Triangle
                        color = "orange";
                    } else {
                        icon = "❌";
                        color = "red";
                    }
                    title = `Time: ${sessionTime}s / ${targetTime}s`;
                }
            }

            // Create Icon Element
            const indicator = document.createElement('span');
            indicator.textContent = icon;
            indicator.style.marginLeft = "10px"; // Adjust for RTL
            indicator.style.marginRight = "80px"; // Adjust for LTR logic if needed, but page is RTL
            indicator.style.color = color;
            indicator.style.fontSize = "1.2rem";
            indicator.title = title;

            element.appendChild(indicator);

            if (window.getComputedStyle(element).display !== 'flex') {
                element.style.display = 'flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'space-between';
            }
        });

    } catch (error) {
        console.error("Progress Tracker: Error fetching data:", error);
    }
});
