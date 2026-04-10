// ─── Gate Detail View ───────────────────────────────────────
// Editable gate protocol page with people tagging and status control

import { store, REGION_COLORS, NODE_COLORS } from "/src/store.js";

function getActorColor(actorId) {
  const actors = store.getActors();
  const idx = actors.findIndex(a => a.id === actorId);
  return NODE_COLORS[idx % NODE_COLORS.length];
}

export function mountGateDetail(containerEl, pipelineTag, gateId) {
  const _s=document.createElement('style');_s.textContent='.gate-view,.gate-view *{color:#111!important}';containerEl.prepend(_s);
  const pipeline = store.getPipeline(pipelineTag);
  if (!pipeline) {
    containerEl.innerHTML = '<div class="gate-detail-view"><p>Pipeline not found.</p></div>';
    return;
  }

  const gate = pipeline.gates.find(g => g.id === gateId);
  if (!gate) {
    containerEl.innerHTML = '<div class="gate-detail-view"><p>Gate not found.</p></div>';
    return;
  }

  const gateIndex = pipeline.gates.indexOf(gate);
  const gateNum = String(gateIndex + 1).padStart(2, '0');
  const taggedActors = gate.taggedPeople.map(id => store.getActor(id)).filter(Boolean);
  const allActors = store.getActors();
  const availableActors = allActors.filter(a => !gate.taggedPeople.includes(a.id));

  // Calculate efficiency based on connections fulfilled
  const totalConnections = gate.connections.length;
  const activeConnections = gate.connections.filter(cId => {
    const target = pipeline.gates.find(g => g.id === cId);
    return target && target.status === 'active';
  }).length;
  const efficiency = totalConnections > 0 ? Math.round((activeConnections / totalConnections) * 100) : (gate.status === 'active' ? 98 : 45);

  containerEl.innerHTML = `
    <div class="gate-detail-view fade-enter">
      <div class="gate-detail-back" id="gate-back">← Central Station Terminal</div>

      <div class="gate-breadcrumb">
        <span class="crumb badge">NODE DETAILS</span>
        <span class="crumb" style="color:var(--text-muted)">•</span>
        <span class="crumb" style="color:var(--text-secondary)">Transit Logic Gate</span>
      </div>

      <h1 class="gate-detail-title">Gate Protocol: <span contenteditable="true" id="edit-gate-name" style="outline:none;border-bottom:2px dashed rgba(0,0,0,0.25);padding-bottom:2px;cursor:text;min-width:40px;display:inline-block;">${gate.name}</span></h1>
      <p class="gate-detail-desc" contenteditable="true" id="gate-desc">
        ${gate.plan.split('\n')[0] || 'Primary entry point for this operational phase. Configure the gate protocol below.'}
      </p>

      <div class="gate-detail-layout">
        <!-- Left: Plan Editor -->
        <div class="gate-plan-section">
          <div class="gate-plan-header">
            <div class="gate-plan-title">✦ Operational Strategy</div>
            <div class="gate-plan-date">LAST UPDATED: ${gate.lastUpdated || 'N/A'}</div>
          </div>
          <textarea class="gate-plan-textarea" id="gate-plan">${gate.plan}</textarea>
          <div class="gate-plan-actions">
            <button class="btn primary" id="btn-save-gate">🔒 Save Protocol</button>
            <button class="btn text" id="btn-audit">View Audit History</button>
          </div>
        </div>

        <!-- Right: Sidebar -->
        <div class="gate-sidebar-panel">
          <!-- Status -->
          <div class="gate-status-card">
            <div class="gate-status-title">Operational Status</div>
            <div class="gate-status-option ${gate.status === 'active' ? 'selected' : ''}" data-status="active">
              <span class="status-dot" style="background:#4A7C59"></span>
              Active Gate
            </div>
            <div class="gate-status-option ${gate.status === 'pending' ? 'selected' : ''}" data-status="pending">
              <span class="status-dot" style="background:#C44536"></span>
              Pending Sync
            </div>
            <div class="gate-efficiency">
              <span class="eff-label">Efficiency Rate</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="eff-value">${efficiency}%</span>
                <div class="eff-bar">
                  <div class="eff-fill" style="width:${efficiency}%"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tagged People -->
          <div class="gate-people-card">
            <div class="gate-status-title">Tagged Operatives</div>
            <div id="gate-people-list">
              ${taggedActors.map(actor => `
                <div class="gate-person-item">
                  <div class="gate-person-avatar" style="background:${getActorColor(actor.id)}">${actor.name.charAt(0)}</div>
                  <div class="gate-person-info">
                    <div class="gate-person-name">${actor.name}</div>
                    <div class="gate-person-role">${actor.role || actor.alias}</div>
                  </div>
                  <button class="gate-person-remove" data-actor-id="${actor.id}" title="Remove">×</button>
                </div>
              `).join('')}
            </div>
            <button class="gate-add-person" id="add-person-btn">+ Tag Operative</button>
          </div>

          <!-- Insight -->
          <div class="gate-insight-card">
            <div class="gate-insight-icon">🔮</div>
            <div class="gate-insight-title">Curator Insight</div>
            <div class="gate-insight-text">
              "This gate is ${gate.status === 'active' ? 'currently operational' : 'awaiting authorization'}. 
              ${taggedActors.length} operatives are assigned to this phase. 
              ${gate.connections.length > 0 ? `Connected to ${gate.connections.length} downstream gate(s).` : 'No downstream connections established.'}"
            </div>
          </div>
        </div>
      </div>

      <div class="dossier-bottom-bar" style="margin-top:32px;">
        <button class="btn secondary" id="btn-delete-gate" style="color:var(--accent-red);border-color:var(--accent-red);">Delete Gate</button>
      </div>
    </div>
  `;

  // Back
  containerEl.querySelector('#gate-back').addEventListener('click', () => {
    window.location.hash = `/pipeline/${pipelineTag}`;
  });

  // Save plan
  const _ne=containerEl.querySelector('#edit-gate-name');if(_ne)_ne.addEventListener('blur',()=>store.updateGate&&store.updateGate(pipelineTag,gateId,{name:_ne.textContent.trim()}));
  containerEl.querySelector('#btn-save-gate').addEventListener('click', () => {
    const plan = containerEl.querySelector('#gate-plan').value;
    store.updateGate(pipelineTag, gateId, {
      plan,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
    const btn = containerEl.querySelector('#btn-save-gate');
    btn.textContent = '✓ Saved';
    setTimeout(() => { btn.textContent = '🔒 Save Protocol'; }, 1500);
  });

  // Status toggle
  containerEl.querySelectorAll('.gate-status-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const newStatus = opt.dataset.status;
      store.updateGate(pipelineTag, gateId, { status: newStatus });
      mountGateDetail(containerEl, pipelineTag, gateId);
    });
  });

  // Remove tagged person
  containerEl.querySelectorAll('.gate-person-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const actorId = btn.dataset.actorId;
      const newPeople = gate.taggedPeople.filter(id => id !== actorId);
      store.updateGate(pipelineTag, gateId, { taggedPeople: newPeople });
      mountGateDetail(containerEl, pipelineTag, gateId);
    });
  });

  // Add person
  containerEl.querySelector('#add-person-btn').addEventListener('click', (e) => {
    // Show picker dropdown
    const existing = containerEl.querySelector('.person-picker');
    if (existing) { existing.remove(); return; }

    if (availableActors.length === 0) {
      alert('All operatives are already tagged to this gate.');
      return;
    }

    const picker = document.createElement('div');
    picker.className = 'person-picker';
    picker.style.position = 'fixed';
    const rect = e.target.getBoundingClientRect();
    picker.style.left = rect.left + 'px';
    picker.style.top = (rect.bottom + 4) + 'px';

    availableActors.forEach(actor => {
      const item = document.createElement('div');
      item.className = 'person-picker-item';
      item.innerHTML = `
        <span class="mini-dot" style="background:${getActorColor(actor.id)}"></span>
        ${actor.name} — ${actor.alias}
      `;
      item.addEventListener('click', () => {
        const newPeople = [...gate.taggedPeople, actor.id];
        store.updateGate(pipelineTag, gateId, { taggedPeople: newPeople });
        picker.remove();
        mountGateDetail(containerEl, pipelineTag, gateId);
      });
      picker.appendChild(item);
    });

    document.body.appendChild(picker);

    // Close on outside click
    const close = (ev) => {
      if (!picker.contains(ev.target) && ev.target !== e.target) {
        picker.remove();
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  });

  // Delete gate
  containerEl.querySelector('#btn-delete-gate').addEventListener('click', () => {
    if (confirm(`Delete gate ${gate.name}?`)) {
      store.removeGate(pipelineTag, gateId);
      window.location.hash = `/pipeline/${pipelineTag}`;
    }
  });

  // Description editing
  containerEl.querySelector('#gate-desc').addEventListener('blur', (e) => {
    // Update the first line of the plan description
    // (optional: store as separate field)
  });
}