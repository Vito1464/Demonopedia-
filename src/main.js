// ─── Demonopedia — Main Entry ────────────────────────
// SPA Router + App Shell

import "/src/style.css?t=1775777587197";
import { store, REGION_COLORS } from "/src/store.js?t=1775777628350";
import { mountNetwork, unmountNetwork, showAddNodeModal } from "/src/network.js?t=1775777729136";
import { mountDossier } from "/src/dossier.js?t=1775777628350";
import { mountPipeline, unmountPipeline } from "/src/pipeline.js?t=1775777628350";
import { mountGateDetail } from "/src/gate.js?t=1775777628350";

let currentView = null;

// ─── Router ───
function parseHash() {
  const hash = window.location.hash.slice(1) || '/network';
  const parts = hash.split('/').filter(Boolean);
  return { path: parts[0], args: parts.slice(1) };
}

function navigate() {
  const { path, args } = parseHash();
  const main = document.getElementById('main-content');

  // Cleanup previous view
  if (currentView === 'network') unmountNetwork();
  if (currentView === 'pipeline') unmountPipeline();

  // Update nav links
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
        // Show pipeline index — default to first tag
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

    // Click tag to filter/highlight
    nav.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tag = item.dataset.tag;
        window.location.hash = `/pipeline/${tag}`;
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

// ─── Event Listeners ───
function setupGlobalEvents() {
  // Refresh map button
  document.getElementById('btn-refresh-map')?.addEventListener('click', () => {
    if (currentView === 'network') {
      unmountNetwork();
      const main = document.getElementById('main-content');
      mountNetwork(main);
    }
  });

  // Add node button
  document.getElementById('btn-add-node')?.addEventListener('click', () => {
    if (currentView === 'network') {
      showAddNodeModal();
    } else {
      // Navigate to network first, then add
      window.location.hash = '/network';
      setTimeout(() => showAddNodeModal(), 300);
    }
  });

  // Global search
  document.getElementById('global-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) return;

    // Search actors
    const matches = store.getActors().filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.alias.toLowerCase().includes(query) ||
      a.tags.some(t => t.toLowerCase().includes(query))
    );

    // Show search results (simple dropdown approach) - future enhancement
    // For now, navigate to first match
    if (matches.length === 1) {
      window.location.hash = `/dossier/${matches[0].id}`;
    }
  });

  document.getElementById('global-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.toLowerCase().trim();
      const matches = store.getActors().filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.alias.toLowerCase().includes(query)
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
  setupGlobalEvents();
  window.addEventListener('hashchange', navigate);
  navigate();
}

document.addEventListener('DOMContentLoaded', init);