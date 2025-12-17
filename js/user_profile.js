document.addEventListener('DOMContentLoaded', function () {
    checkAndDisplayProfile();
});

function checkAndDisplayProfile() {
    let stdName = localStorage.getItem('std_name');
    let stdGrade = localStorage.getItem('std_grade');
    let stdClass = localStorage.getItem('std_class');

    // If no name found, default to "ضيف"
    if (!stdName) {
        stdName = "ضيف";
    }

    if (stdName) {
        const profileContainer = document.getElementById('user-profile-container');
        if (!profileContainer) return; // Guard clause in case container isn't found

        const nameParts = stdName.trim().split(/\s+/);
        // Replicating user's logic for name display, but handling cases with fewer names safely
        let displayName = "أهلا, " + nameParts[0];
        if (nameParts.length > 1) {
            displayName += " " + nameParts[1];
        }

        // Initials logic
        let initials = '';
        if (nameParts.length > 1) {
            if (nameParts[0].length > 1) {
                initials = (nameParts[0][0] + nameParts[0][1]).toUpperCase();
            } else {
                initials = nameParts[0][0].toUpperCase();
            }
        } else if (nameParts[0].length > 1) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        } else {
            initials = nameParts[0].toUpperCase();
        }

        // Class Info String (e.g. "9ب")
        let classInfo = "";
        if (stdGrade && stdClass) {
            classInfo = `${stdGrade}${stdClass}`;
        }

        // Create HTML Structure
        // Changed layout to text column + avatar
        const profileHTML = `
            <div class="user-profile">
                <div class="user-info-col">
                    <span class="user-name">${displayName}</span>
                    ${classInfo ? `<span class="user-class">${classInfo}</span>` : ''}
                </div>
                <div class="user-initials-badge">${initials}</div>
            </div>
        `;

        profileContainer.innerHTML = profileHTML;

        // Optional: Add logout or profile link functionality here if requested later
    }
}
