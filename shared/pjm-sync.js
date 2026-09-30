/* ============================================================
   PJM INTELLIGENCE LAYER — pjm-sync.js
   Shared sync state registry for all 14 PJM modules.
   Each module writes its sync state here; the nav sidebar
   reads it to show freshness dots; Overview aggregates it.
   ============================================================ */

(function(global) {
  'use strict';

  var REGISTRY_KEY = 'pjmdemo_pjm_sync_v2';
  var SESSION_KEY  = 'pjmdemo_pjm_session_v1';
  var SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 hours

  /* ── Staleness thresholds per module (ms) ── */
  var THRESHOLDS = {
    'overview':           5  * 60 * 1000,   // 5 min  — aggregated, light
    'projects':           5  * 60 * 1000,   // 5 min  — live sprint data
    'resources':         15  * 60 * 1000,   // 15 min — workload & team
    'sprint-plans':      60  * 60 * 1000,   // 60 min — mostly static iframes
    'sprint-review':     30  * 60 * 1000,   // 30 min — last closed sprint
    'releases':          15  * 60 * 1000,   // 15 min — JIRA fix versions
    'project-priorities':60  * 60 * 1000,   // 60 min — embedded HTML
    'key-deliverables':  30  * 60 * 1000,   // 30 min — Google Sheet
    'product-roadmap':   60  * 60 * 1000,   // 60 min — Confluence + Sheet
    'pr-dashboard':       2  * 60 * 1000,   // 2 min  — GitHub live
    'action-items':       5  * 60 * 1000,   // 5 min  — Slack + JIRA + notes
    'meetings':           1  * 60 * 1000,   // 1 min  — Calendar live
    'standup-brief':    999  * 60 * 1000,   // manual only — never auto-stale
    'sprint-planning':  999  * 60 * 1000    // manual only — generated on demand
  };

  /* ── Module metadata (for sidebar & overview) ── */
  var MODULE_META = {
    'overview':           { label: 'Overview',           icon: '📊', path: '01-overview.html' },
    'projects':           { label: 'Projects',           icon: '📁', path: '02-projects.html' },
    'resources':          { label: 'Resources',          icon: '👥', path: '03-resources.html' },
    'sprint-plans':       { label: 'Sprint Plans',       icon: '📋', path: '04-sprint-plans.html' },
    'sprint-review':      { label: 'Sprint Review',      icon: '🔁', path: '05-sprint-review.html' },
    'releases':           { label: 'Releases',           icon: '🚀', path: '06-releases.html' },
    'project-priorities': { label: 'Project Priorities', icon: '🎯', path: '07-project-priorities.html' },
    'key-deliverables':   { label: 'Key Deliverables',   icon: '📦', path: '08-key-deliverables.html' },
    'product-roadmap':    { label: 'Product Roadmap',    icon: '🗺️', path: '09-product-roadmap.html' },
    'pr-dashboard':       { label: 'PR Dashboard',       icon: '📥', path: '10-pr-dashboard.html' },
    'action-items':       { label: 'My Action Items',    icon: '⚡', path: '11-action-items.html' },
    'meetings':           { label: 'Meetings',           icon: '📅', path: '12-meetings.html' },
    'standup-brief':      { label: 'Standup Brief',      icon: '🎙️', path: '13-standup-brief.html' },
    'sprint-planning':    { label: 'Sprint Planning',    icon: '🗓️', path: '14-sprint-planning.html' }
  };

  /* Module order for nav rendering */
  var MODULE_ORDER = [
    'overview','projects','resources','sprint-plans','sprint-review',
    'releases','project-priorities','key-deliverables','product-roadmap',
    'pr-dashboard','action-items','meetings','standup-brief','sprint-planning'
  ];

  /* ─────────────────────────────────────────
     Registry read / write
  ───────────────────────────────────────── */
  function getRegistry() {
    try {
      return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}');
    } catch(e) { return {}; }
  }

  function saveRegistry(reg) {
    try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg)); } catch(e) {}
  }

  function getEntry(moduleId) {
    return getRegistry()[moduleId] || { status: 'never', lastSync: 0, summary: {} };
  }

  /* ─────────────────────────────────────────
     Public API — PJMSync
  ───────────────────────────────────────── */
  var PJMSync = {

    MODULE_META:  MODULE_META,
    MODULE_ORDER: MODULE_ORDER,
    THRESHOLDS:   THRESHOLDS,

    /* Is data for this module stale? */
    isStale: function(moduleId) {
      var entry = getEntry(moduleId);
      if (!entry.lastSync) return true;
      var threshold = THRESHOLDS[moduleId] || 10 * 60 * 1000;
      return (Date.now() - entry.lastSync) > threshold;
    },

    /* Mark module as loading */
    markLoading: function(moduleId) {
      var reg = getRegistry();
      reg[moduleId] = reg[moduleId] || {};
      reg[moduleId].status = 'loading';
      saveRegistry(reg);
      PJMSync._emit('loading', moduleId);
    },

    /* Mark module as successfully synced, optionally storing a summary */
    markSynced: function(moduleId, summary) {
      var reg = getRegistry();
      reg[moduleId] = {
        status:   'fresh',
        lastSync: Date.now(),
        summary:  summary || reg[moduleId] && reg[moduleId].summary || {}
      };
      saveRegistry(reg);
      PJMSync._emit('synced', moduleId);
    },

    /* Mark module as errored */
    markError: function(moduleId, message) {
      var reg = getRegistry();
      reg[moduleId] = reg[moduleId] || {};
      reg[moduleId].status = 'error';
      reg[moduleId].error  = message || 'Unknown error';
      saveRegistry(reg);
      PJMSync._emit('error', moduleId);
    },

    /* Get the status dot class for a module */
    getDotClass: function(moduleId) {
      var entry = getEntry(moduleId);
      if (entry.status === 'loading')                    return 'loading';
      if (entry.status === 'error')                      return 'error';
      if (!entry.lastSync)                               return '';
      if (PJMSync.isStale(moduleId))                     return 'stale';
      return 'fresh';
    },

    /* Get human-readable "last synced" string */
    getLastSyncedText: function(moduleId) {
      var entry = getEntry(moduleId);
      if (!entry.lastSync) return 'Never synced';
      var diff = Math.floor((Date.now() - entry.lastSync) / 1000);
      if (diff < 60)    return 'Synced just now';
      if (diff < 3600)  return 'Synced ' + Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return 'Synced ' + Math.floor(diff / 3600) + 'h ago';
      return 'Synced ' + Math.floor(diff / 86400) + 'd ago';
    },

    /* Get summary data cached by a module */
    getSummary: function(moduleId) {
      return getEntry(moduleId).summary || {};
    },

    /* Get all module statuses (for Overview and nav) */
    getAll: function() {
      var reg = getRegistry();
      var result = {};
      MODULE_ORDER.forEach(function(id) {
        result[id] = {
          meta:      MODULE_META[id],
          status:    (reg[id] && reg[id].status) || 'never',
          lastSync:  (reg[id] && reg[id].lastSync) || 0,
          isStale:   PJMSync.isStale(id),
          dotClass:  PJMSync.getDotClass(id),
          lastText:  PJMSync.getLastSyncedText(id),
          summary:   (reg[id] && reg[id].summary) || {}
        };
      });
      return result;
    },

    /* ── Initialise a module page ──
       Call at the top of each module's script block.
       Renders the last-synced label, starts auto-refresh if stale. */
    initModule: function(moduleId, syncFn) {
      // Update label immediately
      PJMSync._updateLabel(moduleId);

      // If stale, auto-sync after a short delay (let page paint first)
      if (PJMSync.isStale(moduleId) && typeof syncFn === 'function') {
        setTimeout(function() { syncFn(); }, 400);
      }

      // Update label every 30s
      setInterval(function() { PJMSync._updateLabel(moduleId); }, 30000);
    },

    /* Update the #lastSyncedLabel element on the page */
    _updateLabel: function(moduleId) {
      var el = document.getElementById('lastSyncedLabel');
      if (!el) return;
      el.textContent = PJMSync.getLastSyncedText(moduleId);
      el.className = 'last-synced-label ' + PJMSync.getDotClass(moduleId);
    },

    /* Update the sync button state */
    setSyncBtnState: function(loading) {
      var btn = document.getElementById('syncBtn');
      if (!btn) return;
      if (loading) {
        btn.disabled = true;
        btn.classList.add('syncing');
        btn.querySelector('.sync-icon').textContent = '🔄';
      } else {
        btn.disabled = false;
        btn.classList.remove('syncing');
        btn.querySelector('.sync-icon').textContent = '🔄';
      }
    },

    /* Simple event emitter for cross-module comms (same-tab only) */
    _listeners: {},
    _emit: function(event, moduleId) {
      // Use localStorage event to propagate across tabs
      try {
        localStorage.setItem('pjmdemo_pjm_event', JSON.stringify({
          event: event, moduleId: moduleId, ts: Date.now()
        }));
      } catch(e) {}
    },
    on: function(event, fn) {
      if (!PJMSync._listeners[event]) PJMSync._listeners[event] = [];
      PJMSync._listeners[event].push(fn);
    }
  };

  /* Listen for storage events (cross-tab sync state updates) */
  window.addEventListener('storage', function(e) {
    if (e.key === 'pjmdemo_pjm_event') {
      try {
        var data = JSON.parse(e.newValue);
        var fns = PJMSync._listeners[data.event] || [];
        fns.forEach(function(fn) { fn(data.moduleId); });
        // Refresh nav dots if sidebar is present
        if (typeof PJMNav !== 'undefined') PJMNav.refreshDots();
      } catch(ex) {}
    }
    if (e.key === REGISTRY_KEY) {
      if (typeof PJMNav !== 'undefined') PJMNav.refreshDots();
    }
  });

  /* ─────────────────────────────────────────
     Auth helpers (shared with all modules)
  ───────────────────────────────────────── */
  PJMSync.Auth = {
    GOOGLE_CLIENT_ID: '488133499878-f69ubcl8mkn1vva27602ru751d04obqp.apps.googleusercontent.com',
    ROLE_MAP: {
      'kwame.b@northgate.dev': 'admin',
      'tomas.berg@meridian.dev':    'viewer',
      'priya.anand@northgate.dev':           'viewer',
      'rohan.desai@northgate.dev':      'viewer',
      'alina.rowe@meridian.dev':          'viewer'
    },
    VIEWER_HIDDEN: ['action-items', 'meetings'],

    getSession: function() {
      try {
        var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (s && s.expiresAt > Date.now()) return s;
        localStorage.removeItem(SESSION_KEY);
      } catch(e) {}
      return null;
    },

    saveSession: function(email, name, picture, role) {
      var s = { email: email, name: name, picture: picture || '', role: role,
                expiresAt: Date.now() + SESSION_TTL };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch(e) {}
      return s;
    },

    parseJwt: function(token) {
      try {
        return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      } catch(e) { return null; }
    },

    logout: function() {
      localStorage.removeItem(SESSION_KEY);
      if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
      location.reload();
    }
  };

  /* ─────────────────────────────────────────
     JIRA helpers
  ───────────────────────────────────────── */
  PJMSync.Jira = {
    getCredentials: function() {
      try {
        return JSON.parse(localStorage.getItem('pjmdemo_jira_creds') || 'null');
      } catch(e) { return null; }
    },

    saveCredentials: function(email, token) {
      try {
        localStorage.setItem('pjmdemo_jira_creds', JSON.stringify({ email: email, token: token }));
      } catch(e) {}
    },

    getAuthHeader: function() {
      var creds = PJMSync.Jira.getCredentials();
      if (!creds) return null;
      return 'Basic ' + btoa(creds.email + ':' + creds.token);
    },

    BASE: 'https://meridian.atlassian.net',

    fetch: function(path, opts) {
      var auth = PJMSync.Jira.getAuthHeader();
      if (!auth) return Promise.reject(new Error('No JIRA credentials'));
      var headers = Object.assign({ 'Authorization': auth, 'Content-Type': 'application/json' },
                                  (opts && opts.headers) || {});
      return fetch(PJMSync.Jira.BASE + path, Object.assign({ headers: headers }, opts || {}));
    }
  };

  /* ─────────────────────────────────────────
     Sprint context (shared across all modules)
  ───────────────────────────────────────── */
  PJMSync.Sprint = {
    /* Anchor: Sprint 14 began Monday 22 Jun 2026 (IST).
       Sprints run 2 working weeks (14 calendar days) and roll over every Monday.
       This is consistent with history: S12→25 May, S13→08 Jun, S14→22 Jun, S15→06 Jul. */
    ANCHOR_NUMBER: 14,
    ANCHOR_DATE: Date.UTC(2026, 5, 22),   // 22 Jun 2026 (Monday), date-only

    /* Compute the live sprint context from today's IST date */
    compute: function() {
      var MS = 86400000;
      var istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      var today  = Date.UTC(istNow.getFullYear(), istNow.getMonth(), istNow.getDate());
      var diff   = Math.floor((today - PJMSync.Sprint.ANCHOR_DATE) / MS);
      var offset = Math.floor(diff / 14);
      var number = PJMSync.Sprint.ANCHOR_NUMBER + offset;
      var dayInSprint = ((diff % 14) + 14) % 14;        // 0..13
      var week = dayInSprint < 7 ? 1 : 2;
      var dow  = istNow.getDay();                        // 0=Sun .. 6=Sat
      var day  = (dow === 0 || dow === 6) ? 5 : dow;     // Mon–Fri => 1..5; weekend => 5
      var startMs = PJMSync.Sprint.ANCHOR_DATE + offset * 14 * MS;   // sprint start Monday
      var start = new Date(startMs), end = new Date(startMs + 12 * MS); // to 2nd Friday
      var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      function f(d) { return M[d.getUTCMonth()] + ' ' + ('0' + d.getUTCDate()).slice(-2) + ', ' + d.getUTCFullYear(); }
      return {
        number: number,
        week: week,
        day: day,
        label: 'Sprint ' + number,
        dates: f(start) + ' – ' + f(end)
      };
    },

    /* Live sprint context — recomputed on every access */
    get current() { return PJMSync.Sprint.compute(); },

    getIndicator: function() {
      var s = PJMSync.Sprint.compute();
      return 'Sprint ' + s.number + ' W' + s.week + ' D' + s.day;
    }
  };

  global.PJMSync = PJMSync;

})(window);
