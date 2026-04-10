// ─── Network View ───────────────────────────────────────────
// Force-directed graph with gravitational tag regions
// Obsidian-style bouncy nodes with physics simulation

import { store, REGION_COLORS, REGION_CORNERS, NODE_COLORS } from "/src/store.js";

const PHYSICS = {
  repulsion: 4000,        // Node-node repulsion strength
  attraction: 0.008,      // Edge spring constant
  restLength: 120,        // Edge rest length
  gravity: 0.03,          // Region gravitational pull
  centerGravity: 0.002,   // Pull toward canvas center
  damping: 0.88,          // Velocity damping per frame
  maxVelocity: 8,         // Maximum velocity cap
  bounceDecay: 0.6,       // Bounce energy retention
  nodeRadius: 7,          // Default node size
  hoverRadius: 10,        // Node size on hover
};

let canvas, ctx;
let width, height;
let nodes = [];
let edges = [];
let regionCards = [];
let hoveredNode = null;
let hoveredRegion = null;
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let didDrag = false;
let mousedownPos = { x: 0, y: 0 };
let connectModeNode = null;
let connectModeActive = false;
let mousePos = { x: 0, y: 0 };
let animFrame;
let tooltip;
let container;
let regionElements = {};
let zoom = 1;
let pan = { x: 0, y: 0 };
let resizeHandler = null;

function getNodeColor(idx) {
  return NODE_COLORS[idx % NODE_COLORS.length];
}

function initNodes() {
  const actors = store.getActors();
  const storeEdges = store.getEdges();

  // Initialize node positions near their gravitational regions
  nodes = actors.map((actor, i) => {
    const tags = actor.tags || [];
    let startX = width / 2 + (Math.random() - 0.5) * width * 0.4;
    let startY = height / 2 + (Math.random() - 0.5) * height * 0.4;

    // Bias starting position toward first tag region
    if (tags.length > 0 && REGION_CORNERS[tags[0]]) {
      const corner = REGION_CORNERS[tags[0]];
      startX = corner.x * width + (Math.random() - 0.5) * 150;
      startY = corner.y * height + (Math.random() - 0.5) * 150;
    }

    return {
      id: actor.id,
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      radius: PHYSICS.nodeRadius,
      color: getNodeColor(i),
      actor: actor,
      tags: tags,
      springFactor: 0, // For bounce animation
    };
  });

  edges = storeEdges.map(e => ({
    source: nodes.find(n => n.id === e.source),
    target: nodes.find(n => n.id === e.target),
    isExplicit: true,
  })).filter(e => e.source && e.target);

  // Dynamically connect nodes that share tags
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].tags.some(t => nodes[j].tags.includes(t));
      if (shared) {
        const exists = edges.some(e => 
          (e.source === nodes[i] && e.target === nodes[j]) || 
          (e.source === nodes[j] && e.target === nodes[i])
        );
        if (!exists) {
          edges.push({ source: nodes[i], target: nodes[j], isExplicit: false });
        }
      }
    }
  }
}

function applyForces() {
  const n = nodes.length;

  // Node-node repulsion
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i], b = nodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 20) dist = 20;

      const force = PHYSICS.repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  // Edge spring attraction
  edges.forEach(edge => {
    const a = edge.source, b = edge.target;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - PHYSICS.restLength;
    const force = PHYSICS.attraction * displacement;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  });

  // Region gravitational pull
  const allTags = store.getAllTags();
  allTags.forEach(tag => {
    const corner = REGION_CORNERS[tag];
    if (!corner) return;

    const cx = corner.x * width;
    const cy = corner.y * height;

    nodes.forEach(node => {
      if (!node.tags.includes(tag)) return;

      const dx = cx - node.x;
      const dy = cy - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Stronger pull when further away, with diminishing returns
      const pullStrength = PHYSICS.gravity * Math.min(dist, 400);
      node.vx += (dx / dist) * pullStrength;
      node.vy += (dy / dist) * pullStrength;
    });
  });

  // Center gravity (gentle pull to prevent drift)
  nodes.forEach(node => {
    const dx = width / 2 - node.x;
    const dy = height / 2 - node.y;
    node.vx += dx * PHYSICS.centerGravity;
    node.vy += dy * PHYSICS.centerGravity;
  });

  // Update positions
  nodes.forEach(node => {
    if (node === draggedNode) return;

    // Apply damping
    node.vx *= PHYSICS.damping;
    node.vy *= PHYSICS.damping;

    // Velocity cap
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    if (speed > PHYSICS.maxVelocity) {
      node.vx = (node.vx / speed) * PHYSICS.maxVelocity;
      node.vy = (node.vy / speed) * PHYSICS.maxVelocity;
    }

    node.x += node.vx;
    node.y += node.vy;

    // Boundary bounce
    const margin = 40;
    if (node.x < margin) { node.x = margin; node.vx *= -PHYSICS.bounceDecay; }
    if (node.x > width - margin) { node.x = width - margin; node.vx *= -PHYSICS.bounceDecay; }
    if (node.y < margin) { node.y = margin; node.vy *= -PHYSICS.bounceDecay; }
    if (node.y > height - margin) { node.y = height - margin; node.vy *= -PHYSICS.bounceDecay; }

    // Bounce spring animation
    if (node.springFactor > 0.01) {
      node.springFactor *= 0.92;
    } else {
      node.springFactor = 0;
    }
  });
}

