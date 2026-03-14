// ===== PAYU APP.JS =====
'use strict';

// ===== STATE =====
const State = {
  currentScreen: 'login',
  isLoggedIn: false,
  balanceVisible: true,
  user: null,
  selectedCurrency: 'USD',
  deferredInstallPrompt: null,

  load() {
    try {
      const saved = localStorage.getItem('payu_user');
      if (saved) this.user = JSON.parse(saved);
      const bal = localStorage.getItem('payu_balance');
      if (bal !== null) this.balance = parseFloat(bal);
      else this.balance = 0;
      const txs = localStorage.getItem('payu_transactions');
      if (txs) this.transactions = JSON.parse(txs);
      else this.transactions = [];
      const session = localStorage.getItem('payu_session');
      if (session) this.isLoggedIn = true;
    } catch(e) { console.error(e); }
  },

  save() {
    try {
      if (this.user) localStorage.setItem('payu_user', JSON.stringify(this.user));
      localStorage.setItem('payu_balance', this.balance.toString());
      localStorage.setItem('payu_transactions', JSON.stringify(this.transactions));
    } catch(e) {}
  },

  addTransaction(tx) {
    this.transactions.unshift({ ...tx, id: Date.now(), date: new Date().toISOString() });
    if (this.transactions.length > 50) this.transactions.pop();
    this.save();
  }
};

// ===== DOM HELPERS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

// ===== TOAST =====
function toast(msg, type = 'info', duration = 3000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = $('#toast-container');
  const t = el('div', `toast ${type}`);
  t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-text">${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(-10px)';
    t.style.transition = '0.3s';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

// ===== RIPPLE EFFECT =====
function addRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const ripple = el('span', 'ripple');
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

function enableRipple(selector) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', addRipple);
  });
}

// ===== SCREEN NAVIGATION =====
const Screens = {
  show(id, direction = 'up') {
    $$('.screen').forEach(s => {
      s.classList.remove('active', 'slide-in-left', 'slide-in-right');
    });
    const screen = $(`#${id}-screen`);
    if (!screen) return;
    screen.classList.add('active');
    screen.scrollTop = 0;
    State.currentScreen = id;

    const navScreens = ['home', 'deposit', 'withdraw', 'transfer', 'profile'];
    if (navScreens.includes(id)) {
      $('#bottom-nav').classList.add('visible');
      $$('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.screen === id);
      });
    } else {
      $('#bottom-nav').classList.remove('visible');
    }

    if (id === 'home') this.renderHome();
    if (id === 'profile') this.renderProfile();
  },

  renderHome() {
    const user = State.user;
    if (!user) return;
    $('#home-greeting').textContent = getGreeting();
    $('#home-name').textContent = user.name.split(' ')[0];
    $('#balance-amount').textContent = formatCurrency(State.balance);
    $('#balance-account').textContent = formatAccountNumber(user.accountNumber);
    renderTransactions();
  },

  renderProfile() {
    const user = State.user;
    if (!user) return;
    $('#profile-avatar').textContent = user.name.charAt(0).toUpperCase();
    $('#profile-name-big').textContent = user.name;
    $('#profile-account-display').textContent = formatAccountNumber(user.accountNumber);
    $('#profile-info-name').textContent = user.name;
    $('#profile-info-email').textContent = user.email || 'Not set';
    $('#profile-info-username').textContent = user.username;
    $('#profile-info-account').textContent = formatAccountNumber(user.accountNumber);
    // Sidebar
    $('#sidebar-avatar-letter').textContent = user.name.charAt(0).toUpperCase();
    $('#sidebar-user-name').textContent = user.name;
    $('#sidebar-user-account').textContent = formatAccountNumber(user.accountNumber);
  }
};

// ===== HELPERS =====
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatAccountNumber(num) {
  if (!num) return '';
  const s = num.toString().padStart(10, '0');
  return s.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning ☀️';
  if (h < 17) return 'Good Afternoon 🌤️';
  return 'Good Evening 🌙';
}

function generateAccountNumber() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function showProcessing(msg = 'Processing...', sub = 'Please wait') {
  $('#processing-text').textContent = msg;
  $('#processing-sub').textContent = sub;
  $('#processing-overlay').classList.add('visible');
}

function hideProcessing() {
  $('#processing-overlay').classList.remove('visible');
}

function showSuccess(title, msg, onClose) {
  hideProcessing();
  $('#success-title').textContent = title;
  $('#success-msg').textContent = msg;
  $('#success-overlay').classList.add('visible');
  const closeBtn = $('#success-close-btn');
  closeBtn.onclick = () => {
    $('#success-overlay').classList.remove('visible');
    if (onClose) onClose();
  };
}

function showPopup(title, msg, icon = '⚠️') {
  hideProcessing();
  $('#popup-icon').textContent = icon;
  $('#popup-title').textContent = title;
  $('#popup-msg').textContent = msg;
  $('#popup-overlay').classList.add('visible');
}

function hidePopup() {
  $('#popup-overlay').classList.remove('visible');
}

// ===== SIDEBAR =====
function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#sidebar-overlay').classList.add('visible');
  // Update sidebar content
  if (State.user) {
    $('#sidebar-avatar-letter').textContent = State.user.name.charAt(0).toUpperCase();
    $('#sidebar-user-name').textContent = State.user.name;
    $('#sidebar-user-account').textContent = formatAccountNumber(State.user.accountNumber);
  }
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-overlay').classList.remove('visible');
}

