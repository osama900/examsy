
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

    const db = firebase.firestore();

    try {
        // Fetch all study activity for the student
        // Optimization: Fetch all once instead of per-link requests
        const activitySnapshot = await db.collection('std_id').doc(stdId).collection('study_activity').get();

        const activityMap = {};
        activitySnapshot.forEach(doc => {
            activityMap[doc.id] = doc.data();
        });

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
                const data = activityMap[pageId];
                let status = "red"; // Default if not found

                if (data) {
                    const sessionTime = data.sessionTimeSeconds || 0;
                    const targetTime = data.targetTimeSeconds || 30; // Default fallback

                    if (sessionTime >= targetTime) {
                        status = "green";
                    } else if (sessionTime >= (targetTime - 5)) {
                        status = "orange";
                    } else {
                        status = "red";
                    }
                }

                if (status === "red") {
                    anyX = true;
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

            // Wait, if NO sub-pages exist or list empty?
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
            // because .lesson-btn usually has overflow: hidden for effects.
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-flex'; // Use inline-flex or grid item behavior
            wrapper.style.justifyContent = 'center';
            wrapper.style.alignItems = 'center';

            // Insert wrapper before the button
            element.parentNode.insertBefore(wrapper, element);
            // Move button into wrapper
            wrapper.appendChild(element);

            // Create Icon Element
            const indicator = document.createElement('div');
            indicator.textContent = icon;

            indicator.style.position = 'absolute';
            // Position outside bottom-left
            indicator.style.bottom = '-5px';
            indicator.style.left = '-5px';
            indicator.style.zIndex = '20';

            indicator.style.color = color;
            indicator.style.fontSize = "1.8rem"; // Make it big and clear
            indicator.style.fontWeight = "bold";
            // Add a white background circle behind the icon to make it stand out
            indicator.style.backgroundColor = "white";
            indicator.style.borderRadius = "50%";
            indicator.style.width = "30px";
            indicator.style.height = "30px";
            indicator.style.display = "flex";
            indicator.style.alignItems = "center";
            indicator.style.justifyContent = "center";
            indicator.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";

            wrapper.appendChild(indicator);

            // We don't need to mess with the element's display properties anymore
            // since it's inside the wrapper.
        });

    } catch (error) {
        console.error("Aggregate Progress: Error fetching data:", error);
    }
});
