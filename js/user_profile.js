document.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
    checkAndDisplayProfile();
});

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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

        // Display in Hero Section if element exists
        const heroStudentInfo = document.getElementById('hero-student-info');
        if (heroStudentInfo) {
            let infoArray = [stdName];
            if (stdGrade) infoArray.push(stdGrade);
            if (stdClass) infoArray.push(stdClass);
            heroStudentInfo.textContent = infoArray.join(' ');
        }

        // Create HTML Structure
        const profileHTML = `
            <div class="user-profile-controls" style="display:flex; align-items:center;">
                
                <!-- Notification Bell & Dropdown -->
                <div class="notif-wrapper" style="position: relative; margin-left: 15px;">
                    <div id="js-notif-bell" class="notif-bell" style="cursor: pointer; position: relative;">
                        <span style="font-size:24px;">🔔</span>
                        <span id="js-notif-badge" class="notif-badge">0</span>
                    </div>

                    <!-- Dropdown Content -->
                    <div id="js-notif-dropdown" style="
                        position: absolute;
                        top: 120%;
                        left: -50px;
                        width: 320px;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                        border: 1px solid #f0f0f0;
                        opacity: 0;
                        visibility: hidden;
                        transform: translateY(-10px);
                        transition: all 0.3s ease;
                        z-index: 2000;
                        overflow: hidden;
                        direction: rtl;
                        text-align: right;
                    ">
                        <div style="padding: 12px 15px; border-bottom: 1px solid #eee; background: #fafafa;">
                            <h3 style="margin:0; font-size:14px; color:#333; font-weight:bold;">الإشعارات</h3>
                        </div>
                        <div id="js-notif-list" style="max-height: 350px; overflow-y: auto;">
                            <!-- Items go here -->
                            <div style="padding:20px; text-align:center; color:#999; font-size:13px;">جاري التحميل...</div>
                        </div>
                    </div>
                </div>

                <div class="profile-wrapper">
                    <div class="user-profile" id="userProfileTrigger">
                        <div class="user-info-col">
                            <span class="user-name">${escapeHTML(displayName)}</span>
                            ${classInfo ? `<span class="user-class">${escapeHTML(classInfo)}</span>` : ''}
                        </div>
                        <div class="user-initials-badge">${escapeHTML(initials)}</div>
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
            </div>
        `;

        profileContainer.innerHTML = profileHTML;

        // Toggle dropdown
        const trigger = document.getElementById('userProfileTrigger');
        const dropdown = document.getElementById('profileDropdown');

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            // Close notif dropdown if open
            document.getElementById('js-notif-dropdown').classList.remove('active');
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

        // --- Notification Logic ---
        const bellBtn = document.getElementById('js-notif-bell');
        const notifDropdown = document.getElementById('js-notif-dropdown');
        const notifList = document.getElementById('js-notif-list');

        function toggleNotifDropdown(e) {
            e.stopPropagation();
            const isActive = notifDropdown.classList.contains('active');

            // Close profile dropdown
            dropdown.classList.remove('active');

            if (isActive) {
                notifDropdown.classList.remove('active');
                notifDropdown.style.opacity = '0';
                notifDropdown.style.visibility = 'hidden';
                notifDropdown.style.transform = 'translateY(-10px)';
            } else {
                notifDropdown.classList.add('active');
                notifDropdown.style.opacity = '1';
                notifDropdown.style.visibility = 'visible';
                notifDropdown.style.transform = 'translateY(0)';
                loadAndRenderNotifications();
            }
        }

        bellBtn.addEventListener('click', toggleNotifDropdown);

        // Close dropdowns when clicking outside
        document.addEventListener('click', function (e) {
            if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
            // For notif dropdown - check if click is outside wrapper
            if (!bellBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
                notifDropdown.classList.remove('active');
                notifDropdown.style.opacity = '0';
                notifDropdown.style.visibility = 'hidden';
                notifDropdown.style.transform = 'translateY(-10px)';
            }
        });

        let fetchedNotifications = [];

        function getReadMap() {
            const sid = localStorage.getItem('std_id');
            return JSON.parse(localStorage.getItem('read_notifications_' + sid)) || {};
        }

        function updateReadMap(id) {
            const sid = localStorage.getItem('std_id');
            const map = getReadMap();
            map[id] = true;
            localStorage.setItem('read_notifications_' + sid, JSON.stringify(map));
            updateBadge();
            renderNotifList();
        }

        function updateBadge() {
            if (!fetchedNotifications.length) return;
            const map = getReadMap();
            let count = 0;
            fetchedNotifications.forEach(n => {
                if (!map[n.id]) count++;
            });
            const badge = document.getElementById('js-notif-badge');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 9 ? '9+' : count;
                    badge.classList.add('show');
                } else {
                    badge.classList.remove('show');
                }
            }
        }

        function renderNotifList() {
            if (fetchedNotifications.length === 0) {
                notifList.innerHTML = '<div style="padding:20px; text-align:center; color:#999; font-size:13px;">لا توجد إشعارات جديدة</div>';
                return;
            }

            notifList.innerHTML = '';
            const map = getReadMap();

            fetchedNotifications.forEach(n => {
                const isRead = !!map[n.id];
                const date = n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleDateString('ar-EG') : '';

                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 12px 15px;
                    border-bottom: 1px solid #eee;
                    cursor: pointer;
                    transition: background 0.2s;
                    background: ${isRead ? '#fff' : '#ebf5fb'};
                `;
                item.onmouseenter = () => { item.style.backgroundColor = isRead ? '#f9f9f9' : '#e1f0fa'; };
                item.onmouseleave = () => { item.style.backgroundColor = isRead ? '#fff' : '#ebf5fb'; };

                item.onclick = (e) => {
                    e.stopPropagation();
                    updateReadMap(n.id);
                };

                const titleStyle = isRead ? 'font-weight:normal; color:#555;' : 'font-weight:bold; color:#2c3e50;';

                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-size:13px; ${titleStyle}">${escapeHTML(n.title)}</span>
                        <span style="font-size:10px; color:#999;">${escapeHTML(date)}</span>
                    </div>
                    <div style="font-size:12px; color:#666; line-height:1.4;">${escapeHTML(n.message || n.body)}</div>
                `;

                notifList.appendChild(item);
            });
        }

        function loadAndRenderNotifications() {
            if (typeof db === 'undefined') return;
            const sid = localStorage.getItem('std_id');

            Promise.all([
                db.collection('notifications').where('target', '==', 'all').limit(20).get(),
                db.collection('notifications').where('target', '==', sid).limit(20).get()
            ]).then(results => {
                const notifs1 = results[0].docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const notifs2 = results[1].docs.map(doc => ({ id: doc.id, ...doc.data() }));

                let merged = [...notifs1, ...notifs2];
                const unique = [];
                const m = new Map();
                for (const i of merged) {
                    if (!m.has(i.id)) { m.set(i.id, true); unique.push(i); }
                }

                unique.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

                fetchedNotifications = unique;
                renderNotifList();
                updateBadge();
            }).catch(e => console.error(e));
        }

        if (typeof db !== 'undefined') {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) loadAndRenderNotifications();
            });
        }
    }
}