// ===== TRANSACTIONS RENDERER =====
function renderTransactions() {
  const list = $('#transactions-list');
  if (!list) return;

  if (!State.transactions.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No transactions yet.<br>Make your first deposit!</div>
      </div>
    `;
    return;
  }

  const txIcons = {
    deposit: { icon: '⬇️', bg: 'rgba(16,185,129,0.1)' },
    withdraw: { icon: '⬆️', bg: 'rgba(239,68,68,0.1)' },
    transfer: { icon: '↗️', bg: 'rgba(56,189,248,0.1)' }
  };

  list.innerHTML = State.transactions.map((tx, i) => {
    const meta = txIcons[tx.type] || txIcons.transfer;
    const isPositive = tx.type === 'deposit';
    const sign = isPositive ? '+' : '-';
    const d = new Date(tx.date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
      <div class="tx-item" style="animation-delay:${i * 0.05}s;cursor:pointer" onclick="showReceipt(${tx.id})">
        <div class="tx-icon" style="background:${meta.bg}">${meta.icon}</div>
        <div class="tx-info">
          <div class="tx-name">${tx.label}</div>
          <div class="tx-date">${dateStr} · ${timeStr}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <div class="tx-amount ${isPositive ? 'positive' : 'negative'}">${sign}${formatCurrency(tx.amount, tx.currency || 'USD')}</div>
          <div style="font-size:10px;color:var(--text-muted);letter-spacing:0.5px;text-transform:uppercase">${tx.type}</div>
        </div>
      </div>
    `;
  }).join('');
}

function showReceipt(txId) {
  const tx = State.transactions.find(t => t.id === txId);
  if (!tx) return;

  const d = new Date(tx.date);
  const fullDate = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const fullTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const refId = 'PYU' + tx.id.toString().slice(-10).toUpperCase();
  const isPositive = tx.type === 'deposit';
  const sign = isPositive ? '+' : '-';
  const typeColors = { deposit: '#10b981', withdraw: '#ef4444', transfer: '#38bdf8' };
  const color = typeColors[tx.type] || '#38bdf8';
  const typeEmoji = { deposit: '⬇️', withdraw: '⬆️', transfer: '↗️' }[tx.type] || '↗️';
  const statusText = tx.type === 'withdraw' ? 'Processing (7–15 Working Days)' : 'Completed';
  const statusColor = tx.type === 'withdraw' ? '#f59e0b' : '#10b981';

  const extra = [];
  if (tx.note) extra.push(['Note', tx.note]);
  if (tx.country) extra.push(['Country', tx.country]);
  if (tx.currency) extra.push(['Currency', tx.currency]);

  const receipt = document.getElementById('receipt-overlay');
  receipt.innerHTML = `
    <div class="receipt-sheet">
      <div class="popup-indicator"></div>

      <div style="text-align:center;margin-bottom:24px">
        <div style="width:64px;height:64px;border-radius:20px;background:${color}18;border:1px solid ${color}44;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 14px">${typeEmoji}</div>
        <div style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">${tx.type}</div>
        <div style="font-size:36px;font-weight:800;letter-spacing:-1px;color:${color}">${sign}${formatCurrency(tx.amount, tx.currency || 'USD')}</div>
        <div style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:5px 14px;border-radius:20px;background:${statusColor}18;border:1px solid ${statusColor}44;font-size:12px;font-weight:600;color:${statusColor}">
          <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block"></span>
          ${statusText}
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:20px">
        ${receiptRow('Reference', refId, true)}
        ${receiptRow('Date', fullDate)}
        ${receiptRow('Time', fullTime)}
        ${receiptRow('Description', tx.label)}
        ${extra.map(([k,v]) => receiptRow(k, v)).join('')}
      </div>

      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:20px;font-size:12px;color:var(--text-muted)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        Secured by PayU Encryption
      </div>

      <button class="btn btn-primary" onclick="hideReceipt()" style="margin-bottom:8px">Close Receipt</button>
    </div>
  `;
  receipt.classList.add('visible');
}

