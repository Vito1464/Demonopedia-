// ─── Demonopedia — Main Entry ────────────────────────
// SPA Router + App Shell + Auth Gate

import "/src/style.css";
import { auth } from "/src/auth.js";
import { store, REGION_COLORS } from "/src/store.js";
import { mountNetwork, unmountNetwork, showAddNodeModal } from "/src/network.js";
import { mountDossier } from "/src/dossier.js";
import { mountPipeline, unmountPipeline } from "/src/pipeline.js";
import { mountGateDetail } from "/src/gate.js";

let currentView = null;

// ─── Auth UI ───
function showAuthScreen() {
  const app = document.getElementById('app');
  app.style.display = 'none';

  const screen = document.createElement('div');
  screen.id = 'auth-screen';
  screen.innerHTML = `
    <div class="auth-container">
      <div class="auth-brand">
        <div class="auth-logo">✦</div>
        <h1 class="auth-title">Demonopedia</h1>
        <p class="auth-subtitle">Classified Registry Access</p>
      </div>

      <div class="auth-tabs">
        <button class="auth-tab active" id="tab-login">Sign In</button>
        <button class="auth-tab" id="tab-register">Register</button>
      </div>

      <!-- Login Form -->
      <form class="auth-form" id="login-form">
        <div class="auth-field">
          <label>Username or Email</label>
          <input type="text" id="login-username" placeholder="Enter username or email" autocomplete="username" required />
        </div>
        <div class="auth-field">
          <label>Password</label>
          <input type="password" id="login-password" placeholder="Enter password" autocomplete="current-password" required />
        </div>
        <div class="auth-error" id="login-error"></div>
        <button type="submit" class="auth-btn" id="login-btn">Sign In</button>
        <div class="auth-hint">Admin default: <strong>admin</strong> / <strong>Admin1234!</strong></div>
      </form>

      <!-- Register Form -->
      <form class="auth-form hidden" id="register-form">
        <div class="auth-field">
          <label>Username</label>
          <input type="text" id="reg-username" placeholder="Choose a username" autocomplete="username" required />
        </div>
        <div class="auth-field">
          <label>Email</label>
          <input type="email" id="reg-email" placeholder="your@email.com" autocomplete="email" required />
        </div>
        <div class="auth-field">
          <label>Password</label>
          <input type="password" id="reg-password" placeholder="At least 6 characters" autocomplete="new-password" required />
        </div>
        <div class="auth-error" id="reg-error"></div>
        <button type="submit" class="auth-btn" id="reg-btn">Create Account</button>
      </form>
    </div>
  `;
  document.body.appendChild(screen);

  // Tab switching
  screen.querySelector('#tab-login').addEventListener('click', () => {
    screen.querySelector('#tab-login').classList.add('active');
    screen.querySelector('#tab-register').classList.remove('active');
    screen.querySelector('#login-form').classList.remove('hidden');
    screen.querySelector('#register-form').classList.add('hidden');
  });
  screen.querySelector('#tab-register').addEventListener('click', () => {
    screen.querySelector('#tab-register').classList.add('active');
    screen.querySelector('#tab-login').classList.remove('active');
    screen.querySelector('#register-form').classList.remove('hidden');
    screen.querySelector('#login-form').classList.add('hidden');
  });

  // Login
  screen.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = screen.querySelector('#login-btn');
    const errEl = screen.querySelector('#login-error');
    btn.textContent = 'Signing in…';
    btn.disabled = true;
    errEl.textContent = '';
    try {
      await auth.login(
        screen.querySelector('#login-username').value.trim(),
        screen.querySelector('#login-password').value
      );
      screen.remove();
      app.style.display = '';
      store.load();
      updateNavUser();
      navigate();
    } catch (err) {
      errEl.textContent = err.message;
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });

  // Register
  screen.querySelector('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = screen.querySelector('#reg-btn');
    const errEl = screen.querySelector('#reg-error');
    btn.textContent = 'Creating account…';
    btn.disabled = true;
    errEl.textContent = '';
    try {
      await auth.register(
        screen.querySelector('#reg-username').value.trim(),
        screen.querySelector('#reg-email').value.trim(),
        screen.querySelector('#reg-password').value
      );
      screen.remove();
      app.style.display = '';
      store.load();
      updateNavUser();
      navigate();
    } catch (err) {
      errEl.textContent = err.message;
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  });
}

