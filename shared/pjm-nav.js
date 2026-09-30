/* ============================================================
   PJM NAV — pjm-nav.js
   Generates the shared sidebar for every module page.
   Usage: PJMNav.render('module-id')  ← call after DOM ready
   ============================================================ */

(function(global) {
  'use strict';

  /* All pages (hub + modules) now live at root — no prefix needed. */
  function modulePath(filename) {
    return filename;
  }

  var DAYS_FULL   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  var MONTHS_FULL = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

  /* small helper */
  function byId(id) { return document.getElementById(id); }

  /* Get 12-hour split-out time parts for a given timezone */
  function timeParts(tz) {
    var now = new Date();
    var d   = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    var h   = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12  = h % 12 || 12;
    return {
      hh:   (h12 < 10 ? '0' : '') + h12,
      mm:   (m   < 10 ? '0' : '') + m,
      ss:   (s   < 10 ? '0' : '') + s,
      ampm: ampm,
      dow:  d.getDay()
    };
  }

  /* Format the date + UK secondary line */
  function formatClocks() {
    var now = new Date();
    var uk  = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    var uh  = uk.getHours(), um = uk.getMinutes();
    var uap = uh >= 12 ? 'PM' : 'AM'; uh = uh % 12 || 12;
    var ukStr = (uh < 10 ? '0' : '') + uh + ':' + (um < 10 ? '0' : '') + um + ' ' + uap;
    var dateStr = MONTHS_FULL[now.getMonth()] + ' ' + now.getDate() + ' ' + now.getFullYear();
    return { date: dateStr, uk: ukStr };
  }

  /* Build one split-flap digit card */
  function fcCard(id) {
    return '<span class="fc" id="' + id + '" data-num="0">' +
      '<span class="fc-half fc-top"><span>0</span></span>' +
      '<span class="fc-half fc-bottom"><span>0</span></span>' +
      '<span class="fc-half fc-flap-top"><span>0</span></span>' +
      '<span class="fc-half fc-flap-bottom"><span>0</span></span>' +
    '</span>';
  }

  /* Animate a card from its current digit to a new one */
  function flipTo(el, ch) {
    if (!el || el.getAttribute('data-num') === ch) return;
    var old = el.getAttribute('data-num') || ch;
    el.setAttribute('data-num', ch);
    var top = el.querySelector('.fc-top > span');
    var bot = el.querySelector('.fc-bottom > span');
    var ft  = el.querySelector('.fc-flap-top > span');
    var fb  = el.querySelector('.fc-flap-bottom > span');
    if (top) top.textContent = ch;   // new top revealed as flap folds away
    if (ft)  ft.textContent  = old;  // folding flap shows the old digit
    if (fb)  fb.textContent  = ch;   // incoming flap shows the new digit
    if (bot) bot.textContent = old;  // bottom stays on old until flip settles
    el.classList.remove('go');
    void el.offsetWidth;             // reflow to restart the animation
    el.classList.add('go');
    clearTimeout(el._fcT);
    el._fcT = setTimeout(function() {
      if (bot) bot.textContent = ch;
      el.classList.remove('go');
    }, 540);
  }

  /* Build the day-of-week strip */
  function dowStrip(activeDow) {
    return DAYS_FULL.map(function(d, i) {
      return '<span class="fc-dow' + (i === activeDow ? ' on' : '') + '">' + d + '</span>';
    }).join('');
  }

  /* Render the full sidebar HTML */
  function buildSidebar(activeModuleId, session) {
    var all = PJMSync.getAll();
    var clocks = formatClocks();

    var hubLink = '<a href="hub.html" class="hub-home-link" title="All Modules">' +
      '<span class="nav-icon">⊞</span>' +
      '<span class="nav-label">All Modules</span>' +
      '</a>';

    var navItems = PJMSync.MODULE_ORDER.map(function(id) {
      var meta = PJMSync.MODULE_META[id];
      var dot  = all[id].dotClass;
      var isActive = (id === activeModuleId);

      // Hide sensitive modules for viewers
      if (session && session.role === 'viewer' &&
          PJMSync.Auth.VIEWER_HIDDEN.indexOf(id) >= 0) {
        return '';
      }

      return '<a href="' + modulePath(meta.path) + '"' +
             (isActive ? ' class="active"' : '') +
             ' title="' + meta.label + '">' +
             '<span class="nav-icon">' + meta.icon + '</span>' +
             '<span class="nav-label">' + meta.label + '</span>' +
             (dot ? '<span class="sync-dot ' + dot + '"></span>' : '<span class="sync-dot"></span>') +
             '</a>';
    }).join('');

    // User row
    var userRow = '';
    if (session) {
      userRow = '<div class="pjm-user-row">' +
        (session.picture
          ? '<img class="pjm-user-avatar" src="' + session.picture + '" alt="">'
          : '<div class="pjm-user-avatar"></div>') +
        '<span class="pjm-user-name">' + (session.name || session.email).split(' ')[0] + '</span>' +
        '<span class="pjm-user-role ' + session.role + '">' +
          (session.role === 'admin' ? 'Admin' : 'View') + '</span>' +
        '</div>' +
        '<button class="pjm-logout" onclick="PJMSync.Auth.logout()">🚪 Sign Out</button>';
    }

    var svgCollapse = '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.dev/2000/svg"><rect x="0" y="0.5" width="11" height="2" rx="1" fill="currentColor"/><rect x="0" y="6" width="11" height="2" rx="1" fill="currentColor"/><rect x="0" y="11.5" width="11" height="2" rx="1" fill="currentColor"/><path d="M17 7L13.5 3.5M17 7L13.5 10.5M17 7H13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var svgExpand   = '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.dev/2000/svg"><rect x="7" y="0.5" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="6" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="11.5" width="11" height="2" rx="1" fill="currentColor"/><path d="M1 7L4.5 3.5M1 7L4.5 10.5M1 7H5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    return '<div class="pjm-sidebar" id="pjmSidebar">' +
      '<div class="pjm-logo">' +
        '<div class="logo-brand">⬡ <span><span>Meridian</span> PJM</span></div>' +
        '<button class="pjm-toggle-btn" id="pjmToggleBtn" onclick="PJMNav.toggleSidebar()" title="Collapse sidebar">' + svgCollapse + '</button>' +
      '</div>' +
      '<nav class="pjm-nav" id="pjmNav">' + hubLink + navItems + '</nav>' +
      '<div class="pjm-sidebar-bottom">' +
        '<div class="pjm-sprint-badge" id="sprintBadge">▶ ' + PJMSync.Sprint.getIndicator() + '</div>' +
        '<div class="pjm-flipclock" id="pjmFlip">' +
          '<div class="fc-row">' +
            fcCard('fcH1') + fcCard('fcH2') +
            '<span class="fc-colon"><i></i><i></i></span>' +
            fcCard('fcM1') + fcCard('fcM2') +
            '<span class="fc-side">' +
              '<span class="fc-ampm" id="fcAmpm">AM</span>' +
              '<span class="fc-sec" id="fcSec">00</span>' +
            '</span>' +
          '</div>' +
          '<div class="fc-dow-row" id="fcDowRow">' + dowStrip(new Date().getDay()) + '</div>' +
          '<div class="fc-date" id="pjmClockDate">' + clocks.date + '</div>' +
          '<div class="fc-uk">' +
            '<span class="fc-uk-label">🇬🇧 UK</span>' +
            '<span class="fc-uk-time" id="pjmClockUK">' + clocks.uk + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      userRow +
      '</div>';
  }

  /* Boot auth for a module page */
  function initAuth(activeModuleId, onReady) {
    // Local dev bypass
    var isLocal = window.location.protocol === 'file:' ||
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';
    if (isLocal) {
      var fakeSession = { email: 'local@dev', name: 'Local Dev', picture: '', role: 'admin' };
      hideOverlay();
      onReady(fakeSession);
      return;
    }

    var session = PJMSync.Auth.getSession();
    if (session) {
      hideOverlay();
      onReady(session);
      return;
    }

    // Need to sign in
    var attempts = 0;
    function tryGSI() {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          client_id: PJMSync.Auth.GOOGLE_CLIENT_ID,
          callback: function(response) {
            var payload = PJMSync.Auth.parseJwt(response.credential);
            if (!payload) { showLoginError('Authentication failed.'); return; }
            var email = (payload.email || '').toLowerCase().trim();
            var role  = PJMSync.Auth.ROLE_MAP[email];
            if (!role) { showLoginError('Access denied for ' + email + '. Contact Sujit.'); return; }
            var sess = PJMSync.Auth.saveSession(email, payload.name || email, payload.picture || '', role);
            hideOverlay();
            onReady(sess);
          },
          auto_select: true,
          cancel_on_tap_outside: false
        });
        google.accounts.id.renderButton(
          document.getElementById('googleSignInBtn'),
          { theme: 'filled_black', size: 'large', width: 300, text: 'signin_with', shape: 'rectangular' }
        );
        google.accounts.id.prompt();
      } else if (attempts++ < 20) {
        setTimeout(tryGSI, 300);
      }
    }
    tryGSI();
  }

  function hideOverlay() {
    var el = document.getElementById('loginOverlay');
    if (el) { el.classList.add('hidden'); setTimeout(function() { el.style.display = 'none'; }, 400); }
  }

  function showLoginError(msg) {
    var el = document.getElementById('loginError');
    if (el) el.textContent = msg;
  }

  /* Start the clock tick — drives the flip clock + secondary lines */
  function startClocks() {
    var lastDow = -1;
    function tick() {
      var t = timeParts('Asia/Kolkata');   // IST is the primary clock
      flipTo(byId('fcH1'), t.hh.charAt(0));
      flipTo(byId('fcH2'), t.hh.charAt(1));
      flipTo(byId('fcM1'), t.mm.charAt(0));
      flipTo(byId('fcM2'), t.mm.charAt(1));
      var sec = byId('fcSec');   if (sec) sec.textContent = t.ss;
      var ap  = byId('fcAmpm');  if (ap)  ap.textContent  = t.ampm;

      if (t.dow !== lastDow) {
        var row = byId('fcDowRow');
        if (row) row.innerHTML = dowStrip(t.dow);
        lastDow = t.dow;
      }

      var c = formatClocks();
      var d = byId('pjmClockDate'); if (d) d.textContent = c.date;
      var u = byId('pjmClockUK');   if (u) u.textContent = c.uk;
      var sb = byId('sprintBadge');
      if (sb) sb.textContent = '▶ ' + PJMSync.Sprint.getIndicator();
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ── Public API ── */
  var PJMNav = {

    /* Main entry point — call once after DOM ready */
    render: function(activeModuleId) {
      var container = document.getElementById('pjmSidebarContainer');
      if (!container) return;

      initAuth(activeModuleId, function(session) {
        container.innerHTML = buildSidebar(activeModuleId, session);
        startClocks();
        // Restore collapsed state from localStorage
        if (localStorage.getItem('pjm-sidebar-collapsed') === '1') {
          PJMNav._applyCollapsed(true, false);
        }
        // Refresh dots every 60s
        setInterval(function() { PJMNav.refreshDots(); }, 60000);
      });
    },

    /* Toggle sidebar collapsed/expanded */
    toggleSidebar: function() {
      var sidebar = document.getElementById('pjmSidebar');
      if (!sidebar) return;
      var collapsed = sidebar.classList.contains('collapsed');
      PJMNav._applyCollapsed(!collapsed, true);
    },

    /* Apply collapsed state */
    _applyCollapsed: function(collapse, save) {
      var sidebar = document.getElementById('pjmSidebar');
      var main    = document.querySelector('.pjm-main');
      var btn     = document.getElementById('pjmToggleBtn');
      var svgCollapse = '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.dev/2000/svg"><rect x="0" y="0.5" width="11" height="2" rx="1" fill="currentColor"/><rect x="0" y="6" width="11" height="2" rx="1" fill="currentColor"/><rect x="0" y="11.5" width="11" height="2" rx="1" fill="currentColor"/><path d="M17 7L13.5 3.5M17 7L13.5 10.5M17 7H13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var svgExpand   = '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.dev/2000/svg"><rect x="7" y="0.5" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="6" width="11" height="2" rx="1" fill="currentColor"/><rect x="7" y="11.5" width="11" height="2" rx="1" fill="currentColor"/><path d="M1 7L4.5 3.5M1 7L4.5 10.5M1 7H5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      if (!sidebar) return;
      if (collapse) {
        sidebar.classList.add('collapsed');
        if (main) main.classList.add('sidebar-collapsed');
        if (btn)  { btn.innerHTML = svgExpand; btn.title = 'Expand sidebar'; }
      } else {
        sidebar.classList.remove('collapsed');
        if (main) main.classList.remove('sidebar-collapsed');
        if (btn)  { btn.innerHTML = svgCollapse; btn.title = 'Collapse sidebar'; }
      }
      if (save) localStorage.setItem('pjm-sidebar-collapsed', collapse ? '1' : '0');
    },

    /* Refresh just the sync dots without re-rendering the whole sidebar */
    refreshDots: function() {
      var all = PJMSync.getAll();
      PJMSync.MODULE_ORDER.forEach(function(id) {
        // Find the nav link for this module
        var meta = PJMSync.MODULE_META[id];
        var links = document.querySelectorAll('#pjmNav a');
        links.forEach(function(a) {
          if (a.getAttribute('href') === modulePath(meta.path)) {
            var dot = a.querySelector('.sync-dot');
            if (dot) {
              dot.className = 'sync-dot ' + (all[id].dotClass || '');
            }
          }
        });
      });
    }
  };

  global.PJMNav = PJMNav;

})(window);
