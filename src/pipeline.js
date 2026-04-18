// ─── Pipeline View ──────────────────────────────────────────
// Subway-style flowchart with draggable gates and animated transit dots

import { store, REGION_COLORS, NODE_COLORS } from "/src/store.js";

let svgEl, dotSvgEl, container;
let currentPipeline = null;
let currentTag = null;
let dragState = null;
let dragRafPending = false;   // throttle drag renders to one per RAF
let connectMode = null; // { fromGateId }
let connectModeActive = false;
let transitDots = [];
let animFrame;

const GATE_W = 180;
const GATE_H = 48;
const DOT_RADIUS = 8;
const DOT_SPEED = 0.5; // pixels per frame

function getActorColor(actorId) {
  const actors = store.getActors();
  const idx = actors.findIndex(a => a.id === actorId);
  return NODE_COLORS[idx % NODE_COLORS.length];
}

function getActorName(actorId) {
  const actor = store.getActor(actorId);
  return actor ? actor.alias || actor.name : 'Unknown';
}

function buildOrthogonalPath(x1, y1, x2, y2) {
  // Create a right-angle path (subway style)
  const midX = (x1 + x2) / 2;
  if (Math.abs(y1 - y2) < 10) {
    // Horizontal
    return `M ${x1},${y1} L ${x2},${y2}`;
  }
  // Go right to midpoint, then down/up, then right to target
  return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
}

function createTransitDots() {
  // Remove old dot elements from the dot layer
  if (dotSvgEl) dotSvgEl.innerHTML = '';
  transitDots = [];
  if (!currentPipeline || !dotSvgEl) return;

  const gates = currentPipeline.gates;
  // Limit total dots to prevent overload (cap at 30)
  let dotCount = 0;
  const MAX_DOTS = 30;

  gates.forEach(gate => {
    gate.connections.forEach(targetId => {
      if (dotCount >= MAX_DOTS) return;
      const targetGate = gates.find(g => g.id === targetId);
      if (!targetGate) return;

      gate.taggedPeople.forEach(personId => {
        if (dotCount >= MAX_DOTS) return;
        const color = getActorColor(personId);
        const nameStr = getActorName(personId);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', DOT_RADIUS);
        circle.setAttribute('fill', color);
        circle.setAttribute('class', 'transit-dot');
        // Removed dot-glow filter — it was triggering GPU compositing on every frame
        circle.style.cursor = 'pointer';
        dotSvgEl.appendChild(circle);

        circle.addEventListener('mouseenter', () => {
          circle.setAttribute('r', DOT_RADIUS + 3);
          container.querySelector('#transit-tooltip')?.remove();
          const tooltip = document.createElement('div');
          tooltip.className = 'node-tooltip visible';
          tooltip.style.left = (parseFloat(circle.getAttribute('cx')) + 20) + 'px';
          tooltip.style.top = (parseFloat(circle.getAttribute('cy')) - 10) + 'px';
          tooltip.textContent = nameStr;
          tooltip.id = 'transit-tooltip';
          container.appendChild(tooltip);
        });
        circle.addEventListener('mouseleave', () => {
          circle.setAttribute('r', DOT_RADIUS);
          container.querySelector('#transit-tooltip')?.remove();
        });
        circle.addEventListener('click', () => {
          window.location.hash = `/dossier/${personId}`;
        });

        transitDots.push({
          personId,
          fromGate: gate,
          toGate: targetGate,
          progress: Math.random(),
          speed: DOT_SPEED + Math.random() * 0.3,
          stopped: false,
          color,
          circleEl: circle
        });
        dotCount++;
      });
    });
  });
}