function drawRegionGradients() {
  const allTags = store.getAllTags();

  allTags.forEach(tag => {
    const corner = REGION_CORNERS[tag];
    const colors = REGION_COLORS[tag];
    if (!corner || !colors) return;

    const cx = corner.x * width;
    const cy = corner.y * height;
    const radius = Math.min(width, height) * 0.45;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

    if (hoveredRegion === tag) {
      gradient.addColorStop(0, colors.glow.replace('0.25', '0.35'));
      gradient.addColorStop(0.5, colors.bg.replace('0.12', '0.15'));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      gradient.addColorStop(0, colors.glow);
      gradient.addColorStop(0.5, colors.bg);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });
}

function drawEdges() {
  edges.forEach(edge => {
    const a = edge.source, b = edge.target;

    const isHighlighted = hoveredRegion ?
      (a.tags.includes(hoveredRegion) && b.tags.includes(hoveredRegion)) : true;
    const dimmed = hoveredRegion && !isHighlighted;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    
    if (dimmed) {
      ctx.strokeStyle = 'rgba(180,180,180,0.1)';
      ctx.lineWidth = 0.5;
    } else {
      ctx.strokeStyle = edge.isExplicit ? 'rgba(160,160,160,0.45)' : 'rgba(160,160,160,0.15)';
      ctx.lineWidth = edge.isExplicit ? 1.5 : 0.8;
    }
    
    ctx.stroke();
  });

  // Draw tentative connection line
  if (connectModeNode) {
    ctx.beginPath();
    ctx.moveTo(connectModeNode.x, connectModeNode.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.strokeStyle = 'rgba(210,105,30,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawNodes() {
  nodes.forEach(node => {
    const isInRegion = hoveredRegion ? node.tags.includes(hoveredRegion) : true;
    const dimmed = hoveredRegion && !isInRegion;
    const isHovered = node === hoveredNode;

    // Bounce effect
    const bounce = 1 + node.springFactor * 0.5 * Math.sin(Date.now() / 60);
    const r = (isHovered ? PHYSICS.hoverRadius : node.radius) * bounce;

    // Glow effect for hovered
    if (isHovered && !dimmed) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(193,127,78,0.15)`;
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

    if (dimmed) {
      ctx.fillStyle = 'rgba(180,180,180,0.2)';
    } else {
      ctx.fillStyle = node.color;
      ctx.shadowColor = node.color;
      ctx.shadowBlur = isHovered ? 12 : 4;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label for hovered node
    if (isHovered && !dimmed) {
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#1a1b1a';
      ctx.textAlign = 'center';
      ctx.fillText(node.actor.name, node.x, node.y + r + 18);
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#4b5563';
      ctx.fillText(node.actor.alias, node.x, node.y + r + 32);
    }
  });
}

function render() {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#fdfcf9';
  ctx.fillRect(0, 0, width, height);

  drawRegionGradients();
  drawEdges();
  drawNodes();

  applyForces();
  animFrame = requestAnimationFrame(render);
}

function getNodeAtPos(mx, my) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const dx = mx - node.x, dy = my - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < PHYSICS.hoverRadius + 4) return node;
  }
  return null;
}

function getRegionAtPos(mx, my) {
  const allTags = store.getAllTags();
  for (const tag of allTags) {
    const corner = REGION_CORNERS[tag];
    if (!corner) continue;
    const cx = corner.x * width;
    const cy = corner.y * height;
    const dx = mx - cx, dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < Math.min(width, height) * 0.18) return tag;
  }
  return null;
}

function setupEvents() {
  let _mt=0;
  canvas.addEventListener('mousemove', (e) => {
    if(Date.now()-_mt<35)return; _mt=Date.now();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    mousePos.x = mx;
    mousePos.y = my;

    if (draggedNode) {
      draggedNode.x = mx - dragOffset.x;
      draggedNode.y = my - dragOffset.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
      
      if (Math.hypot(mx - mousedownPos.x, my - mousedownPos.y) > 3) {
        didDrag = true;
      }
      return;
    }

    const node = getNodeAtPos(mx, my);
    hoveredNode = node;
    canvas.style.cursor = node ? 'pointer' : 'default';

    // Check region hover
    if (!node) {
      hoveredRegion = getRegionAtPos(mx, my);
      // Update region card highlighting
      updateRegionCardHighlights();
    } else {
      hoveredRegion = null;
      updateRegionCardHighlights();
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const node = getNodeAtPos(mx, my);
    if (node) {
      draggedNode = node;
      didDrag = false;
      mousedownPos.x = mx;
      mousedownPos.y = my;
      dragOffset.x = mx - node.x;
      dragOffset.y = my - node.y;
      canvas.classList.add('grabbing');
      e.preventDefault();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (draggedNode) {
      // Give a little bounce when released
      draggedNode.springFactor = 1;
      draggedNode.vx = (Math.random() - 0.5) * 2;
      draggedNode.vy = (Math.random() - 0.5) * 2;
      draggedNode = null;
      canvas.classList.remove('grabbing');
    }
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (didDrag) { didDrag = false; return; }
    const node = getNodeAtPos(mx, my);
    
    if (connectModeNode) {
      if (node && node !== connectModeNode) {
        // Complete connection
        const exists = edges.some(edge => 
          (edge.source === connectModeNode && edge.target === node) || 
          (edge.source === node && edge.target === connectModeNode)
        );
        if (!exists) {
          store.addEdge(connectModeNode.id, node.id);
          edges.push({ source: connectModeNode, target: node, isExplicit: true });
          
          // Small physics bump to show connection
          node.vx += (connectModeNode.x - node.x) * 0.05;
          node.vy += (connectModeNode.y - node.y) * 0.05;
          connectModeNode.vx += (node.x - connectModeNode.x) * 0.05;
          connectModeNode.vy += (node.y - connectModeNode.y) * 0.05;
        }
      }
      connectModeNode = null;
      return;
    }

    if (connectModeActive && node) {
      connectModeNode = node;
      return;
    }

    if (node) {
      // Navigate to dossier
      window.location.hash = `/dossier/${node.id}`;
      return;
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = getNodeAtPos(mx, my);
    if (node) {
      connectModeNode = node;
    } else {
      connectModeNode = null;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredNode = null;
    hoveredRegion = null;
    updateRegionCardHighlights();
  });
}

function updateRegionCardHighlights() {
  Object.entries(regionElements).forEach(([tag, el]) => {
    if (hoveredRegion === tag) {
      el.style.transform = 'translateY(-4px) scale(1.03)';
      el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
    } else if (hoveredRegion && hoveredRegion !== tag) {
      el.style.opacity = '0.4';
      el.style.transform = '';
      el.style.boxShadow = '';
    } else {
      el.style.opacity = '1';
      el.style.transform = '';
      el.style.boxShadow = '';
    }
  });
}

function createRegionCards() {
  const allTags = store.getAllTags();

  const quadrants = { tl: 0, tr: 0, bl: 0, br: 0 };
  const cardHeight = 84 + 36; // height + extended spacing

  allTags.forEach(tag => {
    const corner = REGION_CORNERS[tag];
    const colors = REGION_COLORS[tag];
    if (!corner || !colors) return;

    const actors = store.getActorsByTag(tag);
    const totalActors = store.getActors().length;
    const density = totalActors > 0 ? Math.round((actors.length / totalActors) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'region-card';
    card.innerHTML = `
      <div style="display:flex;align-items:center;">
        <span class="region-dot" style="background:${colors.border}"></span>
        <span class="region-name">${tag}</span>
      </div>
      <div class="region-info">Node Density: ${density}%</div>
      <div class="region-bar">
        <div class="region-bar-fill" style="width:${density}%;background:${colors.border}"></div>
      </div>
    `;

    // Position based on corner with cascading y-offsets
    if (corner.x < 0.5 && corner.y < 0.5) {
      card.style.top = (20 + quadrants.tl * cardHeight) + 'px'; 
      card.style.left = '20px';
      quadrants.tl++;
    } else if (corner.x >= 0.5 && corner.y < 0.5) {
      card.style.top = (20 + quadrants.tr * cardHeight) + 'px'; 
      card.style.right = '20px';
      quadrants.tr++;
    } else if (corner.x < 0.5 && corner.y >= 0.5) {
      card.style.bottom = (80 + quadrants.bl * cardHeight) + 'px'; 
      card.style.left = '20px';
      quadrants.bl++;
    } else {
      card.style.bottom = (80 + quadrants.br * cardHeight) + 'px'; 
      card.style.right = '20px';
      quadrants.br++;
    }

    let isDragging = false;
    let didDragCard = false;
    let dragStartX, dragStartY, cardStartX, cardStartY;

    card.addEventListener('mousedown', (e) => {
      isDragging = true;
      didDragCard = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      cardStartX = card.offsetLeft;
      cardStartY = card.offsetTop;
      
      // Convert to explicit positioning to clear right/bottom constraints when dragging begins
      card.style.right = 'auto';
      card.style.bottom = 'auto';
      card.style.left = cardStartX + 'px';
      card.style.top = cardStartY + 'px';
      
      card.style.zIndex = '100';
      card.style.cursor = 'grabbing';
      e.stopPropagation(); 
    });

    const onCardMouseMove = (e) => {
      if (!isDragging) return;
      if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5) {
        didDragCard = true;
      }
      if (!didDragCard) return;

      let newX = cardStartX + (e.clientX - dragStartX);
      let newY = cardStartY + (e.clientY - dragStartY);
      
      newX = Math.max(0, Math.min(width - card.offsetWidth, newX));
      newY = Math.max(0, Math.min(height - card.offsetHeight, newY));

      card.style.left = newX + 'px';
      card.style.top = newY + 'px';

      // Dynamically update gravity well position in store
      corner.x = (newX + card.offsetWidth / 2) / width;
      corner.y = (newY + card.offsetHeight / 2) / height;
    };

    const onCardMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      card.style.zIndex = '10';
      card.style.cursor = 'pointer';
      
      if (!didDragCard) {
         window.location.hash = `/pipeline/${tag}`;
      }
    };

    window.addEventListener('mousemove', onCardMouseMove);
    window.addEventListener('mouseup', onCardMouseUp);

    card.addEventListener('mouseenter', () => {
      if (isDragging) return;
      hoveredRegion = tag;
      updateRegionCardHighlights();
    });
    card.addEventListener('mouseleave', () => {
      hoveredRegion = null;
      updateRegionCardHighlights();
    });

    container.appendChild(card);
    regionElements[tag] = card;
  });
}

function createControls() {
  // Right-side controls
  const controls = document.createElement('div');
  controls.className = 'network-controls';
  controls.innerHTML = `
    <button id="net-connect-btn" style="background:#fff;border:none;border-radius:12px;width:40px;height:40px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;cursor:pointer;color:#444;box-shadow:0 4px 14px rgba(0,0,0,0.08);margin-right:8px;vertical-align:middle;transition:all 0.2s;">◇</button><button id="net-add" style="background:#1a1a1a;color:#fff;border-color:#000;" title="Add Node">+</button>
  `;
  container.appendChild(controls);

  controls.querySelector('#net-connect-btn').addEventListener('click',()=>{connectModeActive=!connectModeActive;if(!connectModeActive)connectModeNode=null;const b=controls.querySelector('#net-connect-btn');if(connectModeActive){b.textContent='✕';b.style.background='#fff3e0';b.style.color='#c2570a';b.style.boxShadow='inset 0 2px 5px rgba(0,0,0,0.05)';}else{b.textContent='◇';b.style.background='#fff';b.style.color='#444';b.style.boxShadow='0 4px 14px rgba(0,0,0,0.08)';}});
  controls.querySelector('#net-add').addEventListener('click', () => {
    showAddNodeModal();
  });

  // Bottom bar
  const bottomBar = document.createElement('div');
  bottomBar.className = 'network-bottom-bar';
  bottomBar.innerHTML = `
    <button id="net-zoom-in">🔍 ZOOM IN</button>
    <button id="net-reset" class="primary">↻ RESET VIEW</button>
    <button id="net-zoom-out">🔍 ZOOM OUT</button>
  `;
  container.appendChild(bottomBar);

  bottomBar.querySelector('#net-reset').addEventListener('click', () => {
    // Re-randomize positions
    nodes.forEach(node => {
      const tags = node.tags;
      if (tags.length > 0 && REGION_CORNERS[tags[0]]) {
        const corner = REGION_CORNERS[tags[0]];
        node.x = corner.x * width + (Math.random() - 0.5) * 150;
        node.y = corner.y * height + (Math.random() - 0.5) * 150;
      } else {
        node.x = width / 2 + (Math.random() - 0.5) * width * 0.5;
        node.y = height / 2 + (Math.random() - 0.5) * height * 0.5;
      }
      node.vx = 0;
      node.vy = 0;
      node.springFactor = 1;
    });
  });
}

function showAddNodeModal() {
  const allTags = store.getAllTags();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  let selectedTags = [];

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">Add New Node</div>
      <div class="modal-field">
        <label>Subject Name</label>
        <input type="text" id="modal-name" placeholder="Enter subject name..." />
      </div>
      <div class="modal-field">
        <label>Alias</label>
        <input type="text" id="modal-alias" placeholder="The ___" />
      </div>
      <div class="modal-field">
        <label>Role</label>
        <input type="text" id="modal-role" placeholder="Operational role..." />
      </div>
      <div class="modal-field">
        <label>Affiliation</label>
        <input type="text" id="modal-affiliation" placeholder="Organization..." />
      </div>
      <div class="modal-field">
        <label>Tags (Regions)</label>
        <div class="tag-input-container" id="modal-tags-container">
          <input class="tag-input" id="modal-tag-input" placeholder="Type tag..." />
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          ${allTags.map(t => `<button class="actor-tag" style="background:${(REGION_COLORS[t]||{bg:'rgba(100,100,100,0.15)'}).bg};color:${(REGION_COLORS[t]||{text:'#666'}).text};border:1px solid ${(REGION_COLORS[t]||{border:'#ccc'}).border}" data-tag="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn cancel" id="modal-cancel">Cancel</button>
        <button class="btn primary" id="modal-confirm">Create Node</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  function updateTagChips() {
    const container = overlay.querySelector('#modal-tags-container');
    const input = overlay.querySelector('#modal-tag-input');
    container.querySelectorAll('.tag-chip').forEach(c => c.remove());
    selectedTags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${tag} <span class="remove" data-tag="${tag}">×</span>`;
      container.insertBefore(chip, input);
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); return; }
    if (e.target.dataset.tag && e.target.classList.contains('actor-tag')) {
      const tag = e.target.dataset.tag;
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
        updateTagChips();
      }
    }
    if (e.target.classList.contains('remove') && e.target.dataset.tag) {
      selectedTags = selectedTags.filter(t => t !== e.target.dataset.tag);
      updateTagChips();
    }
  });

  overlay.querySelector('#modal-tag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const tag = e.target.value.trim().toUpperCase();
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
        // Ensure pipeline exists for new tags
        store.ensurePipeline(tag);
        updateTagChips();
      }
      e.target.value = '';
    }
  });

  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modal-confirm').addEventListener('click', () => {
    const name = overlay.querySelector('#modal-name').value.trim();
    if (!name) return;

    const newActor = store.addActor({
      name,
      alias: overlay.querySelector('#modal-alias').value.trim() || 'Unknown',
      role: overlay.querySelector('#modal-role').value.trim() || 'Unknown',
      affiliation: overlay.querySelector('#modal-affiliation').value.trim() || 'Unaffiliated',
      tags: selectedTags,
    });

    // Add node to simulation
    const node = {
      id: newActor.id,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      radius: PHYSICS.nodeRadius,
      color: getNodeColor(nodes.length),
      actor: newActor,
      tags: newActor.tags,
      springFactor: 2,
    };
    nodes.push(node);

    // Rebuild region cards
    Object.values(regionElements).forEach(el => el.remove());
    regionElements = {};
    createRegionCards();

    overlay.remove();
  });
}

export function mountNetwork(containerEl) {
  container = containerEl;
  container.innerHTML = '';
  container.style.position = 'relative';

  canvas = document.createElement('canvas');
  canvas.id = 'network-canvas';
  container.appendChild(canvas);

  tooltip = document.createElement('div');
  tooltip.className = 'node-tooltip';
  container.appendChild(tooltip);

  ctx = canvas.getContext('2d');

  resizeHandler = () => {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  };

  resizeHandler();
  window.addEventListener('resize', resizeHandler);

  initNodes();
  setupEvents();
  createRegionCards();
  createControls();

  render();
}

export function unmountNetwork() {
  if (animFrame) cancelAnimationFrame(animFrame);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  animFrame = null;
  nodes = [];
  edges = [];
  regionElements = {};
  hoveredNode = null;
  hoveredRegion = null;
  draggedNode = null;
  connectModeNode = null;
  didDrag = false;
}

export { showAddNodeModal };