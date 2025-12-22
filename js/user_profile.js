document.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
    checkAndDisplayProfile();
});

function checkAuthentication() {
    // Current Page Name
    const path = window.location.pathname;
    const page = path.split("/").pop();

    // Pages that do NOT require authentication
    // index.html is the landing page, allowing users to choose login
    // login pages obviously don't need auth
    const publicPages = [
        "index.html",
        "", // Root
        "std_login.html",
        "login_teacher.html",
        "std_reg.html",
        "teacher_dashboard.html",
        "std_add.html"
    ];

    if (publicPages.includes(page) || page.startsWith("login")) {
        return;
    }

    // Check if user is logged in
    let stdName = localStorage.getItem('std_name');

    if (!stdName) {
        // Redirect to login
        // Find the path to login page based on this script's location
        const scripts = document.getElementsByTagName('script');
        let loginUrl = "std_login.html"; // Default fallback

        for (let script of scripts) {
            if (script.src && script.src.includes('user_profile.js')) {
                // The script is in js/user_profile.js
                // We want proper path to std_login.html which is sibling to js folder
                // e.g. .../examsy/js/user_profile.js -> .../examsy/std_login.html
                loginUrl = script.src.replace(/js\/user_profile\.js(\?.*)?$/, 'std_login.html');
                break;
            }
        }
        alert("يرجى تسجيل الدخول أولاً");
        window.location.href = loginUrl;
    }
}

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
