// ─── Data Store ─────────────────────────────────────────────
// Manages all application state with localStorage persistence

const STORAGE_KEY = 'living-network-data';

const REGION_COLORS = {
  FINANCIAL:   { bg: 'rgba(193,127,78,0.12)', border: '#C17F4E', text: '#C17F4E', glow: 'rgba(193,127,78,0.25)' },
  LOGISTICS:   { bg: 'rgba(74,124,89,0.12)',  border: '#4A7C59', text: '#4A7C59', glow: 'rgba(74,124,89,0.25)' },
  COMMS:       { bg: 'rgba(107,123,110,0.12)', border: '#6B7B6E', text: '#6B7B6E', glow: 'rgba(107,123,110,0.25)' },
  RECRUITMENT: { bg: 'rgba(139,115,85,0.12)',  border: '#8B7355', text: '#8B7355', glow: 'rgba(139,115,85,0.25)' },
};

const REGION_CORNERS = {
  FINANCIAL:   { x: 0.12, y: 0.12 },
  LOGISTICS:   { x: 0.88, y: 0.12 },
  COMMS:       { x: 0.88, y: 0.88 },
  RECRUITMENT: { x: 0.12, y: 0.88 },
};

const NODE_COLORS = ['#6B7B6E','#C17F4E','#4A7C59','#8B7355','#7A6855','#5C7066','#A0785A','#4D6B57'];

function generateId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
}

