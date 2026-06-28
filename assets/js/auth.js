/* AtriaERP — Authentication UI + role-based access (cloud mode only) */
(function (global) {
  "use strict";

  // Role -> which sidebar groups the user can see. "*" = everything.
  var ROLE_GROUPS = {
    admin:    ["*"],
    manager:  ["*"],
    sales:    ["Overview", "CRM & Sales", "Inventory & Property"],
    accounts: ["Overview", "Finance", "HR"],
    site:     ["Overview", "Procurement & Projects", "Inventory & Property"],
    legal:    ["Overview", "Legal & Land"]
  };

  function role() { var u = Cloud.currentUser(); return (u && u.role) || "admin"; }
  function canSeeGroup(groupName) {
    var g = ROLE_GROUPS[role()] || ["*"];
    return g.indexOf("*") >= 0 || g.indexOf(groupName) >= 0 || groupName === "System";
  }

  function showLogin(onSuccess) {
    var host = document.getElementById("authScreen");
    host.hidden = false;
    document.getElementById("app").style.visibility = "hidden";
    host.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-brand"><span class="brand-mark">A</span><div><strong>AtriaERP</strong><br><small>Real Estate ERP</small></div></div>' +
        '<h2>Sign in</h2>' +
        '<p class="muted" style="margin-top:-6px">Use the email &amp; password your administrator created for you.</p>' +
        '<form id="loginForm">' +
          '<div class="field req"><label>Email</label><input type="email" name="email" autocomplete="username" required></div>' +
          '<div class="field req"><label>Password</label><input type="password" name="password" autocomplete="current-password" required></div>' +
          '<div id="loginErr" class="auth-err" hidden></div>' +
          '<button type="submit" class="btn primary" style="width:100%;justify-content:center;margin-top:6px">Sign in</button>' +
        '</form>' +
        '<div class="auth-foot muted">Connected to your organisation’s secure cloud database.</div>' +
      '</div>';

    var form = document.getElementById("loginForm");
    form.onsubmit = function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var err = document.getElementById("loginErr");
      err.hidden = true; btn.disabled = true; btn.textContent = "Signing in…";
      Cloud.signIn(form.email.value.trim(), form.password.value)
        .then(function () { host.hidden = true; document.getElementById("app").style.visibility = ""; onSuccess(); })
        .catch(function (ex) { err.hidden = false; err.textContent = ex.message; btn.disabled = false; btn.textContent = "Sign in"; });
    };
  }

  function logout() {
    Cloud.signOut();
    location.reload();
  }

  global.Auth = { showLogin: showLogin, logout: logout, role: role, canSeeGroup: canSeeGroup, ROLE_GROUPS: ROLE_GROUPS };
})(window);