function receiptRow(label, value, mono = false) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:13px 16px;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.7px">${label}</span>
      <span style="font-size:13px;font-weight:600;text-align:right;max-width:60%;${mono ? 'font-family:var(--font-mono);color:var(--accent-blue);font-size:12px;letter-spacing:1px' : ''}">${value}</span>
    </div>
  `;
}

function hideReceipt() {
  document.getElementById('receipt-overlay').classList.remove('visible');
}

// ===== BALANCE TOGGLE =====
function toggleBalance() {
  State.balanceVisible = !State.balanceVisible;
  const amountEl = $('#balance-amount');
  const icon = $('#balance-eye-icon');
  if (State.balanceVisible) {
    amountEl.classList.remove('balance-blur');
    amountEl.textContent = formatCurrency(State.balance);
    icon.innerHTML = EYE_OPEN_ICON;
  } else {
    amountEl.classList.add('balance-blur');
    amountEl.textContent = '••••••';
    icon.innerHTML = EYE_CLOSED_ICON;
  }
}

// ===== SVG ICONS =====
const EYE_OPEN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// ===== LOGIN =====
function handleLogin(e) {
  e.preventDefault();
  const username = $('#login-username').value.trim();
  const password = $('#login-password').value;

  if (!username || !password) {
    toast('Please enter your credentials', 'error');
    return;
  }

  const btn = $('#login-btn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Sign In';
    btn.disabled = false;

    if (username === 'umerhayat1993' && password === 'umer0895') {
      // Existing hardcoded user
      if (!State.user) {
        State.user = {
          name: 'Umer Hayat',
          email: 'umer@payu.app',
          username: 'umerhayat1993',
          accountNumber: '1234567890'
        };
        State.save();
      }
      loginSuccess();
    } else {
      // Check registered users
      try {
        const users = JSON.parse(localStorage.getItem('payu_users') || '[]');
        const found = users.find(u => u.username === username && u.password === password);
        if (found) {
          State.user = found;
          State.balance = parseFloat(localStorage.getItem(`payu_balance_${found.username}`) || '0');
          loginSuccess();
        } else {
          toast('Invalid username or password', 'error');
          $('#login-username').style.borderColor = 'var(--accent-red)';
          setTimeout(() => $('#login-username').style.borderColor = '', 2000);
        }
      } catch(err) {
        toast('Invalid username or password', 'error');
      }
    }
  }, 800);
}

function loginSuccess() {
  localStorage.setItem('payu_session', '1');
  State.isLoggedIn = true;
  toast('Welcome back! 👋', 'success');
  Screens.show('home');
  setTimeout(() => {
    if (State.deferredInstallPrompt) {
      $('#install-banner').classList.add('visible');
    }
  }, 3000);
}

function handleLogout() {
  localStorage.removeItem('payu_session');
  State.isLoggedIn = false;
  State.user = null;
  closeSidebar();
  setTimeout(() => Screens.show('login'), 200);
  toast('Logged out successfully', 'info');
}

// ===== REGISTER =====
function showRegister() {
  $('#login-section').style.display = 'none';
  $('#register-section').style.display = 'block';
}

function showLogin() {
  $('#login-section').style.display = 'block';
  $('#register-section').style.display = 'none';
}

function handleRegister(e) {
  e.preventDefault();
  const name = $('#reg-name').value.trim();
  const email = $('#reg-email').value.trim();
  const username = $('#reg-username').value.trim();
  const password = $('#reg-password').value;

  if (!name || !email || !username || !password) {
    toast('Please fill all fields', 'error');
    return;
  }
  if (password.length < 6) {
    toast('Password must be at least 6 characters', 'error');
    return;
  }

  const users = JSON.parse(localStorage.getItem('payu_users') || '[]');
  if (users.find(u => u.username === username)) {
    toast('Username already taken', 'error');
    return;
  }

  const newUser = {
    name,
    email,
    username,
    password,
    accountNumber: generateAccountNumber()
  };
  users.push(newUser);
  localStorage.setItem('payu_users', JSON.stringify(users));
  localStorage.setItem(`payu_balance_${username}`, '0');

  toast('Registration successful! Please log in.', 'success');
  showLogin();
  $('#reg-name').value = '';
  $('#reg-email').value = '';
  $('#reg-username').value = username;
  $('#login-username').value = username;
}

// ===== DEPOSIT =====
function handleDeposit(e) {
  e.preventDefault();
  const amountStr = $('#deposit-amount').value;
  const currency = $('#deposit-currency').value;
  const bank = $('#deposit-bank').value;
  const note = $('#deposit-note').value.trim();

  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
  if (!bank) { toast('Please select a bank', 'error'); return; }

  const isSecret = note === '08951';

  showProcessing('Processing Deposit', 'Connecting to your bank...');

  const delay = isSecret ? 500 : 2500;

  setTimeout(() => {
    if (isSecret || true) {
      // For demo, all deposits work (secret code bypasses any checks)
      if (currency === 'USD') {
        State.balance += amount;
      }
      State.save();
      State.addTransaction({
        type: 'deposit',
        label: `Deposit via ${bank}`,
        amount,
        currency,
        note
      });

      Screens.renderHome();
      showSuccess(
        'Deposit Successful! 🎉',
        `${formatCurrency(amount, currency)} has been added to your wallet.`,
        () => Screens.show('home')
      );

      // Reset form
      $('#deposit-form').reset();
    }
  }, delay);
}

// ===== WITHDRAW =====
function handleWithdraw(e) {
  e.preventDefault();
  const amount = parseFloat($('#withdraw-amount').value);
  const currency = $('#withdraw-currency').value;
  const bankName = $('#withdraw-bank').value.trim();
  const accountNum = $('#withdraw-account-num').value.trim();
  const country = $('#withdraw-country').value;

  if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
  if (!bankName) { toast('Enter bank name', 'error'); return; }
  if (!accountNum) { toast('Enter account number or IBAN', 'error'); return; }
  if (!country) { toast('Select a country', 'error'); return; }

  if (amount > State.balance) {
    toast('Insufficient balance', 'error');
    return;
  }

  showProcessing('Processing Withdrawal', 'Verifying bank details...');

  setTimeout(() => {
    if (country === 'PK') {
      showPopup(
        'Withdrawal Restricted',
        'You cannot withdraw to Pakistani banks without first depositing $1000 into your PayU account.',
        '🚫'
      );
    } else {
      State.balance -= amount;
      State.save();
      State.addTransaction({
        type: 'withdraw',
        label: `Withdrawal to ${bankName}`,
        amount,
        currency,
        country
      });
      Screens.renderHome();
      showSuccess(
        'Withdrawal Initiated!',
        `${formatCurrency(amount, currency)} is being transferred to ${bankName}. ETA: 1–3 business days.`,
        () => Screens.show('home')
      );
      $('#withdraw-form').reset();
    }
  }, 5000);
}

// ===== TRANSFER =====
function handleTransfer(e) {
  e.preventDefault();
  const recipient = $('#transfer-recipient').value.trim();
  const amount = parseFloat($('#transfer-amount').value);
  const currency = $('#transfer-currency').value;
  const country = $('#transfer-country').value;

  if (!recipient) { toast('Enter recipient account number', 'error'); return; }
  if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
  if (!country) { toast('Select destination country', 'error'); return; }
  if (amount > State.balance) { toast('Insufficient balance', 'error'); return; }

  showProcessing('Processing Transfer', 'Routing your payment...');

  setTimeout(() => {
    State.balance -= amount;
    State.save();
    State.addTransaction({
      type: 'transfer',
      label: `Transfer to •••${recipient.slice(-4)}`,
      amount,
      currency,
      country
    });
    Screens.renderHome();
    showSuccess(
      'Transfer Sent! ✈️',
      `${formatCurrency(amount, currency)} has been sent to account ${recipient}.`,
      () => Screens.show('home')
    );
    $('#transfer-form').reset();
  }, 3000);
}

// ===== PROFILE EDITING =====
function openEditModal(field) {
  const user = State.user;
  const titles = { name: 'Edit Name', accountNumber: 'Edit Account Number' };
  const values = { name: user.name, accountNumber: user.accountNumber };

  $('#edit-modal-title').textContent = titles[field] || 'Edit';
  $('#edit-field-input').value = values[field] || '';
  $('#edit-field-input').placeholder = field === 'name' ? 'Your full name' : 'Account number';
  $('#edit-modal').dataset.field = field;
  $('#edit-modal').classList.add('visible');
}

function saveEdit() {
  const field = $('#edit-modal').dataset.field;
  const value = $('#edit-field-input').value.trim();
  if (!value) { toast('Value cannot be empty', 'error'); return; }

  State.user[field] = value;
  State.save();
  $('#edit-modal').classList.remove('visible');
  Screens.renderProfile();
  toast('Profile updated!', 'success');
}

// ===== STATUS BAR =====
function updateStatusBar() {
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const timeStr = `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
  const el = document.getElementById('status-time');
  if (el) el.textContent = timeStr;
}