function createSeedData() {
  const actors = [
    {
      id: 'actor-1', name: 'Khalid Al-Rashid', alias: 'The Architect',
      role: 'Operational Commander', affiliation: 'Seventh Circle',
      religion: 'Undisclosed', tribe: 'Eastern Caucus', authority: 'Senior Command',
      age: '47', quote: '"He does not build walls. He builds the spaces between them, where fear grows unattended."',
      imageUrl: null, tags: ['FINANCIAL', 'LOGISTICS'],
      intelLeaks: [
        { id: 'il-1', type: 'OBJECTIVE', title: 'Objective', description: 'To establish covert funding corridors through shell companies in three EU nations.', tags: ['FINANCIAL'] },
        { id: 'il-2', type: 'IMPACT', title: 'Impact', description: 'Estimated €4.2M in untraceable funds redirected since 2022.', tags: ['FINANCIAL'] },
      ]
    },
    {
      id: 'actor-2', name: 'Yara Nazari', alias: 'The Courier',
      role: 'Logistics Operative', affiliation: 'Seventh Circle',
      religion: 'Undisclosed', tribe: 'Northern Cell', authority: 'Mid-Rank',
      age: '31', quote: '"She moves through borders the way water moves through stone — slowly, invisibly, inevitably."',
      imageUrl: null, tags: ['LOGISTICS', 'COMMS'],
      intelLeaks: [
        { id: 'il-3', type: 'COUNTERMEASURE', title: 'Countermeasure', description: 'Uses rotating SIM cards and dead-drop protocols across 6 transit corridors.', tags: ['LOGISTICS', 'COMMS'] },
      ]
    },
    {
      id: 'actor-3', name: 'Viktor Demidov', alias: 'The Banker',
      role: 'Financial Coordinator', affiliation: 'Outer Ring',
      religion: 'Orthodox (lapsed)', tribe: 'Baltic Network', authority: 'Senior Finance',
      age: '54', quote: '"Every transaction is a message. He writes novels in ledger entries."',
      imageUrl: null, tags: ['FINANCIAL'],
      intelLeaks: [
        { id: 'il-4', type: 'OBJECTIVE', title: 'Objective', description: 'Maintain financial opacity through layered cryptocurrency exchanges.', tags: ['FINANCIAL'] },
      ]
    },
    {
      id: 'actor-4', name: 'Amara Diallo', alias: 'The Ghost',
      role: 'Communications Lead', affiliation: 'Seventh Circle',
      religion: 'Animist Traditions', tribe: 'West African Nexus', authority: 'Specialist',
      age: '28', quote: '"No signal intercepted. No trace recovered. She is the silence between the static."',
      imageUrl: null, tags: ['COMMS', 'RECRUITMENT'],
      intelLeaks: [
        { id: 'il-5', type: 'IMPACT', title: 'Impact', description: 'Developed an encrypted mesh network used across 4 operational theatres.', tags: ['COMMS'] },
      ]
    },
    {
      id: 'actor-5', name: 'Hassan Malik', alias: 'The Strategist',
      role: 'Planning Director', affiliation: 'Seventh Circle',
      religion: 'Sufi (nominal)', tribe: 'Central Command', authority: 'Deputy Leader',
      age: '42', quote: '"He plays chess in four dimensions. By the time you see the board, the game is already over."',
      imageUrl: null, tags: ['LOGISTICS', 'RECRUITMENT'],
      intelLeaks: [
        { id: 'il-6', type: 'OBJECTIVE', title: 'Objective', description: 'Coordinate multi-stage operational deployments across three continents.', tags: ['LOGISTICS'] },
        { id: 'il-7', type: 'COUNTERMEASURE', title: 'Countermeasure', description: 'Recruiting from displaced populations using humanitarian cover organizations.', tags: ['RECRUITMENT'] },
      ]
    },
    {
      id: 'actor-6', name: 'Leila Farouk', alias: 'The Handler',
      role: 'Asset Controller', affiliation: 'Outer Ring',
      religion: 'Secular', tribe: 'Mediterranean Cell', authority: 'Handler',
      age: '36', quote: '"She does not give orders. She gives reasons — and that is far more dangerous."',
      imageUrl: null, tags: ['FINANCIAL', 'COMMS'],
      intelLeaks: [
        { id: 'il-8', type: 'IMPACT', title: 'Impact', description: 'Manages 12 deep-cover assets across European financial institutions.', tags: ['FINANCIAL', 'COMMS'] },
      ]
    },
    {
      id: 'actor-7', name: 'Omar Sayed', alias: 'The Engineer',
      role: 'Technical Specialist', affiliation: 'Seventh Circle',
      religion: 'Undisclosed', tribe: 'Southern Technical Unit', authority: 'Specialist',
      age: '33', quote: '"What others see as infrastructure, he sees as vulnerability. Every bridge is a choke point."',
      imageUrl: null, tags: ['LOGISTICS'],
      intelLeaks: [
        { id: 'il-9', type: 'OBJECTIVE', title: 'Objective', description: 'Identify and map critical infrastructure weak points in target regions.', tags: ['LOGISTICS'] },
      ]
    },
    {
      id: 'actor-8', name: 'Nadia Volkov', alias: 'The Broker',
      role: 'Recruitment Coordinator', affiliation: 'Outer Ring',
      religion: 'None declared', tribe: 'Eastern European Network', authority: 'Mid-Rank',
      age: '39', quote: '"She trades in loyalty. The currency is desperation, and she never runs out of buyers."',
      imageUrl: null, tags: ['FINANCIAL', 'RECRUITMENT'],
      intelLeaks: [
        { id: 'il-10', type: 'COUNTERMEASURE', title: 'Countermeasure', description: 'Uses legitimate employment agencies as fronts for recruitment pipelines.', tags: ['RECRUITMENT', 'FINANCIAL'] },
      ]
    },
  ];

  const edges = [
    { source: 'actor-1', target: 'actor-3' },
    { source: 'actor-1', target: 'actor-5' },
    { source: 'actor-2', target: 'actor-7' },
    { source: 'actor-2', target: 'actor-4' },
    { source: 'actor-3', target: 'actor-6' },
    { source: 'actor-4', target: 'actor-6' },
    { source: 'actor-5', target: 'actor-7' },
    { source: 'actor-5', target: 'actor-8' },
    { source: 'actor-6', target: 'actor-8' },
    { source: 'actor-1', target: 'actor-6' },
    { source: 'actor-4', target: 'actor-8' },
  ];

  const pipelines = {
    FINANCIAL: {
      id: 'pipe-financial', name: 'FINANCIAL', label: 'Financial Pipeline',
      gates: [
        { id: 'gate-f1', name: 'FUND_ORIGIN', label: 'Fund Origin', x: 120, y: 150, status: 'active', plan: '1. IDENTIFY SOURCES:\nMap all known financial contributors across the network.\n\n2. TRACE PATHWAYS:\nFollow currency flows through front companies and shell corporations.\n\n3. FREEZE TIMELINE:\nEstablish temporal markers for each major transaction event.', taggedPeople: ['actor-1', 'actor-3'], lastUpdated: '2024-03-15', connections: ['gate-f2'] },
        { id: 'gate-f2', name: 'LAUNDER_GATE', label: 'Laundering Gate', x: 420, y: 150, status: 'active', plan: '1. LAYER ANALYSIS:\nDecompose the laundering chain into placement, layering, and integration.\n\n2. EXCHANGE MONITOR:\nTrack cryptocurrency movements through mixing services.', taggedPeople: ['actor-3', 'actor-6'], lastUpdated: '2024-03-20', connections: ['gate-f3'] },
        { id: 'gate-f3', name: 'DISTRIBUTE', label: 'Distribution', x: 720, y: 150, status: 'pending', plan: '1. ENDPOINT MAPPING:\nIdentify all known distribution endpoints.\n\n2. INTERCEPT PROTOCOL:\nPrepare interdiction orders for flagged accounts.', taggedPeople: ['actor-6', 'actor-8'], lastUpdated: '2024-04-01', connections: [] },
      ]
    },
    LOGISTICS: {
      id: 'pipe-logistics', name: 'LOGISTICS', label: 'Logistics Pipeline',
      gates: [
        { id: 'gate-l1', name: 'INGEST_A', label: 'Primary Ingestion', x: 120, y: 150, status: 'active', plan: '1. INITIAL HANDSHAKE:\nEstablish secure entry points for materiel and personnel.\n\n2. ROUTE MAPPING:\nChart primary and secondary transit corridors.', taggedPeople: ['actor-1', 'actor-2'], lastUpdated: '2024-02-10', connections: ['gate-l2'] },
        { id: 'gate-l2', name: 'TRANSIT_HUB', label: 'Transit Hub', x: 420, y: 280, status: 'active', plan: '1. HUB COORDINATION:\nSynchronize timing of multi-origin shipments.\n\n2. COVER LOGISTICS:\nMaintain commercial shipping covers.', taggedPeople: ['actor-2', 'actor-5', 'actor-7'], lastUpdated: '2024-03-05', connections: ['gate-l3'] },
        { id: 'gate-l3', name: 'DEPLOY_POINT', label: 'Deployment Point', x: 720, y: 280, status: 'pending', plan: '1. STAGING AREA:\nPrepare final assembly locations.\n\n2. OPERATIONAL WINDOW:\nConfirm go/no-go criteria.', taggedPeople: ['actor-5', 'actor-7'], lastUpdated: '2024-03-28', connections: [] },
      ]
    },
    COMMS: {
      id: 'pipe-comms', name: 'COMMS', label: 'Communications Pipeline',
      gates: [
        { id: 'gate-c1', name: 'SIGNAL_INIT', label: 'Signal Initialization', x: 120, y: 150, status: 'active', plan: '1. MESH BOOTSTRAP:\nInitialize encrypted communication mesh.\n\n2. KEY EXCHANGE:\nDistribute rotating cipher keys.', taggedPeople: ['actor-4'], lastUpdated: '2024-01-20', connections: ['gate-c2'] },
        { id: 'gate-c2', name: 'RELAY_NET', label: 'Relay Network', x: 420, y: 150, status: 'pending', plan: '1. NODE REGISTRATION:\nBring relay nodes online in sequence.\n\n2. TRAFFIC ANALYSIS:\nMonitor for anomalous patterns.', taggedPeople: ['actor-4', 'actor-6'], lastUpdated: '2024-02-15', connections: ['gate-c3'] },
        { id: 'gate-c3', name: 'BROADCAST', label: 'Broadcast', x: 720, y: 280, status: 'pending', plan: '1. MESSAGE PREP:\nEncode operational directives.\n\n2. DISSEMINATE:\nPush through all active channels.', taggedPeople: ['actor-2', 'actor-6'], lastUpdated: '2024-03-01', connections: [] },
      ]
    },
    RECRUITMENT: {
      id: 'pipe-recruitment', name: 'RECRUITMENT', label: 'Recruitment Pipeline',
      gates: [
        { id: 'gate-r1', name: 'SCOUT_OPS', label: 'Scout Operations', x: 120, y: 150, status: 'active', plan: '1. TARGET PROFILING:\nIdentify vulnerable demographics.\n\n2. APPROACH STRATEGY:\nDevelop tailored recruitment narratives.', taggedPeople: ['actor-5', 'actor-8'], lastUpdated: '2024-01-05', connections: ['gate-r2'] },
        { id: 'gate-r2', name: 'INDUCTION', label: 'Induction Phase', x: 420, y: 280, status: 'active', plan: '1. VETTING:\nMulti-stage background verification.\n\n2. INDOCTRINATION:\nGradual integration into cell structure.', taggedPeople: ['actor-4', 'actor-8'], lastUpdated: '2024-02-20', connections: ['gate-r3'] },
        { id: 'gate-r3', name: 'DEPLOY_ASSET', label: 'Asset Deployment', x: 720, y: 150, status: 'pending', plan: '1. ASSIGNMENT:\nMatch recruits to operational needs.\n\n2. EMBEDDING:\nPlace assets in target positions.', taggedPeople: ['actor-5'], lastUpdated: '2024-03-10', connections: [] },
      ]
    },
  };

  return { actors, edges, pipelines, nextNodeColor: 0 };
}

