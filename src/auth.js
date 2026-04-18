// ─── Auth System ─────────────────────────────────────────────
// User registration, login, sessions, and admin management

const AUTH_USERS_KEY = 'demonopedia-users';
const SESSION_KEY    = 'demonopedia-session';
const ADMIN_USERNAME = 'admin';
const ADMIN_DEFAULT_PW = 'Admin1234!';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'demonopedia-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

class AuthSystem {
  constructor() {
    this.users = this._loadUsers();
    this.currentUser = this._loadSession();
    this._ensureAdmin();
  }

  _loadUsers() {
    try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]'); }
    catch { return []; }
  }

  _saveUsers() {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(this.users));
  }

  _loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  _saveSession(user) {
    if (user) {
      const session = { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      this.currentUser = session;
    } else {
      localStorage.removeItem(SESSION_KEY);
      this.currentUser = null;
    }
  }

  async _ensureAdmin() {
    if (!this.users.find(u => u.username === ADMIN_USERNAME)) {
      const hash = await hashPassword(ADMIN_DEFAULT_PW);
      const admin = {
        id: 'admin',
        username: ADMIN_USERNAME,
        email: 'admin@demonopedia.local',
        passwordHash: hash,
        isAdmin: true,
        createdAt: new Date().toISOString(),
      };
      this.users.push(admin);
      this._saveUsers();
    }
  }

  async register(username, email, password) {
    if (!username || !email || !password) throw new Error('All fields are required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    if (this.users.find(u => u.username.toLowerCase() === username.toLowerCase()))
      throw new Error('Username already taken');
    if (this.users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      throw new Error('Email already registered');

    const hash = await hashPassword(password);
    const user = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    this._saveUsers();
    this._saveSession(user);
    return user;
  }

  async login(username, password) {
    const user = this.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() ||
           u.email.toLowerCase() === username.toLowerCase()
    );
    if (!user) throw new Error('User not found');
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) throw new Error('Incorrect password');
    this._saveSession(user);
    return user;
  }

  logout() {
    this._saveSession(null);
  }

  isLoggedIn() { return !!this.currentUser; }

  isAdmin() { return this.currentUser?.isAdmin === true; }

  getCurrentUser() { return this.currentUser; }

  getAllUsers() { return this.users.map(u => ({ id: u.id, username: u.username, email: u.email, isAdmin: u.isAdmin, createdAt: u.createdAt })); }
}

export const auth = new AuthSystem();
export { hashPassword };