function renderSVG() {
  if (!currentPipeline || !svgEl) return;

  const gates = currentPipeline.gates;
  let svgContent = '';

  // Minimal defs — no dot-glow filter (moved dots to separate layer)
  svgContent += `
    <defs>
      <filter id="gate-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.15"/>
      </filter>
    </defs>
  `;

  // Draw connections first (behind gates)
  gates.forEach(gate => {
    gate.connections.forEach(targetId => {
      const target = gates.find(g => g.id === targetId);
      if (!target) return;

      const x1 = gate.x + GATE_W;
      const y1 = gate.y + GATE_H / 2;
      const x2 = target.x;
      const y2 = target.y + GATE_H / 2;

      const pathD = buildOrthogonalPath(x1, y1, x2, y2);

      svgContent += `
        <path d="${pathD}" class="gate-connection" data-from="${gate.id}" data-to="${targetId}"
              stroke="${target.status === 'pending' ? 'rgba(196,69,54,0.3)' : 'rgba(90,90,90,0.25)'}"
              stroke-width="2" fill="none" />
      `;

      // Small junction dots at connection points
      svgContent += `<circle cx="${x1}" cy="${y1}" r="4" fill="#6B7B6E" opacity="0.5"/>`;
      svgContent += `<circle cx="${x2}" cy="${y2}" r="4" fill="${target.status === 'pending' ? '#C44536' : '#6B7B6E'}" opacity="0.5"/>`;
    });
  });

  // Draw gates
  gates.forEach((gate, idx) => {
    const statusColor = gate.status === 'active' ? '#4A7C59' : '#C44536';
    const statusLabel = gate.status === 'active' ? 'SYNC' : 'HOLD';
    const gateNum = String(idx + 1).padStart(2, '0');

    svgContent += `
      <g class="gate-node" data-gate-id="${gate.id}" transform="translate(${gate.x}, ${gate.y})">
        <rect width="${GATE_W}" height="${GATE_H}" fill="#1E2420" rx="4" ry="4" filter="url(#gate-shadow)"/>
        <text x="12" y="17" fill="#A8C0AC" class="gate-number-text">GATE ${gateNum}</text>
        <text x="12" y="35" fill="#FFFFFF" class="gate-label-text" font-size="13">${gate.name}</text>
        <rect x="${GATE_W - 48}" y="8" width="40" height="16" rx="3" fill="${statusColor}" class="gate-status-dot" data-gate-id="${gate.id}" opacity="0.9"/>
        <text x="${GATE_W - 28}" y="20" fill="white" font-size="8" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="600" pointer-events="none">${statusLabel}</text>
      </g>
    `;
  });

  svgEl.innerHTML = svgContent;

  // Setup gate dragging
  setupGateDragging();
  setupGateClicks();
}

function setupGateDragging() {
  const gateNodes = svgEl.querySelectorAll('.gate-node');

  gateNodes.forEach(gateEl => {
    const gateId = gateEl.dataset.gateId;

    gateEl.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('gate-status-dot')) return;
      if (connectMode) return;

      e.preventDefault();
      const svgRect = svgEl.getBoundingClientRect();
      const gate = currentPipeline.gates.find(g => g.id === gateId);
      if (!gate) return;

      dragState = {
        gateId,
        startX: e.clientX,
        startY: e.clientY,
        origX: gate.x,
        origY: gate.y,
        moved: false,
      };
    });
  });

  const onMouseMove = (e) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragState.moved = true;
    }

    const gate = currentPipeline.gates.find(g => g.id === dragState.gateId);
    if (gate) {
      gate.x = dragState.origX + dx;
      gate.y = dragState.origY + dy;
      // Throttle: only schedule one renderSVG per animation frame
      if (!dragRafPending) {
        dragRafPending = true;
        requestAnimationFrame(() => {
          dragRafPending = false;
          renderSVG();
        });
      }
    }
  };

  const onMouseUp = () => {
    if (dragState && dragState.moved) {
      store.updateGate(currentTag, dragState.gateId, {
        x: currentPipeline.gates.find(g => g.id === dragState.gateId)?.x,
        y: currentPipeline.gates.find(g => g.id === dragState.gateId)?.y,
      });
    }
    dragState = null;
  };

  svgEl.addEventListener('mousemove', onMouseMove);
  svgEl.addEventListener('mouseup', onMouseUp);
  svgEl.addEventListener('mouseleave', onMouseUp);
}

function setupGateClicks() {
  svgEl.querySelectorAll('.gate-node').forEach(gateEl => {
    const gateId = gateEl.dataset.gateId;

    gateEl.addEventListener('click', (e) => {
      if (dragState && dragState.moved) return;

      // If in connect mode, create connection
      if (connectMode && connectMode.fromGateId) {
        if (connectMode.fromGateId !== gateId) {
          store.connectGates(currentTag, connectMode.fromGateId, gateId);
          currentPipeline = store.getPipeline(currentTag);
          renderSVG();
          createTransitDots();
        }
        connectMode = null;
        updateConnectButton();
        return;
      }

      if (connectModeActive) {
        connectMode = { fromGateId: gateId };
        updateConnectButton();
        return;
      }

      // Toggle status on status dot click
      if (e.target.classList.contains('gate-status-dot')) {
        const gate = currentPipeline.gates.find(g => g.id === gateId);
        if (gate) {
          const newStatus = gate.status === 'active' ? 'pending' : 'active';
          store.updateGate(currentTag, gateId, { status: newStatus });
          currentPipeline = store.getPipeline(currentTag);
          renderSVG();
          createTransitDots();
        }
        return;
      }

      // Navigate to gate detail
      window.location.hash = `/gate/${currentTag}/${gateId}`;
    });

    // Right-click to start connection
    gateEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      connectMode = { fromGateId: gateId };
      updateConnectButton();
    });
  });
}