// ===== PWA INSTALL =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  State.deferredInstallPrompt = e;
  if (State.isLoggedIn) {
    setTimeout(() => $('#install-banner').classList.add('visible'), 2000);
  }
});

function triggerInstall() {
  if (State.deferredInstallPrompt) {
    State.deferredInstallPrompt.prompt();
    State.deferredInstallPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') toast('PayU installed! 🎉', 'success');
      State.deferredInstallPrompt = null;
      $('#install-banner').classList.remove('visible');
    });
  }
}

// ===== BUILD UI =====
function buildUI() {
  document.body.innerHTML = `
    <!-- SPLASH -->
    <div id="splash">
      <div class="splash-logo">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M8 8h18c6.627 0 12 5.373 12 12s-5.373 12-12 12H16v8H8V8z" fill="#38bdf8" opacity="0.9"/>
          <path d="M16 20h10c2.21 0 4 1.79 4 4s-1.79 4-4 4H16v-8z" fill="#0f172a"/>
        </svg>
      </div>
      <div class="splash-name">PayU</div>
      <div class="splash-tagline">Digital Wallet</div>
      <div class="splash-loader"><div class="splash-loader-bar"></div></div>
    </div>

    <!-- BACKGROUND -->
    <div class="bg-mesh"></div>

    <!-- TOAST -->
    <div id="toast-container"></div>

    <!-- STATUS BAR -->
    <div class="status-bar">
      <span class="status-time" id="status-time"></span>
      <div class="status-icons">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="4" width="3" height="8" rx="1"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="1"/><rect x="9" y="1" width="3" height="11" rx="1"/><rect x="13.5" y="0" width="2.5" height="12" rx="1"/></svg>
        <svg width="15" height="12" viewBox="0 0 15 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7.5 3C9.8 3 11.9 4 13.4 5.5M1.6 5.5C3.1 4 5.2 3 7.5 3"/><path d="M7.5 6.5C8.8 6.5 10 7 10.9 7.9M4.1 7.9C5 7 6.2 6.5 7.5 6.5"/><circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor"/><rect x="22" y="3.5" width="2.5" height="5" rx="1.25" fill="currentColor"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/></svg>
      </div>
    </div>

    <!-- APP -->
    <div id="app">
      <!-- SIDEBAR OVERLAY -->
      <div id="sidebar-overlay" onclick="closeSidebar()"></div>

      <!-- SIDEBAR -->
      <div id="sidebar">
        <div class="sidebar-header">
          <button class="sidebar-close" onclick="closeSidebar()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="sidebar-avatar" id="sidebar-avatar-letter">U</div>
          <div class="sidebar-name" id="sidebar-user-name">Loading...</div>
          <div class="sidebar-account" id="sidebar-user-account">0000 000 000</div>
          <div class="sidebar-badge">Verified Account</div>
        </div>
        <nav class="sidebar-nav">
          <div class="sidebar-nav-item" onclick="closeSidebar(); setTimeout(()=>Screens.show('home'),200)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home</span>
          </div>
          <div class="sidebar-nav-item" onclick="closeSidebar(); setTimeout(()=>Screens.show('deposit'),200)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            <span>Deposit</span>
          </div>
          <div class="sidebar-nav-item" onclick="closeSidebar(); setTimeout(()=>Screens.show('withdraw'),200)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            <span>Withdraw</span>
          </div>
          <div class="sidebar-nav-item" onclick="closeSidebar(); setTimeout(()=>Screens.show('transfer'),200)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span>Transfer</span>
          </div>
          <div class="sidebar-nav-item" onclick="closeSidebar(); setTimeout(()=>Screens.show('profile'),200)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Profile</span>
          </div>
          <div class="sidebar-nav-item" onclick="triggerInstall()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Install App</span>
          </div>
        </nav>
        <div class="sidebar-footer">
          <button class="btn btn-secondary sidebar-nav-item danger" onclick="handleLogout()" style="width:100%;justify-content:center;gap:8px;border-radius:12px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
          </button>
          <div class="sidebar-version">PayU v1.0.0 · Secure & Encrypted</div>
        </div>
      </div>

      <!-- LOGIN SCREEN -->
      <div id="login-screen" class="screen active" style="padding-bottom:32px">
        <div class="login-logo">
          <div class="logo-icon">
            <svg width="38" height="38" viewBox="0 0 48 48" fill="none">
              <path d="M8 8h18c6.627 0 12 5.373 12 12s-5.373 12-12 12H16v8H8V8z" fill="#38bdf8"/>
              <path d="M16 20h10c2.21 0 4 1.79 4 4s-1.79 4-4 4H16v-8z" fill="#050d1a"/>
            </svg>
          </div>
          <div class="logo-text">PayU</div>
          <div class="logo-sub">Digital Wallet</div>
        </div>

        <div id="login-section">
          <div class="login-card">
            <div class="card-title">Welcome back</div>
            <div class="card-sub">Sign in to your account</div>
            <form id="login-form" onsubmit="handleLogin(event)">
              <div class="input-group">
                <label class="input-label">Username</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input type="text" id="login-username" placeholder="Enter username" autocomplete="username" autocapitalize="none">
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">Password</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input type="password" id="login-password" placeholder="Enter password" autocomplete="current-password">
                  <button type="button" class="eye-toggle" onclick="togglePwdVisibility('login-password', this)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" id="login-btn" style="margin-top:8px">Sign In</button>
            </form>
            <div class="divider"><div class="divider-line"></div><span class="divider-text">or</span><div class="divider-line"></div></div>
            <button class="btn btn-ghost" onclick="showRegister()">Create Account</button>
          </div>
        </div>

        <div id="register-section" style="display:none">
          <div class="login-card register-card">
            <div class="card-title">Create Account</div>
            <div class="card-sub">Join PayU for free</div>
            <form id="register-form" onsubmit="handleRegister(event)">
              <div class="input-group">
                <label class="input-label">Full Name</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input type="text" id="reg-name" placeholder="Your full name" autocapitalize="words">
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">Email</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input type="email" id="reg-email" placeholder="your@email.com" autocapitalize="none">
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">Username</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/></svg>
                  <input type="text" id="reg-username" placeholder="Choose a username" autocapitalize="none">
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">Password</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <input type="password" id="reg-password" placeholder="Min 6 characters" autocomplete="new-password">
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="margin-top:8px">Create Account</button>
            </form>
            <div class="divider"><div class="divider-line"></div><span class="divider-text">or</span><div class="divider-line"></div></div>
            <button class="btn btn-ghost" onclick="showLogin()">Already have an account? Sign in</button>
          </div>
        </div>
      </div>

      <!-- HOME SCREEN -->
      <div id="home-screen" class="screen">
        <div class="home-header">
          <div>
            <div class="home-greeting" id="home-greeting">Good Morning ☀️</div>
            <div class="home-name" id="home-name">Loading...</div>
          </div>
          <div class="header-actions">
            <div class="icon-btn" onclick="openSidebar()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </div>
          </div>
        </div>

        <!-- BALANCE CARD -->
        <div class="balance-card" id="balance-card">
          <div class="card-top">
            <div class="card-label">Total Balance</div>
            <div class="card-flag">
              <div class="flag-circle">🇺🇸</div>
              <span>USD</span>
            </div>
          </div>
          <div class="balance-amount" id="balance-amount">$0.00</div>
          <div class="balance-label">Available Balance</div>
          <div class="card-bottom">
            <div class="account-info">
              <div class="account-number" id="balance-account">0000 000 000</div>
            </div>
            <div class="card-toggle" onclick="toggleBalance()" id="balance-toggle">
              <span id="balance-eye-icon">${EYE_OPEN_ICON}</span>
            </div>
          </div>
        </div>

        <!-- QUICK ACTIONS -->
        <div class="section-title">Quick Actions</div>
        <div class="quick-actions">
          <div class="action-btn" onclick="Screens.show('deposit')">
            <div class="action-icon deposit">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            </div>
            <span>Deposit</span>
          </div>
          <div class="action-btn" onclick="Screens.show('withdraw')">
            <div class="action-icon withdraw">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </div>
            <span>Withdraw</span>
          </div>
          <div class="action-btn" onclick="Screens.show('transfer')">
            <div class="action-icon transfer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </div>
            <span>Transfer</span>
          </div>
          <div class="action-btn" onclick="document.getElementById('transactions-list').scrollIntoView({behavior:'smooth',block:'start'}); toast('Scroll down to see all transactions', 'info', 2000)">
            <div class="action-icon history">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span>History</span>
          </div>
        </div>

        <!-- TRANSACTIONS -->
        <div class="section-title">Recent Transactions</div>
        <div class="transactions-list" id="transactions-list">
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-text">No transactions yet.<br>Make your first deposit!</div>
          </div>
        </div>
      </div>

      <!-- DEPOSIT SCREEN -->
      <div id="deposit-screen" class="screen">
        <div class="screen-header">
          <div class="back-btn" onclick="Screens.show('home')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div class="screen-title">Add Money</div>
        </div>

        <div class="form-section">
          <form id="deposit-form" onsubmit="handleDeposit(event)">
            <div class="form-card">
              <label class="input-label">Amount</label>
              <div class="amount-input-wrap">
                <span class="amount-prefix">$</span>
                <input type="number" id="deposit-amount" placeholder="0.00" min="1" step="0.01" style="padding-left:50px;font-size:32px;font-weight:800;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;padding-top:16px;padding-bottom:16px;color:var(--text-primary);font-family:var(--font-display);outline:none;transition:all var(--transition)" onFocus="this.style.borderColor='var(--accent-blue)'" onBlur="this.style.borderColor='var(--border)'">
              </div>

              <label class="input-label" style="margin-top:20px">Currency</label>
              <div class="currency-selector" id="deposit-currency-chips">
                <div class="currency-chip active" data-val="USD" onclick="selectCurrencyChip(this, 'deposit')">USD $</div>
                <div class="currency-chip" data-val="EUR" onclick="selectCurrencyChip(this, 'deposit')">EUR €</div>
                <div class="currency-chip" data-val="GBP" onclick="selectCurrencyChip(this, 'deposit')">GBP £</div>
                <div class="currency-chip" data-val="PKR" onclick="selectCurrencyChip(this, 'deposit')">PKR ₨</div>
              </div>
              <input type="hidden" id="deposit-currency" value="USD">
            </div>

            <div class="form-card">
              <div class="input-group">
                <label class="input-label">Select Bank</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  <select id="deposit-bank">
                    <option value="">— Choose bank —</option>
                    <option>Chase Bank</option>
                    <option>Bank of America</option>
                    <option>Wells Fargo</option>
                    <option>Citibank</option>
                    <option>Capital One</option>
                    <option>TD Bank</option>
                    <option>HSBC</option>
                    <option>Barclays</option>
                    <option>Standard Chartered</option>
                  </select>
                </div>
              </div>

              <div class="input-group">
                <label class="input-label">Note (optional)</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <input type="text" id="deposit-note" placeholder="Add a note...">
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary">
              <span>Submit Deposit</span>
            </button>
          </form>
        </div>
      </div>

      <!-- WITHDRAW SCREEN -->
      <div id="withdraw-screen" class="screen">
        <div class="screen-header">
          <div class="back-btn" onclick="Screens.show('home')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div class="screen-title">Withdraw</div>
        </div>

        <div class="form-section">
          <!-- BALANCE MINI CARD -->
          <div style="background:var(--bg-glass);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Available</div>
              <div style="font-size:22px;font-weight:700" id="withdraw-balance">$0.00</div>
            </div>
            <div style="font-size:28px">💳</div>
          </div>

          <form id="withdraw-form" onsubmit="handleWithdraw(event)">
            <div class="form-card">
              <label class="input-label">Amount</label>
              <div class="input-wrap">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                <input type="number" id="withdraw-amount" placeholder="0.00" min="1" step="0.01">
              </div>

              <label class="input-label" style="margin-top:16px">Currency</label>
              <div class="currency-selector" id="withdraw-currency-chips">
                <div class="currency-chip active" data-val="USD" onclick="selectCurrencyChip(this, 'withdraw')">USD $</div>
                <div class="currency-chip" data-val="EUR" onclick="selectCurrencyChip(this, 'withdraw')">EUR €</div>
                <div class="currency-chip" data-val="GBP" onclick="selectCurrencyChip(this, 'withdraw')">GBP £</div>
              </div>
              <input type="hidden" id="withdraw-currency" value="USD">
            </div>

            <div class="form-card">
              <div class="input-group">
                <label class="input-label">Bank Name</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                  <input type="text" id="withdraw-bank" placeholder="Enter bank name">
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">Account Number / IBAN</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  <input type="text" id="withdraw-account-num" placeholder="IBAN or account number" autocapitalize="characters">
                </div>
              </div>
              <div class="input-group" style="margin-bottom:0">
                <label class="input-label">Destination Country</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                  <select id="withdraw-country">
                    <option value="">— Select country —</option>
                    <option value="US">🇺🇸 United States</option>
                    <option value="GB">🇬🇧 United Kingdom</option>
                    <option value="DE">🇩🇪 Germany</option>
                    <option value="FR">🇫🇷 France</option>
                    <option value="AE">🇦🇪 UAE</option>
                    <option value="CA">🇨🇦 Canada</option>
                    <option value="AU">🇦🇺 Australia</option>
                    <option value="PK">🇵🇰 Pakistan</option>
                    <option value="IN">🇮🇳 India</option>
                    <option value="BD">🇧🇩 Bangladesh</option>
                    <option value="NG">🇳🇬 Nigeria</option>
                    <option value="GH">🇬🇭 Ghana</option>
                  </select>
                </div>
              </div>
            </div>

            <div style="display:flex;align-items:flex-start;gap:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:14px;padding:14px 16px;margin-bottom:16px">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div style="font-size:13px;color:#fcd34d;line-height:1.5;font-weight:500">
                Withdrawals will be processed to Banks within <strong style="color:#fbbf24">7–15 working days</strong> depending on your bank and region.
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg, #991b1b, #ef4444);box-shadow:0 4px 20px rgba(239,68,68,0.3)">
              Withdraw Funds
            </button>
          </form>
        </div>
      </div>

      <!-- TRANSFER SCREEN -->
      <div id="transfer-screen" class="screen">
        <div class="screen-header">
          <div class="back-btn" onclick="Screens.show('home')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div class="screen-title">Send Money</div>
        </div>

        <div class="form-section">
          <div style="background:var(--bg-glass);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Your Balance</div>
              <div style="font-size:22px;font-weight:700" id="transfer-balance">$0.00</div>
            </div>
            <div style="font-size:28px">💸</div>
          </div>

          <form id="transfer-form" onsubmit="handleTransfer(event)">
            <div class="form-card">
              <div class="input-group">
                <label class="input-label">Recipient Account Number</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <input type="text" id="transfer-recipient" placeholder="Enter account number">
                </div>
              </div>
              <div class="input-group">
                <label class="input-label">Amount</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  <input type="number" id="transfer-amount" placeholder="0.00" min="1" step="0.01">
                </div>
              </div>

              <label class="input-label">Currency</label>
              <div class="currency-selector" id="transfer-currency-chips">
                <div class="currency-chip active" data-val="USD" onclick="selectCurrencyChip(this, 'transfer')">USD $</div>
                <div class="currency-chip" data-val="EUR" onclick="selectCurrencyChip(this, 'transfer')">EUR €</div>
                <div class="currency-chip" data-val="GBP" onclick="selectCurrencyChip(this, 'transfer')">GBP £</div>
              </div>
              <input type="hidden" id="transfer-currency" value="USD">

              <div class="input-group" style="margin-top:4px">
                <label class="input-label">Destination Country</label>
                <div class="input-wrap">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                  <select id="transfer-country">
                    <option value="">— Select country —</option>
                    <option value="US">🇺🇸 United States</option>
                    <option value="GB">🇬🇧 United Kingdom</option>
                    <option value="DE">🇩🇪 Germany</option>
                    <option value="FR">🇫🇷 France</option>
                    <option value="AE">🇦🇪 UAE</option>
                    <option value="CA">🇨🇦 Canada</option>
                    <option value="AU">🇦🇺 Australia</option>
                    <option value="PK">🇵🇰 Pakistan</option>
                    <option value="IN">🇮🇳 India</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary">
              Send Money ✈️
            </button>
          </form>
        </div>
      </div>

      <!-- PROFILE SCREEN -->
      <div id="profile-screen" class="screen">
        <div class="screen-header" style="padding-bottom:0">
          <div class="back-btn" onclick="Screens.show('home')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div class="screen-title">Profile</div>
        </div>

        <div class="profile-hero">
          <div class="profile-avatar-big" id="profile-avatar">U</div>
          <div class="profile-name-big" id="profile-name-big">Loading...</div>
          <div class="profile-account-num" id="profile-account-display">0000 000 000</div>
        </div>

        <div class="info-card">
          <div class="info-row">
            <div>
              <div class="info-row-label">Full Name</div>
              <div class="info-row-value" id="profile-info-name">—</div>
            </div>
            <div class="edit-icon-btn" onclick="openEditModal('name')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
          <div class="info-row">
            <div>
              <div class="info-row-label">Email</div>
              <div class="info-row-value" id="profile-info-email">—</div>
            </div>
          </div>
          <div class="info-row">
            <div>
              <div class="info-row-label">Username</div>
              <div class="info-row-value" style="font-family:var(--font-mono);font-size:14px" id="profile-info-username">—</div>
            </div>
          </div>
          <div class="info-row">
            <div>
              <div class="info-row-label">Account Number</div>
              <div class="info-row-value" style="font-family:var(--font-mono);font-size:14px" id="profile-info-account">—</div>
            </div>
            <div class="edit-icon-btn" onclick="openEditModal('accountNumber')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
          </div>
        </div>

        <div class="info-card" style="margin-bottom:16px">
          <div class="info-row">
            <div>
              <div class="info-row-label">Balance</div>
              <div class="info-row-value" id="profile-balance">$0.00</div>
            </div>
          </div>
          <div class="info-row">
            <div>
              <div class="info-row-label">Status</div>
              <div class="info-row-value" style="color:var(--accent-green)">● Active & Verified</div>
            </div>
          </div>
        </div>

        <div style="padding:0 20px;margin-bottom:32px">
          <button class="btn btn-secondary" onclick="handleLogout()" style="display:flex;align-items:center;justify-content:center;gap:10px;color:var(--accent-red);border-color:rgba(239,68,68,0.2)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>

      <!-- BOTTOM NAV -->
      <div id="bottom-nav">
        <div class="nav-pill">
          <button class="nav-item active" data-screen="home" onclick="Screens.show('home')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home</span>
          </button>
          <button class="nav-item" data-screen="deposit" onclick="Screens.show('deposit')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            <span>Deposit</span>
          </button>
          <button class="nav-item" data-screen="withdraw" onclick="Screens.show('withdraw')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            <span>Withdraw</span>
          </button>
          <button class="nav-item" data-screen="transfer" onclick="Screens.show('transfer')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span>Send</span>
          </button>
          <button class="nav-item" data-screen="profile" onclick="Screens.show('profile')">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Profile</span>
          </button>
        </div>
      </div>

      <!-- PROCESSING OVERLAY -->
      <div id="processing-overlay">
        <div class="processing-icon"></div>
        <div class="processing-text" id="processing-text">Processing...</div>
        <div class="processing-sub" id="processing-sub">Please wait</div>
      </div>

      <!-- SUCCESS OVERLAY -->
      <div id="success-overlay">
        <div class="success-circle">
          <svg class="success-check" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="success-title" id="success-title">Success!</div>
        <div class="success-msg" id="success-msg">Your transaction was completed.</div>
        <button class="btn btn-primary" id="success-close-btn" style="width:200px">Done</button>
      </div>

      <!-- POPUP OVERLAY -->
      <div id="popup-overlay">
        <div class="popup-sheet">
          <div class="popup-indicator"></div>
          <div class="popup-icon" id="popup-icon">⚠️</div>
          <div class="popup-title" id="popup-title">Notice</div>
          <div class="popup-msg" id="popup-msg">Something happened.</div>
          <button class="btn btn-primary" onclick="hidePopup()">Understood</button>
        </div>
      </div>

      <!-- EDIT MODAL -->
      <div id="edit-modal">
        <div class="edit-sheet">
          <div class="edit-sheet-title" id="edit-modal-title">Edit Field</div>
          <div class="input-group">
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <input type="text" id="edit-field-input" placeholder="Enter value">
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px">
            <button class="btn btn-secondary" onclick="$('#edit-modal').classList.remove('visible')" style="flex:1">Cancel</button>
            <button class="btn btn-primary" onclick="saveEdit()" style="flex:1">Save</button>
          </div>
        </div>
      </div>

      <!-- RECEIPT OVERLAY -->
      <div id="receipt-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:620;display:flex;align-items:flex-end;padding:16px;opacity:0;pointer-events:none;transition:opacity 0.3s">
      </div>

      <!-- INSTALL BANNER -->
      <div id="install-banner">
        <div class="install-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
        </div>
        <div class="install-text">
          <div class="install-title">Install PayU</div>
          <div class="install-sub">Add to home screen</div>
        </div>
        <div class="install-actions">
          <button class="install-btn primary" onclick="triggerInstall()">Install</button>
          <button class="install-btn dismiss" onclick="$('#install-banner').classList.remove('visible')">✕</button>
        </div>
      </div>
    </div>
  `;
}

