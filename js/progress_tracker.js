
// Progress Tracker Script
// Fetches student activity from Firestore and updates elements with data-page-id attributes.

document.addEventListener('DOMContentLoaded', async function () {
    console.log("Progress Tracker: Initializing...");

    const stdId = localStorage.getItem('std_id');
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
        // Fetch all study activity for the student
        const activitySnapshot = await db.collection('std_id').doc(stdId).collection('study_activity').get();

        const activityMap = {};
        activitySnapshot.forEach(doc => {
            activityMap[doc.id] = doc.data();
        });

        // Find all elements that need progress indicators
        const lessonElements = document.querySelectorAll('[data-page-id]');

        lessonElements.forEach(element => {
            const pageId = element.getAttribute('data-page-id');
            const data = activityMap[pageId];

            // Default state: Red X (No data or invalid)
            let icon = "❌";
            let color = "red";

            if (data) {
                const sessionTime = data.sessionTimeSeconds || 0;
                // Use targetTime from the record if available, otherwise assume a default or fail safe
                // Note: Ideally targetTime should be fetched from a central config or the record itself.
                // The time tracker saves targetTimeSeconds in the record, so we use that.
                const targetTime = data.targetTimeSeconds || 30; // Default to 30s if missing

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
            }

            // Create Icon Element
            const indicator = document.createElement('span');
            indicator.textContent = icon;
            indicator.style.marginLeft = "10px"; // Adjust for RTL
            indicator.style.marginRight = "80px"; // Adjust for LTR logic if needed, but page is RTL
            indicator.style.color = color;
            indicator.style.fontSize = "1.2rem";
            indicator.title = data ? `Time: ${data.sessionTimeSeconds}s / ${data.targetTimeSeconds}s` : "Not started";

            // Append to the element (assuming it's formatted as a flex container or similar)
            // If it's the anchor tag, we append inside it.
            element.appendChild(indicator);

            // Ensure flex layout for valid alignment if not already
            if (window.getComputedStyle(element).display !== 'flex') {
                element.style.display = 'flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'space-between'; // Keep text and icon apart
            }
        });

    } catch (error) {
        console.error("Progress Tracker: Error fetching data:", error);
    }
});