function updateConnectButton() {
  const btn = container.querySelector('#connect-mode-btn');
  if (btn) {
    if (connectMode) {
      btn.textContent = '🔗 Click Target Gate';
      btn.style.background = '#fff3e0';
      btn.style.color = '#c2570a';
      btn.style.border = '1px solid #c2570a';
    } else if (connectModeActive) {
      btn.textContent = '✕ Select Source Gate';
      btn.style.background = '#fff3e0';
      btn.style.color = '#c2570a';
      btn.style.border = '1px solid #c2570a';
    } else {
      btn.textContent = '🔗 Connect Mode';
      btn.style.background = 'var(--bg-dark)';
      btn.style.color = 'white';
      btn.style.border = 'none';
    }
  }
}

function animateTransitDots() {
  if (!svgEl || !currentPipeline) return;

  transitDots.forEach(dot => {
    const from = dot.fromGate;
    const to = dot.toGate;

    // Dynamically check if the target gate is closed (pending)
    const stopAtTarget = to.status === 'pending';

    const x1 = from.x + GATE_W;
    const y1 = from.y + GATE_H / 2;
    const x2 = to.x;
    const y2 = to.y + GATE_H / 2;
    const midX = (x1 + x2) / 2;

    // Update progress
    if (!dot.stopped) {
      dot.progress += dot.speed / 300;
      if (dot.progress >= 1) {
        if (stopAtTarget) {
          dot.progress = 0.95;
          dot.stopped = true;
        } else {
          dot.progress = 0;
        }
      } else if (stopAtTarget && dot.progress >= 0.95) {
        // Hit the gate boundary — stop
        dot.progress = 0.95;
        dot.stopped = true;
      }
    } else if (!stopAtTarget) {
      // Gate was opened — resume
      dot.stopped = false;
    }

    // Calculate position
    let cx, cy;
    const t = dot.progress;

    if (Math.abs(y1 - y2) < 10) {
      // Simple horizontal
      cx = x1 + (x2 - x1) * t;
      cy = y1;
    } else {
      // Three segments: horizontal, vertical, horizontal
      const seg1Len = Math.abs(midX - x1);
      const seg2Len = Math.abs(y2 - y1);
      const seg3Len = Math.abs(x2 - midX);
      const totalLen = seg1Len + seg2Len + seg3Len || 1;

      const pos = t * totalLen;

      if (pos <= seg1Len) {
        cx = x1 + (midX - x1) * (pos / seg1Len);
        cy = y1;
      } else if (pos <= seg1Len + seg2Len) {
        cx = midX;
        cy = y1 + (y2 - y1) * ((pos - seg1Len) / seg2Len);
      } else {
        cx = midX + (x2 - midX) * ((pos - seg1Len - seg2Len) / seg3Len);
        cy = y2;
      }
    }

    // Only update attributes, no DOM thrashing!
    dot.circleEl.setAttribute('cx', cx);
    dot.circleEl.setAttribute('cy', cy);
  });

  animFrame = requestAnimationFrame(animateTransitDots);
}

