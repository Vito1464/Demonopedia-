// ─── Dossier View ───────────────────────────────────────────
// Actor detail page with editable fields and intelligence leaks

import { store, REGION_COLORS, NODE_COLORS } from "/src/store.js?t=1775777628350";

function generateGeometricImage(canvas, seed) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = 560;
  const h = canvas.height = 640;

  // Dark background
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, w, h);

  // Generate deterministic "random" from seed
  let s = 0;
  for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i);
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647; };

  // Draw wireframe geometric polygon
  ctx.strokeStyle = 'rgba(200,200,200,0.4)';
  ctx.lineWidth = 1;

  const cx = w / 2, cy = h / 2;
  const points = [];
  const numPoints = 20 + Math.floor(rand() * 15);

  for (let i = 0; i < numPoints; i++) {
    const angle = rand() * Math.PI * 2;
    const r = 60 + rand() * 120;
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  // Draw connections
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        ctx.globalAlpha = 0.15 + (1 - dist / 150) * 0.4;
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
  }

  // Draw points
  ctx.globalAlpha = 1;
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  });

  // Add a subtle glow in center
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
  glow.addColorStop(0, 'rgba(255,255,255,0.05)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function getIntelIcon(type) {
  switch (type) {
    case 'OBJECTIVE': return '◎';
    case 'IMPACT': return '⚡';
    case 'COUNTERMEASURE': return '⬤';
    default: return '◆';
  }
}

function getIntelColor(type) {
  switch (type) {
    case 'OBJECTIVE': return '#C17F4E';
    case 'IMPACT': return '#8B7355';
    case 'COUNTERMEASURE': return '#6B7B6E';
    default: return '#5A5A5A';
  }
}