// ===== CURRENCY CHIP SELECTOR =====
function selectCurrencyChip(chip, prefix) {
  const container = document.getElementById(`${prefix}-currency-chips`);
  container.querySelectorAll('.currency-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  document.getElementById(`${prefix}-currency`).value = chip.dataset.val;
}

// ===== PASSWORD VISIBILITY =====
function togglePwdVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.innerHTML = isText
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

// ===== SWIPE SIDEBAR GESTURE =====
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

  if (dy < 80) {
    if (dx > 60 && touchStartX < 40) openSidebar();
    if (dx < -60 && $('#sidebar').classList.contains('open')) closeSidebar();
  }
}, { passive: true });

// Update balance displays on screens that show balance
function updateBalanceDisplays() {
  const formatted = formatCurrency(State.balance);
  const withdraw = document.getElementById('withdraw-balance');
  const transfer = document.getElementById('transfer-balance');
  const profile = document.getElementById('profile-balance');
  if (withdraw) withdraw.textContent = formatted;
  if (transfer) transfer.textContent = formatted;
  if (profile) profile.textContent = formatted;
}

// Patch Screens.show to update balance displays
const originalShow = Screens.show.bind(Screens);
Screens.show = function(id, direction) {
  originalShow(id, direction);
  setTimeout(updateBalanceDisplays, 50);
};

// ===== INIT =====
function init() {
  buildUI();
  State.load();
  updateStatusBar();
  setInterval(updateStatusBar, 30000);

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }

  // Check session
  if (State.isLoggedIn && State.user) {
    setTimeout(() => {
      Screens.show('home');
    }, 100);
  }

  // Hide splash
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
    setTimeout(() => {
      if (splash) splash.remove();
    }, 600);
  }, 1800);
}

// Start
document.addEventListener('DOMContentLoaded', init);