function updateNavUser() {
  const user = auth.getCurrentUser();
  if (!user) return;

  // Update avatar initials
  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    avatar.textContent = user.username.charAt(0).toUpperCase();
    avatar.title = user.username + (user.isAdmin ? ' (Admin)' : '');
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '14px';
    avatar.style.fontWeight = '700';
    avatar.style.color = 'white';
  }

  // Add username + logout to nav-actions
  const navActions = document.querySelector('.nav-actions');
  if (navActions && !navActions.querySelector('#user-menu')) {
    const userMenu = document.createElement('div');
    userMenu.id = 'user-menu';
    userMenu.style.cssText = 'display:flex;align-items:center;gap:8px;';
    userMenu.innerHTML = `
      <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">${user.username}${user.isAdmin ? ' <span style="color:var(--accent-copper);font-size:10px;">[ADMIN]</span>' : ''}</span>
      ${user.isAdmin ? `<button class="icon-btn" id="btn-admin-panel" title="Admin Panel" style="font-size:12px;font-weight:700;">👁</button>` : ''}
      <button class="icon-btn" id="btn-logout" title="Logout" style="font-size:12px;">⎋</button>
    `;
    navActions.appendChild(userMenu);

    navActions.querySelector('#btn-logout').addEventListener('click', () => {
      auth.logout();
      const menu = document.getElementById('user-menu');
      if (menu) menu.remove();
      showAuthScreen();
    });

    if (user.isAdmin) {
      navActions.querySelector('#btn-admin-panel')?.addEventListener('click', () => {
        showAdminPanel();
      });
    }
  }
}

function showAdminPanel() {
  const existing = document.getElementById('admin-panel-overlay');
  if (existing) { existing.remove(); return; }

  const users = store.getUsersWithData();

  const overlay = document.createElement('div');
  overlay.id = 'admin-panel-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:600px;">
      <div class="modal-title">Admin Panel — User Accounts</div>
      <div style="margin-bottom:16px;font-size:12px;color:var(--text-muted);">
        Viewing all registered users and their data. As admin you see all entries combined in the main view.
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border-light);">
            <th style="text-align:left;padding:8px 12px;font-size:10px;letter-spacing:0.08em;color:var(--text-muted);">USERNAME</th>
            <th style="text-align:left;padding:8px 12px;font-size:10px;letter-spacing:0.08em;color:var(--text-muted);">EMAIL</th>
            <th style="text-align:center;padding:8px 12px;font-size:10px;letter-spacing:0.08em;color:var(--text-muted);">NODES</th>
            <th style="text-align:center;padding:8px 12px;font-size:10px;letter-spacing:0.08em;color:var(--text-muted);">PIPELINES</th>
            <th style="text-align:center;padding:8px 12px;font-size:10px;letter-spacing:0.08em;color:var(--text-muted);">ROLE</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="border-bottom:1px solid var(--border-light);">
              <td style="padding:10px 12px;font-weight:600;">${u.username}</td>
              <td style="padding:10px 12px;color:var(--text-secondary);">${u.email}</td>
              <td style="padding:10px 12px;text-align:center;">${u.actorCount}</td>
              <td style="padding:10px 12px;text-align:center;">${u.pipelineCount}</td>
              <td style="padding:10px 12px;text-align:center;">
                ${u.isAdmin ? '<span style="background:var(--accent-copper);color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">ADMIN</span>' : '<span style="background:var(--bg-secondary);color:var(--text-muted);padding:2px 8px;border-radius:4px;font-size:10px;">USER</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="modal-actions">
        <button class="btn cancel" id="close-admin">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#close-admin').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ─── Router ───
function parseHash() {
  const hash = window.location.hash.slice(1) || '/network';
  const parts = hash.split('/').filter(Boolean);
  return { path: parts[0], args: parts.slice(1) };
}

function navigate() {
  const { path, args } = parseHash();
  const main = document.getElementById('main-content');

  if (currentView === 'network') unmountNetwork();
  if (currentView === 'pipeline') unmountPipeline();

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === path ||
      (path === 'dossier' && link.dataset.view === 'network') ||
      (path === 'gate' && link.dataset.view === 'pipelines') ||
      (path === 'pipeline' && link.dataset.view === 'pipelines'));
  });

  switch (path) {
    case 'network':
      currentView = 'network';
      updateSidebar('network');
      mountNetwork(main);
      break;
    case 'dossier':
      currentView = 'dossier';
      updateSidebar('dossier');
      mountDossier(main, args[0]);
      break;
    case 'pipeline':
    case 'pipelines':
      if (args[0]) {
        currentView = 'pipeline';
        updateSidebar('pipeline', args[0]);
        mountPipeline(main, args[0]);
      } else {
        const tags = store.getAllTags();
        if (tags.length > 0) {
          window.location.hash = `/pipeline/${tags[0]}`;
        } else {
          main.innerHTML = '<div style="padding:60px;"><h2>No pipelines available.</h2><p>Create actors with tags to generate pipelines.</p></div>';
        }
      }
      break;
    case 'gate':
      currentView = 'gate';
      updateSidebar('gate', args[0]);
      mountGateDetail(main, args[0], args[1]);
      break;
    default:
      currentView = 'network';
      updateSidebar('network');
      mountNetwork(main);
  }
}

