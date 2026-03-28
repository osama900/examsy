(function() {
    if (!localStorage.getItem("std_id")) {
        alert("يرجى تسجيل الدخول أولاً للوصول إلى هذا المحتوى");
        // Get the base URL (for local server compatibility)
        const currentPath = window.location.pathname;
        const depth = (currentPath.match(/\//g) || []).length;
        
        // If we're on a local file system or specific server setup, absolute paths often work better
        // but for safety in this static structure, we'll try to find the root.
        const origin = window.location.origin || (window.location.protocol + "//" + window.location.host);
        
        // Use origin + path to ensure consistency
        window.location.href = origin + "/std_login.html";
    }
})();