class Store {
  constructor() {
    this.data = null;
    this.listeners = [];
    this.load();

    // Initialize GunJS
    if (window.Gun) {
      this.gun = Gun([
        'https://gun-manhattan.herokuapp.com/gun',
        'https://relay.peer.ooo/gun',
        'https://peer.wallie.io/gun'
      ]);
      this.db = this.gun.get('demonopedia-global-state-v10'); // use a specific version key

      this.db.on((node) => {
        if (!node || !node.networkState) return;
        try {
          const remoteData = JSON.parse(node.networkState);
          
          // Basic conflict resolution - avoid infinite loops if it's the exact same data
          if (JSON.stringify(this.data) !== node.networkState) {
             this.data = remoteData;
             // Save locally without rebroadcasting
             localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
             this.listeners.forEach(fn => fn(this.data));
          }
        } catch (e) {
          console.error("Failed to parse remote sync data", e);
        }
      });
    }
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.data = JSON.parse(saved);
        if (!this.data.pipelines) {
           const seed = createSeedData();
           this.data.pipelines = seed.pipelines;
           this.save();
        }
      } else {
        this.data = createSeedData();
        this.save();
      }
    } catch (e) {
      console.error('Failed to load store:', e);
      this.data = createSeedData();
      this.save();
    }
  }

  save() {
    try {
      const stateStr = JSON.stringify(this.data);
      localStorage.setItem(STORAGE_KEY, stateStr);
      
      // Broadcast to network
      if (this.db) {
         this.db.put({ networkState: stateStr, timestamp: Date.now() });
      }
    } catch (e) {
      console.error('Failed to save store:', e);
    }
    this.listeners.forEach(fn => fn(this.data));
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  reset() {
    this.data = createSeedData();
    this.save();
  }

  // ─── Actors ───
  getActors() { return this.data.actors; }

  getActor(id) { return this.data.actors.find(a => a.id === id); }

  addActor(actor) {
    const newActor = {
      id: generateId(),
      name: actor.name || 'Unknown Subject',
      caste: actor.caste || 'Brahmin Brahmin',
      race: actor.race || 'Brahmin',
      religion: actor.religion || 'Hindu',
      spiritualAuthority: actor.spiritualAuthority || 'Brahmin Brahmin',
      age: actor.age || 'Unknown',
      tribe: actor.tribe || '',
      host: actor.host || '',
      quote: actor.quote || '',
      imageUrl: null,
      tags: actor.tags || [],
      intelLeaks: [],
    };
    this.data.actors.push(newActor);
    this.save();
    return newActor;
  }

  updateActor(id, updates) {
    const idx = this.data.actors.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.actors[idx] = { ...this.data.actors[idx], ...updates };
      this.save();
    }
  }

  deleteActor(id) {
    this.data.actors = this.data.actors.filter(a => a.id !== id);
    this.data.edges = this.data.edges.filter(e => e.source !== id && e.target !== id);
    // Remove from pipeline gates
    Object.values(this.data.pipelines).forEach(pipe => {
      pipe.gates.forEach(gate => {
        gate.taggedPeople = gate.taggedPeople.filter(p => p !== id);
      });
    });
    this.save();
  }

  addIntelLeak(actorId, leak) {
    const actor = this.getActor(actorId);
    if (actor) {
      const newLeak = {
        id: generateId(),
        type: leak.type || 'OBJECTIVE',
        title: leak.title || 'New Intel',
        description: leak.description || '',
        tags: leak.tags || [],
      };
      actor.intelLeaks.push(newLeak);
      // Add tags to actor if not already present
      newLeak.tags.forEach(tag => {
        if (!actor.tags.includes(tag)) {
          actor.tags.push(tag);
        }
      });
      this.save();
      return newLeak;
    }
  }

  removeIntelLeak(actorId, leakId) {
    const actor = this.getActor(actorId);
    if (actor) {
      actor.intelLeaks = actor.intelLeaks.filter(l => l.id !== leakId);
      this.save();
    }
  }

  // ─── Edges ───
  getEdges() { return this.data.edges; }

  addEdge(source, target) {
    const exists = this.data.edges.some(e =>
      (e.source === source && e.target === target) ||
      (e.source === target && e.target === source)
    );
    if (!exists) {
      this.data.edges.push({ source, target });
      this.save();
    }
  }

  removeEdge(source, target) {
    this.data.edges = this.data.edges.filter(e =>
      !((e.source === source && e.target === target) ||
        (e.source === target && e.target === source))
    );
    this.save();
  }

  // ─── Tags / Regions ───
  getAllTags() {
    const tags = new Set();
    this.data.actors.forEach(a => (a.tags || []).forEach(t => tags.add(t)));
    
    Array.from(tags).forEach(tag => {
      if (!REGION_CORNERS[tag]) {
        const i = Object.keys(REGION_CORNERS).length;
        const quadrants = [
          {x: 0.12, y: 0.35}, {x: 0.88, y: 0.35},
          {x: 0.12, y: 0.65}, {x: 0.88, y: 0.65},
          {x: 0.25, y: 0.15}, {x: 0.75, y: 0.15},
        ];
        REGION_CORNERS[tag] = quadrants[i % quadrants.length];
      }
      if (!REGION_COLORS[tag]) {
        const hash = Array.from(tag).reduce((a, b) => a + b.charCodeAt(0), 0);
        const hue = (hash * 137.5) % 360;
        REGION_COLORS[tag] = {
          bg: `hsla(${hue}, 40%, 50%, 0.12)`,
          border: `hsl(${hue}, 40%, 45%)`,
          text: `hsl(${hue}, 50%, 35%)`,
          glow: `hsla(${hue}, 40%, 50%, 0.25)`
        };
      }
    });

    return Array.from(tags);
  }

  getActorsByTag(tag) {
    return this.data.actors.filter(a => a.tags.includes(tag));
  }

  // ─── Pipelines ───
  getPipeline(tag) { return this.data.pipelines[tag]; }

  getAllPipelines() { return this.data.pipelines; }

  addGate(pipelineTag, gate) {
    if (!this.data.pipelines[pipelineTag]) {
      this.data.pipelines[pipelineTag] = {
        id: generateId(), name: pipelineTag, label: pipelineTag + ' Pipeline', gates: []
      };
    }
    const newGate = {
      id: generateId(),
      name: gate.name || 'NEW_GATE',
      label: gate.label || 'New Gate',
      x: gate.x || 200,
      y: gate.y || 200,
      status: 'pending',
      plan: '',
      taggedPeople: [],
      lastUpdated: new Date().toISOString().split('T')[0],
      connections: [],
    };
    this.data.pipelines[pipelineTag].gates.push(newGate);
    this.save();
    return newGate;
  }

  updateGate(pipelineTag, gateId, updates) {
    const pipe = this.data.pipelines[pipelineTag];
    if (pipe) {
      const idx = pipe.gates.findIndex(g => g.id === gateId);
      if (idx !== -1) {
        pipe.gates[idx] = { ...pipe.gates[idx], ...updates };
        this.save();
      }
    }
  }

  removeGate(pipelineTag, gateId) {
    const pipe = this.data.pipelines[pipelineTag];
    if (pipe) {
      pipe.gates = pipe.gates.filter(g => g.id !== gateId);
      // Remove connections referencing this gate
      pipe.gates.forEach(g => {
        g.connections = g.connections.filter(c => c !== gateId);
      });
      this.save();
    }
  }

  connectGates(pipelineTag, fromId, toId) {
    const pipe = this.data.pipelines[pipelineTag];
    if (pipe) {
      const gate = pipe.gates.find(g => g.id === fromId);
      if (gate && !gate.connections.includes(toId)) {
        gate.connections.push(toId);
        this.save();
      }
    }
  }

  disconnectGates(pipelineTag, fromId, toId) {
    const pipe = this.data.pipelines[pipelineTag];
    if (pipe) {
      const gate = pipe.gates.find(g => g.id === fromId);
      if (gate) {
        gate.connections = gate.connections.filter(c => c !== toId);
        this.save();
      }
    }
  }

  // ─── Pipeline management ───
  ensurePipeline(tag) {
    if (!this.data.pipelines[tag]) {
      this.data.pipelines[tag] = {
        id: generateId(),
        name: tag,
        label: tag.charAt(0) + tag.slice(1).toLowerCase() + ' Pipeline',
        gates: []
      };
      this.save();
    }
  }
}

export const store = new Store();
export { REGION_COLORS, REGION_CORNERS, NODE_COLORS, generateId };
