
// Aggregate Progress Tracker Script
// Fetches student activity for multiple sub-pages and displays an aggregate status icon.

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Aggregate Progress: Initializing...");

    const stdId = localStorage.getItem('std_id');
    if (!stdId) {
        return;
    }

    if (typeof firebase === 'undefined') {
        console.error("Aggregate Progress: Firebase SDK not found.");
        return;
    }

    // Initialize logic AFTER Auth is ready
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;

        const db = firebase.firestore();

        try {
            // 1. Fetch Study Activity (Time based)
            // Optimization: Fetch all once instead of per-link requests
            const activitySnapshot = await db.collection('std_id').doc(stdId).collection('study_activity').get();
            const activityMap = {};
            activitySnapshot.forEach(doc => {
                activityMap[doc.id] = doc.data();
            });

            // 2. Fetch Exam Results (Score based)
            let examMap = {};
            if (user.email) {
                try {
                    const examsSnapshot = await db.collection('examResults')
                        .where('studentEmail', '==', user.email)
                        .get();

                    examsSnapshot.forEach(doc => {
                        const data = doc.data();
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
                } catch (e) { console.error("Error fetching exams:", e); }
            }

            // Find all elements that need aggregated progress indicators
            const aggregateElements = document.querySelectorAll('[data-sub-page-ids]');

            aggregateElements.forEach(element => {
                const subPageIdsString = element.getAttribute('data-sub-page-ids');
                if (!subPageIdsString) return;

                const subPageIds = subPageIdsString.split(',').map(s => s.trim());

                let anyX = false;
                let anyTriangle = false;
                let allGreen = true;
                let totalChecked = 0;

                subPageIds.forEach(pageId => {
                    // Check Activity Map
                    const activityData = activityMap[pageId];
                    // Check Exam Map
                    const examData = examMap[pageId]; // Match by exact ID/Name

                    let status = "red"; // Default

                    if (examData) {
                        // Quiz Logic
                        const score = examData.score || 0;
                        const maxScore = examData.maxScore || 1;
                        const greenThreshold = maxScore - 1;
                        const passingScore = maxScore / 2;

                        if (score >= greenThreshold) {
                            status = "green";
                        } else if (score >= passingScore) {
                            status = "orange";
                        } else {
                            status = "red";
                        }
                    } else if (activityData) {
                        // Time Logic
                        const sessionTime = activityData.sessionTimeSeconds || 0;
                        const targetTime = activityData.targetTimeSeconds || 30;

                        if (sessionTime >= targetTime) {
                            status = "green";
                        } else if (sessionTime >= (targetTime - 5)) {
                            status = "orange";
                        } else {
                            status = "red";
                        }
                    } else {
                        // Not found in either = Red
                        status = "red";
                    }

                    console.log(`Aggregate Debug: Page ${pageId} -> Status: ${status}`, { examData, activityData });



                    if (status === "red") {
                        allGreen = false;
                    } else if (status === "orange") {
                        anyTriangle = true;
                        allGreen = false;
                    }
                    totalChecked++;
                });

                // Logic:
                // 1. If any is Red (X) -> Show Red X (Highest priority for 'incomplete')
                // 2. Else if any is Orange (Triangle) -> Show Orange Triangle
                // 3. Else (meaning all must be Green) -> Show Green Check

                if (totalChecked === 0) return;

                let icon = "";
                let color = "";

                if (anyX) {
                    icon = "❌";
                    color = "red";
                } else if (anyTriangle) {
                    icon = "⚠️";
                    color = "orange";
                } else if (allGreen) {
                    icon = "✅";
                    color = "green";
                }

                // Create Wrapper to handle positioning without clipping
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-flex';
                wrapper.style.justifyContent = 'center';
                wrapper.style.alignItems = 'center';

                // Insert wrapper before the button
                element.parentNode.insertBefore(wrapper, element);
                // Move button into wrapper
                wrapper.appendChild(element);

                // Create Icon Element
                const indicator = document.createElement('div');
                indicator.className = 'status-icon';
                indicator.textContent = icon;
                indicator.style.fontSize = "1.8rem"; // Make aggregate icons slightly larger
                indicator.style.left = '-5px'; // Adjust for aggregate specific placement if needed
                indicator.style.right = 'auto';

                wrapper.appendChild(indicator);
            });

        } catch (error) {
            console.error("Aggregate Progress: Error fetching data:", error);
        }
    }); // End Auth Change
});