export function mountDossier(containerEl, actorId) {
  const actor = store.getActor(actorId);
  if (!actor) {
    containerEl.innerHTML = '<div class="dossier-view"><p>Actor not found.</p></div>';
    return;
  }

  const refCode = 'OP-' + actor.id.slice(-6).toUpperCase();

  containerEl.innerHTML = `
    <div class="dossier-view fade-enter">
      <div class="dossier-back" id="dossier-back">← Back to Network</div>

      <div class="dossier-badges">
        <span class="dossier-badge classified">CLASSIFIED REGISTRY</span>
        <span class="dossier-badge ref">REF: ${refCode}</span>
      </div>

      <h1 class="dossier-name" contenteditable="true" id="dossier-name">${actor.name}</h1>
      <div class="dossier-quote" contenteditable="true" id="dossier-quote">${actor.quote || ''}</div>

      <div class="dossier-profile">
        <div class="dossier-image-container" id="dossier-image">
          <canvas id="dossier-canvas"></canvas>
          <div class="edit-overlay">
            <span>Click to upload image</span>
          </div>
          <input type="file" accept="image/*" id="dossier-image-input" style="display:none" />
        </div>
        <div class="dossier-fields">
          <div class="dossier-field">
            <label>Subject Name</label>
            <input type="text" value="${actor.name}" data-field="name" class="actor-field" />
          </div>
          <div class="dossier-field">
            <label>Caste</label>
            <select data-field="caste" class="actor-field">
              <optgroup label="Brahmin Combinations">
                <option value="Brahmin Brahmin" ${actor.caste === 'Brahmin Brahmin' ? 'selected' : ''}>Brahmin Brahmin</option>
                <option value="Brahmin Warrior" ${actor.caste === 'Brahmin Warrior' ? 'selected' : ''}>Brahmin Warrior</option>
                <option value="Brahmin Merchant" ${actor.caste === 'Brahmin Merchant' ? 'selected' : ''}>Brahmin Merchant</option>
                <option value="Brahmin Shudra" ${actor.caste === 'Brahmin Shudra' ? 'selected' : ''}>Brahmin Shudra</option>
              </optgroup>
              <optgroup label="Warrior Combinations">
                <option value="Warrior Brahmin" ${actor.caste === 'Warrior Brahmin' ? 'selected' : ''}>Warrior Brahmin</option>
                <option value="Warrior Warrior" ${actor.caste === 'Warrior Warrior' ? 'selected' : ''}>Warrior Warrior</option>
                <option value="Warrior Merchant" ${actor.caste === 'Warrior Merchant' ? 'selected' : ''}>Warrior Merchant</option>
                <option value="Warrior Shudra" ${actor.caste === 'Warrior Shudra' ? 'selected' : ''}>Warrior Shudra</option>
              </optgroup>
              <optgroup label="Merchant Combinations">
                <option value="Merchant Brahmin" ${actor.caste === 'Merchant Brahmin' ? 'selected' : ''}>Merchant Brahmin</option>
                <option value="Merchant Warrior" ${actor.caste === 'Merchant Warrior' ? 'selected' : ''}>Merchant Warrior</option>
                <option value="Merchant Merchant" ${actor.caste === 'Merchant Merchant' ? 'selected' : ''}>Merchant Merchant</option>
                <option value="Merchant Shudra" ${actor.caste === 'Merchant Shudra' ? 'selected' : ''}>Merchant Shudra</option>
              </optgroup>
              <optgroup label="Shudra Combinations">
                <option value="Shudra Brahmin" ${actor.caste === 'Shudra Brahmin' ? 'selected' : ''}>Shudra Brahmin</option>
                <option value="Shudra Warrior" ${actor.caste === 'Shudra Warrior' ? 'selected' : ''}>Shudra Warrior</option>
                <option value="Shudra Merchant" ${actor.caste === 'Shudra Merchant' ? 'selected' : ''}>Shudra Merchant</option>
                <option value="Shudra Shudra" ${actor.caste === 'Shudra Shudra' ? 'selected' : ''}>Shudra Shudra</option>
              </optgroup>
            </select>
          </div>
          <div class="dossier-field">
            <label>Race</label>
            <select data-field="race" class="actor-field">
              <option value="Brahmin" ${actor.race === 'Brahmin' ? 'selected' : ''}>Brahmin</option>
              <option value="Warrior" ${actor.race === 'Warrior' ? 'selected' : ''}>Warrior</option>
              <option value="Merchant" ${actor.race === 'Merchant' ? 'selected' : ''}>Merchant</option>
              <option value="Shudra" ${actor.race === 'Shudra' ? 'selected' : ''}>Shudra</option>
            </select>
          </div>
          <div class="dossier-field">
            <label>Religion</label>
            <select data-field="religion" class="actor-field">
              <option value="Hindu" ${actor.religion === 'Hindu' ? 'selected' : ''}>Hindu</option>
              <option value="Jewish" ${actor.religion === 'Jewish' ? 'selected' : ''}>Jewish</option>
              <option value="Christian" ${actor.religion === 'Christian' ? 'selected' : ''}>Christian</option>
              <option value="Muslim" ${actor.religion === 'Muslim' ? 'selected' : ''}>Muslim</option>
              <option value="Hedonist" ${actor.religion === 'Hedonist' ? 'selected' : ''}>Hedonist</option>
            </select>
          </div>
          <div class="dossier-field">
            <label>Tribe/Culture</label>
            <input type="text" value="${actor.tribe || ''}" data-field="tribe" class="actor-field" placeholder="Enter Tribe/Culture" />
          </div>
          <div class="dossier-field">
            <label>Spiritual Authority</label>
            <select data-field="spiritualAuthority" class="actor-field">
              <optgroup label="Brahmin Combinations">
                <option value="Brahmin Brahmin" ${actor.spiritualAuthority === 'Brahmin Brahmin' ? 'selected' : ''}>Brahmin Brahmin</option>
                <option value="Brahmin Warrior" ${actor.spiritualAuthority === 'Brahmin Warrior' ? 'selected' : ''}>Brahmin Warrior</option>
                <option value="Brahmin Merchant" ${actor.spiritualAuthority === 'Brahmin Merchant' ? 'selected' : ''}>Brahmin Merchant</option>
                <option value="Brahmin Shudra" ${actor.spiritualAuthority === 'Brahmin Shudra' ? 'selected' : ''}>Brahmin Shudra</option>
              </optgroup>
              <optgroup label="Warrior Combinations">
                <option value="Warrior Brahmin" ${actor.spiritualAuthority === 'Warrior Brahmin' ? 'selected' : ''}>Warrior Brahmin</option>
                <option value="Warrior Warrior" ${actor.spiritualAuthority === 'Warrior Warrior' ? 'selected' : ''}>Warrior Warrior</option>
                <option value="Warrior Merchant" ${actor.spiritualAuthority === 'Warrior Merchant' ? 'selected' : ''}>Warrior Merchant</option>
                <option value="Warrior Shudra" ${actor.spiritualAuthority === 'Warrior Shudra' ? 'selected' : ''}>Warrior Shudra</option>
              </optgroup>
              <optgroup label="Merchant Combinations">
                <option value="Merchant Brahmin" ${actor.spiritualAuthority === 'Merchant Brahmin' ? 'selected' : ''}>Merchant Brahmin</option>
                <option value="Merchant Warrior" ${actor.spiritualAuthority === 'Merchant Warrior' ? 'selected' : ''}>Merchant Warrior</option>
                <option value="Merchant Merchant" ${actor.spiritualAuthority === 'Merchant Merchant' ? 'selected' : ''}>Merchant Merchant</option>
                <option value="Merchant Shudra" ${actor.spiritualAuthority === 'Merchant Shudra' ? 'selected' : ''}>Merchant Shudra</option>
              </optgroup>
              <optgroup label="Shudra Combinations">
                <option value="Shudra Brahmin" ${actor.spiritualAuthority === 'Shudra Brahmin' ? 'selected' : ''}>Shudra Brahmin</option>
                <option value="Shudra Warrior" ${actor.spiritualAuthority === 'Shudra Warrior' ? 'selected' : ''}>Shudra Warrior</option>
                <option value="Shudra Merchant" ${actor.spiritualAuthority === 'Shudra Merchant' ? 'selected' : ''}>Shudra Merchant</option>
                <option value="Shudra Shudra" ${actor.spiritualAuthority === 'Shudra Shudra' ? 'selected' : ''}>Shudra Shudra</option>
              </optgroup>
            </select>
          </div>
          <div class="dossier-field">
            <label>Age</label>
            <select data-field="age" class="actor-field">
              <option value="Child" ${actor.age === 'Child' ? 'selected' : ''}>Child</option>
              <option value="Teenager" ${actor.age === 'Teenager' ? 'selected' : ''}>Teenager</option>
              <option value="Young adult" ${actor.age === 'Young adult' ? 'selected' : ''}>Young adult</option>
              <option value="Middle age" ${actor.age === 'Middle age' ? 'selected' : ''}>Middle age</option>
              <option value="Elderly" ${actor.age === 'Elderly' ? 'selected' : ''}>Elderly</option>
            </select>
          </div>
          <div class="dossier-field">
            <label>Host</label>
            <input type="text" value="${actor.host || ''}" data-field="host" class="actor-field" placeholder="Enter Host" />
          </div>
          <div class="dossier-blockquote">
            <p contenteditable="true" id="dossier-blockquote-text">${actor.quote || 'No intelligence notes available.'}</p>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div style="margin-bottom: 24px;">
        <label style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-label);margin-bottom:8px;display:block;">Tags</label>
        <div class="tags-section" id="dossier-tags">
          ${actor.tags.map(tag => {
            const c = REGION_COLORS[tag] || { bg: 'rgba(100,100,100,0.15)', text: '#666', border: '#999' };
            return `<span class="actor-tag" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">${tag}</span>`;
          }).join('')}
          <span class="actor-tag" style="background:var(--bg-secondary);color:var(--text-muted);border:1px dashed var(--border-medium);cursor:pointer;" id="add-tag-btn">+ Add Tag</span>
        </div>
      </div>

      <!-- Leaks -->
      <div class="intel-section">
        <div class="intel-section-header">
          <h2 class="intel-section-title">Leaks</h2>
          <button class="sidebar-btn primary" id="add-intel-btn" style="padding:8px 16px;font-size:11px;">+ ADD ENTRY</button>
        </div>
        <div class="intel-grid" id="intel-grid">
          ${actor.intelLeaks.map(leak => renderIntelCard(leak)).join('')}
        </div>
      </div>

      <div class="dossier-bottom-bar">
        <button class="btn primary" id="btn-save">🔒 Save Protocol</button>
        <button class="btn secondary" id="btn-archive">Archive</button>
        <button class="btn secondary" id="btn-delete" style="color:var(--accent-red);border-color:var(--accent-red);">Delete Node</button>
      </div>
    </div>
  `;

  // Generate wireframe image
  const dossierCanvas = containerEl.querySelector('#dossier-canvas');
  if (actor.imageUrl) {
    const img = new Image();
    img.onload = () => {
      const imgEl = document.createElement('img');
      imgEl.src = actor.imageUrl;
      dossierCanvas.replaceWith(imgEl);
    };
    img.src = actor.imageUrl;
  } else {
    generateGeometricImage(dossierCanvas, actor.id);
  }

  // Image upload
  const imageContainer = containerEl.querySelector('#dossier-image');
  const imageInput = containerEl.querySelector('#dossier-image-input');
  imageContainer.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        store.updateActor(actorId, { imageUrl: ev.target.result });
        mountDossier(containerEl, actorId);
      };
      reader.readAsDataURL(file);
    }
  });

  // Back button
  containerEl.querySelector('#dossier-back').addEventListener('click', () => {
    window.location.hash = '/network';
  });

  // Field editing
  containerEl.querySelectorAll('.actor-field').forEach(input => {
    input.addEventListener('change', () => {
      const field = input.dataset.field;
      store.updateActor(actorId, { [field]: input.value });
      // Update name display
      if (field === 'name') {
        containerEl.querySelector('#dossier-name').textContent = input.value;
      }
    });
  });

  // Name editing (contenteditable)
  containerEl.querySelector('#dossier-name').addEventListener('blur', (e) => {
    store.updateActor(actorId, { name: e.target.textContent.trim() });
    // Sync input field
    const nameInput = containerEl.querySelector('.actor-field[data-field="name"]');
    if (nameInput) nameInput.value = e.target.textContent.trim();
  });

  // Quote editing
  containerEl.querySelector('#dossier-quote').addEventListener('blur', (e) => {
    store.updateActor(actorId, { quote: e.target.textContent.trim() });
  });
  containerEl.querySelector('#dossier-blockquote-text').addEventListener('blur', (e) => {
    store.updateActor(actorId, { quote: e.target.textContent.trim() });
  });

  // Add tag
  containerEl.querySelector('#add-tag-btn').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-content" style="max-width:320px;"><div class="modal-title">Add Tag</div><div class="modal-field"><label>Tag Name</label><input type="text" id="tag-name-input" placeholder="e.g. FINANCIAL" style="width:100%;padding:10px;border:1px solid var(--border-light);border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);" autofocus /></div><div class="modal-actions" style="margin-top:16px;"><button class="btn cancel" id="tag-cancel">Cancel</button><button class="btn primary" id="tag-confirm">Add</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#tag-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#tag-confirm').onclick = () => {
      const tag = overlay.querySelector('#tag-name-input').value.trim();
      overlay.remove();
      if (tag) {
        const upper = tag.toUpperCase();
        const updatedTags = [...new Set([...actor.tags, upper])];
        store.updateActor(actorId, { tags: updatedTags });
        store.ensurePipeline(upper);
        mountDossier(containerEl, actorId);
      }
    };
  });

  // Add intel leak
  containerEl.querySelector('#add-intel-btn').addEventListener('click', () => {
    showAddIntelModal(containerEl, actorId);
  });

  // Delete/Edit intel leaks
  containerEl.querySelectorAll('.editable-leak').forEach(el=>{el.addEventListener('blur',(e)=>{const leakId=el.dataset.leakId;const field=el.dataset.field;const leak=actor.intelLeaks.find(l=>l.id===leakId);if(leak){leak[field]=e.target.textContent.trim();store.updateActor(actorId,{intelLeaks:actor.intelLeaks});}});});
  containerEl.querySelectorAll('.lk-btn').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();const{leakId,field}=btn.dataset,val=btn.dataset.val==='1';const leak=actor.intelLeaks.find(l=>l.id===leakId);if(!leak)return;leak[field]=val;store.updateActor(actorId,{intelLeaks:actor.intelLeaks});mountDossier(containerEl,actorId);});});containerEl.querySelectorAll('.tagged-person').forEach(el=>{el.addEventListener('click',()=>{window.location.hash='/dossier/'+el.dataset.actorId;});});containerEl.querySelectorAll('.delete-intel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const leakId = btn.dataset.leakId;
      store.removeIntelLeak(actorId, leakId);
      mountDossier(containerEl, actorId);
    });
  });

  // Save button
  containerEl.querySelector('#btn-save').addEventListener('click', () => {
    // Data is saved automatically, show confirmation
    const btn = containerEl.querySelector('#btn-save');
    btn.textContent = '✓ Saved';
    setTimeout(() => { btn.textContent = '🔒 Save Protocol'; }, 1500);
  });

  // Delete node
  containerEl.querySelector('#btn-delete').addEventListener('click', () => {
    if (confirm(`Delete ${actor.name}? This cannot be undone.`)) {
      store.deleteActor(actorId);
      window.location.hash = '/network';
    }
  });
}

function renderIntelCard(leak){const resolved=leak.ctrDone===true;const iconColor=resolved?'#5a8c6b':getIntelColor(leak.type||'OBJECTIVE');const date=leak.date?new Date(leak.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});const cD=leak.ctrDone===true;return `<div class="intel-card" data-leak-id="${leak.id}" style="border:1px solid var(--border-light);border-radius:8px;background:var(--bg-card-solid);margin-bottom:16px;position:relative;transition:all 0.3s;max-width:320px;"><button class="delete-btn delete-intel" data-leak-id="${leak.id}" style="position:absolute;right:8px;top:8px;z-index:10;background:var(--bg-card-solid);border:1px solid var(--border-light);border-radius:50%;color:var(--accent-red);cursor:pointer;width:24px;height:24px;font-size:12px;line-height:22px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-sm);">✕</button><div style="background:var(--bg-secondary);height:50px;width:100%;border-top-left-radius:8px;border-top-right-radius:8px;"></div><div class="intel-card-icon-trigger" style="position:absolute;top:30px;left:50%;transform:translateX(-50%);width:40px;height:40px;border-radius:50%;background:${iconColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;box-shadow:var(--shadow-sm);z-index:5;" onclick="const d=this.parentElement.querySelector('.intel-details'); d.style.display=d.style.display==='none'?'block':'none';this.parentElement.style.boxShadow=d.style.display==='block'?'var(--shadow-lg)':'none';">${resolved?'✓':'◎'}</div><div style="padding: 34px 20px 20px; text-align:center;"><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:var(--text-secondary);margin-bottom:6px;font-family:var(--font-body);">OBJECTIVE</div><div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:12px;">${date}</div><div class="intel-card-desc editable-leak" style="font-size:13px;line-height:1.55;margin-bottom:16px;color:var(--text-primary);" contenteditable="true" data-leak-id="${leak.id}" data-field="description">${leak.description}</div><div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">${(leak.tags||[]).map(t=>{const c=REGION_COLORS[t]||{border:'var(--border-light)',text:'var(--text-primary)'}; return `<span style="background:var(--bg-primary);color:${c.text};font-size:9px;padding:4px 10px;border-radius:4px;font-weight:700;letter-spacing:0.5px;border:1px solid ${c.border};">${t}</span>`;}).join('')}</div></div><div class="intel-details" style="display:none;border-top:1px solid var(--border-light);padding:16px 20px;background:var(--bg-primary);text-align:left;border-bottom-left-radius:8px;border-bottom-right-radius:8px;"><div style="font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px;">Impact</div><div style="font-size:12px;color:var(--text-primary);min-height:20px;outline:none;" contenteditable="true" data-leak-id="${leak.id}" data-field="impact" class="editable-leak">${leak.impact||''}</div><div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;"><span style="font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--text-secondary);text-transform:uppercase;">Countermeasure</span><span style="display:flex;gap:4px;"><button class="lk-btn" data-leak-id="${leak.id}" data-field="ctrDone" data-val="1" style="width:24px;height:24px;border-radius:50%;border:1.5px solid ${cD?'var(--accent-olive)':'var(--border-medium)'};background:${cD?'var(--accent-olive)':'transparent'};color:${cD?'#fff':'var(--text-muted)'};cursor:pointer;font-size:11px;">✓</button><button class="lk-btn" data-leak-id="${leak.id}" data-field="ctrDone" data-val="0" style="width:24px;height:24px;border-radius:50%;border:1.5px solid var(--border-medium);background:transparent;color:var(--text-muted);cursor:pointer;font-size:12px;">✕</button></span></div><div style="font-size:12px;color:var(--text-primary);min-height:20px;outline:none;" contenteditable="true" data-leak-id="${leak.id}" data-field="countermeasure" class="editable-leak">${leak.countermeasure||''}</div></div></div>`;}
function showAddIntelModal(containerEl, actorId) {
  const actor = store.getActor(actorId);
  const allTags = store.getAllTags();
  let selectedTags = [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">New Intelligence Entry</div>
        <input type="hidden" id="intel-type" value="OBJECTIVE" />
      <div class="modal-field">
        <label>Title</label>
        <input type="text" id="intel-title" placeholder="Entry title..." />
      </div>
      <div class="modal-field">
        <label>Description</label>
        <textarea id="intel-desc" rows="4" placeholder="Intelligence details..." style="width:100%;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:8px;font-size:14px;color:var(--text-primary);resize:vertical;"></textarea>
      </div>
      <div class="modal-field"><label>Impact</label><textarea id="intel-impact" rows="2" placeholder="What is the impact?" style="width:100%;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:8px;font-size:14px;resize:vertical;"></textarea></div><div class="modal-field"><label>Countermeasure</label><textarea id="intel-ctr" rows="2" placeholder="What is the countermeasure?" style="width:100%;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:8px;font-size:14px;resize:vertical;"></textarea></div><div class="modal-field"><label>Tags</label>
        <div class="tag-input-container" id="intel-tags-container">
          <input class="tag-input" id="intel-tag-input" placeholder="Type tag..." />
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          ${allTags.map(t => `<button class="actor-tag" style="background:${(REGION_COLORS[t]||{bg:'rgba(100,100,100,0.15)'}).bg};color:${(REGION_COLORS[t]||{text:'#666'}).text};border:1px solid ${(REGION_COLORS[t]||{border:'#ccc'}).border}" data-tag="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn cancel" id="intel-cancel">Cancel</button>
        <button class="btn primary" id="intel-confirm">Add Entry</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  function updateTagChips() {
    const container = overlay.querySelector('#intel-tags-container');
    const input = overlay.querySelector('#intel-tag-input');
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

  overlay.querySelector('#intel-tag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const tag = e.target.value.trim().toUpperCase();
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
        store.ensurePipeline(tag);
        updateTagChips();
      }
      e.target.value = '';
    }
  });

  overlay.querySelector('#intel-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#intel-confirm').addEventListener('click', () => {
    const type = 'OBJECTIVE';
    const title = overlay.querySelector('#intel-title').value.trim() || type;
    const desc = overlay.querySelector('#intel-desc').value.trim();

    if (!desc) return;

    store.addIntelLeak(actorId,{type,title,description:desc,tags:selectedTags,impact:overlay.querySelector('#intel-impact')?.value.trim()||'',countermeasure:overlay.querySelector('#intel-ctr')?.value.trim()||'',date:new Date().toISOString()});

    overlay.remove();
    mountDossier(containerEl, actorId);
  });
}