// ─── Sidebar ───
function updateSidebar(view, activeTag) {
  const nav = document.getElementById('sidebar-nav');
  const title = document.querySelector('.sidebar-title');
  const sub = document.querySelector('.sidebar-sub');

  if (view === 'network' || view === 'dossier') {
    title.textContent = 'Global Nodes';
    sub.textContent = 'Demonic Infrastructure';

    const tags = store.getAllTags();
    nav.innerHTML = tags.map(tag => {
      const colors = REGION_COLORS[tag] || { border: '#999', text: '#666' };
      const count = store.getActorsByTag(tag).length;
      return `
        <div class="sidebar-nav-item" data-tag="${tag}">
          <span class="dot" style="background:${colors.border}"></span>
          <span>${tag.charAt(0) + tag.slice(1).toLowerCase()}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--text-muted);">${count}</span>
        </div>
      `;
    }).join('');

    nav.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        window.location.hash = `/pipeline/${item.dataset.tag}`;
      });
    });
  } else if (view === 'pipeline' || view === 'gate') {
    title.textContent = 'The Curator';
    sub.textContent = 'INTELLIGENCE LEAD';

    nav.innerHTML = `
      <div class="sidebar-nav-item" data-nav="network">
        <span class="icon">◈</span> Dashboard
      </div>
      <div class="sidebar-nav-item" data-nav="network">
        <span class="icon">◉</span> Intelligence
      </div>
      <div class="sidebar-nav-item" data-nav="network">
        <span class="icon">✦</span> Node Map
      </div>
      <div class="sidebar-nav-item active" data-nav="pipelines">
        <span class="icon">▤</span> Streams
      </div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-light);">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);padding:4px 12px;margin-bottom:4px;">PIPELINES</div>
        ${store.getAllTags().map(tag => {
          const c = REGION_COLORS[tag] || { border: '#999' };
          return `
            <div class="sidebar-nav-item ${tag === activeTag ? 'active' : ''}" data-pipeline="${tag}">
              <span class="dot" style="background:${c.border}"></span>
              ${tag}
            </div>
          `;
        }).join('')}
      </div>
    `;

    nav.querySelectorAll('[data-nav]').forEach(item => {
      item.addEventListener('click', () => {
        window.location.hash = `/${item.dataset.nav}`;
      });
    });
    nav.querySelectorAll('[data-pipeline]').forEach(item => {
      item.addEventListener('click', () => {
        window.location.hash = `/pipeline/${item.dataset.pipeline}`;
      });
    });
  }
}

// ─── Global Events ───
function setupGlobalEvents() {
  document.getElementById('btn-refresh-map')?.addEventListener('click', () => {
    if (currentView === 'network') {
      unmountNetwork();
      mountNetwork(document.getElementById('main-content'));
    }
  });

  document.getElementById('btn-add-node')?.addEventListener('click', () => {
    if (currentView === 'network') {
      showAddNodeModal();
    } else {
      window.location.hash = '/network';
      setTimeout(() => showAddNodeModal(), 300);
    }
  });

  document.getElementById('global-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) return;
    const matches = store.getActors().filter(a =>
      a.name.toLowerCase().includes(query) ||
      (a.alias || '').toLowerCase().includes(query) ||
      (a.tags || []).some(t => t.toLowerCase().includes(query))
    );
    if (matches.length === 1) window.location.hash = `/dossier/${matches[0].id}`;
  });

  document.getElementById('global-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.toLowerCase().trim();
      const matches = store.getActors().filter(a =>
        a.name.toLowerCase().includes(query) ||
        (a.alias || '').toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        window.location.hash = `/dossier/${matches[0].id}`;
        e.target.value = '';
      }
    }
  });
}

// ─── Init ───
function init() {
  if (!auth.isLoggedIn()) {
    showAuthScreen();
    return;
  }

  setupGlobalEvents();
  updateNavUser();
  window.addEventListener('hashchange', navigate);
  navigate();
}

document.addEventListener('DOMContentLoaded', init);