function createPipelineUI() {
  const pipe = currentPipeline;
  const colors = REGION_COLORS[currentTag] || REGION_COLORS.FINANCIAL;

  // Compute stats
  const activeGates = pipe.gates.filter(g => g.status === 'active').length;
  const totalGates = pipe.gates.length;
  const totalPeople = new Set(pipe.gates.flatMap(g => g.taggedPeople)).size;
  const capacity = totalGates > 0 ? Math.round((activeGates / totalGates) * 100) : 0;

  container.innerHTML = `
    <div class="pipeline-view fade-enter">
      <div class="pipeline-header">
        <div>
          <div class="dossier-back" id="pipeline-back">← Back to Network</div>
          <h1 class="pipeline-title">Chains-of-Thought</h1>
          <div class="pipeline-subtitle">TRANSIT MAP INTERFACE — ${currentTag} PIPELINE — HIGH DENSITY GRID</div>
        </div>
        <div class="pipeline-status">
          <div class="status-badge">
            <span class="dot" style="background:${activeGates === totalGates ? '#4A7C59' : '#C17F4E'}"></span>
            LOAD: ${activeGates === totalGates ? 'OPTIMAL' : 'PARTIAL'}
          </div>
          <button class="btn" id="add-gate-btn">+ Add Gate</button>
          <button class="btn" id="connect-mode-btn" style="background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border-light);">🔗 Connect</button>
          <button class="btn" id="depart-btn">Depart All</button>
        </div>
      </div>

      <div class="pipeline-watermark">${currentTag}_ALPHA</div>

      <div class="pipeline-canvas-container">
        <svg id="pipeline-svg" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;"></svg>
        <svg id="pipeline-dot-svg" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></svg>
      </div>

      <div class="pipeline-bottom-bar">
        <div class="pipeline-stats">
          <div class="pipeline-stat">
            <div class="stat-label">GATES</div>
            <div class="stat-value">${totalGates}</div>
          </div>
          <div class="pipeline-stat">
            <div class="stat-label">ACTIVE</div>
            <div class="stat-value">${activeGates}</div>
          </div>
          <div class="pipeline-stat">
            <div class="stat-label">OPERATIVES</div>
            <div class="stat-value">${totalPeople}</div>
          </div>
        </div>
        <div class="pipeline-capacity">
          <div class="cap-label">CAPACITY</div>
          <div class="cap-bar">
            <div class="cap-fill" style="width:${capacity}%"></div>
          </div>
          <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;">${capacity}%</span>
        </div>
      </div>

      <div class="terminal-log" id="terminal-log">
        <div class="terminal-log-title">Terminal Log</div>
        <div class="terminal-log-entry">
          <div class="entry-label">BOARDING INFO</div>
          <div class="entry-text">All gates operating. Grid density nominal.</div>
        </div>
        ${pipe.gates.filter(g => g.status === 'pending').map(g => `
          <div class="terminal-log-entry">
            <div class="entry-label alert">TRACK NOTICE</div>
            <div class="entry-text">Gate ${g.name} — status PENDING. Awaiting sync authorization.</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  svgEl = container.querySelector('#pipeline-svg');
  dotSvgEl = container.querySelector('#pipeline-dot-svg');

  // Back
  container.querySelector('#pipeline-back').addEventListener('click', () => {
    window.location.hash = '/network';
  });

  // Add gate
  container.querySelector('#add-gate-btn').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-content" style="max-width:320px;"><div class="modal-title">Add New Gate</div><div class="modal-field"><label>Gate Name</label><input type="text" id="gate-name-input" placeholder="e.g. CHECKPOINT_A" style="width:100%;padding:10px;border:1px solid var(--border-light);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);" autofocus /></div><div class="modal-actions" style="margin-top:16px;"><button class="btn cancel" id="gate-cancel">Cancel</button><button class="btn primary" id="gate-confirm">Add</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#gate-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#gate-confirm').onclick = () => {
      const name = overlay.querySelector('#gate-name-input').value.trim();
      overlay.remove();
      if (name) {
        store.addGate(currentTag, {
          name: name.toUpperCase().replace(/\s+/g, '_'),
          label: name,
          x: 200 + Math.random() * 300,
          y: 150 + Math.random() * 200,
        });
        currentPipeline = store.getPipeline(currentTag);
        renderSVG();
        createTransitDots(); // rebuild dots AFTER renderSVG
      }
    };
  });

  // Connect mode
  container.querySelector('#connect-mode-btn').addEventListener('click', () => {
    connectModeActive = !connectModeActive;
    if (!connectModeActive) {
      connectMode = null;
    }
    updateConnectButton();
  });

  // Depart all (restart animations)
  container.querySelector('#depart-btn').addEventListener('click', () => {
    transitDots.forEach(dot => {
      dot.progress = 0;
      dot.stopped = false;
    });
  });

  renderSVG();
  createTransitDots();

  // Cancel any leftover animation loop before starting a fresh one
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;
  animateTransitDots();
}

export function mountPipeline(containerEl, tag) {
  container = containerEl;
  currentTag = tag;
  currentPipeline = store.getPipeline(tag);

  if (!currentPipeline) {
    store.ensurePipeline(tag);
    currentPipeline = store.getPipeline(tag);
  }

  createPipelineUI();
}

export function unmountPipeline() {
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = null;
  transitDots = [];
  dragState = null;
  connectMode = null;
}