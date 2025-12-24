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
    let stdCoins = localStorage.getItem('std_coins') || '0';

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
        const profileHTML = `
            <div class="profile-wrapper">
                <div class="user-profile" id="userProfileTrigger">
                    <div class="user-info-col">
                        <span class="user-name">${displayName}</span>
                        ${classInfo ? `<span class="user-class">${classInfo}</span>` : ''}
                    </div>
                    <div class="user-initials-badge">${initials}</div>
                </div>
                <div class="profile-dropdown" id="profileDropdown">
                    <div class="dropdown-item" id="logoutBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>تسجيل خروج</span>
                    </div>
                </div>
            </div>
        `;

        profileContainer.innerHTML = profileHTML;

        // Toggle dropdown
        const trigger = document.getElementById('userProfileTrigger');
        const dropdown = document.getElementById('profileDropdown');

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // Logout functionality
        document.getElementById('logoutBtn').addEventListener('click', function () {
            localStorage.removeItem('std_id');
            localStorage.removeItem('std_name');
            localStorage.removeItem('std_grade');
            localStorage.removeItem('std_class');
            localStorage.removeItem('std_coins');

            // Redirect to login page
            const scripts = document.getElementsByTagName('script');
            let loginUrl = "std_login.html";
            for (let script of scripts) {
                if (script.src && script.src.includes('user_profile.js')) {
                    loginUrl = script.src.replace(/js\/user_profile\.js(\?.*)?$/, 'std_login.html');
                    break;
                }
            }
            window.location.href = loginUrl;
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }
}
