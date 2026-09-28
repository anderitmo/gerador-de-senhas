// Character sets
const CHAR_SETS = {
  numbers: '0123456789',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// State
let currentPassword = '';
let isPasswordHidden = false;
let currentMode = 'custom'; // 'custom' or 'pin'
const STORAGE_KEY = 'keycraft_history_v1';
const MAX_HISTORY = 15;

/**
 * Generates a random integer between min (inclusive) and max (inclusive) using Crypto API if available
 */
function getRandomInt(min, max) {
  const range = max - min + 1;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return min + (randomBuffer[0] % range);
  }
  return Math.floor(Math.random() * range);
}

/**
 * Core Password / PIN Generation Logic
 */
function generatePasswordOptions(options) {
  const { length, includeNumbers, includeUppercase, includeLowercase, includeSymbols, mode } = options;

  if (mode === 'pin') {
    let pin = '';
    for (let i = 0; i < length; i++) {
      pin += CHAR_SETS.numbers[getRandomInt(0, CHAR_SETS.numbers.length - 1)];
    }
    return pin;
  }

  // Custom Mode
  let availableChars = '';
  const requiredChars = [];

  if (includeNumbers) {
    availableChars += CHAR_SETS.numbers;
    requiredChars.push(CHAR_SETS.numbers[getRandomInt(0, CHAR_SETS.numbers.length - 1)]);
  }
  if (includeUppercase) {
    availableChars += CHAR_SETS.uppercase;
    requiredChars.push(CHAR_SETS.uppercase[getRandomInt(0, CHAR_SETS.uppercase.length - 1)]);
  }
  if (includeLowercase) {
    availableChars += CHAR_SETS.lowercase;
    requiredChars.push(CHAR_SETS.lowercase[getRandomInt(0, CHAR_SETS.lowercase.length - 1)]);
  }
  if (includeSymbols) {
    availableChars += CHAR_SETS.symbols;
    requiredChars.push(CHAR_SETS.symbols[getRandomInt(0, CHAR_SETS.symbols.length - 1)]);
  }

  // If no category is selected, default to numbers + lowercase
  if (!availableChars) {
    availableChars = CHAR_SETS.numbers + CHAR_SETS.lowercase;
    requiredChars.push(CHAR_SETS.numbers[getRandomInt(0, CHAR_SETS.numbers.length - 1)]);
  }

  let result = [...requiredChars];

  // Fill remaining length
  for (let i = result.length; i < length; i++) {
    result.push(availableChars[getRandomInt(0, availableChars.length - 1)]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

/**
 * Calculate Strength Score (0 to 4)
 */
function calculateStrength(password, mode) {
  if (!password) return { score: 0, text: 'N/A', color: '' };

  let score = 0;
  const len = password.length;

  if (mode === 'pin') {
    if (len >= 8) score = 3;
    else if (len >= 6) score = 2;
    else if (len >= 4) score = 1;
    else score = 0;
  } else {
    // Length points
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (len >= 16) score++;

    // Complexity points
    let types = 0;
    if (/[0-9]/.test(password)) types++;
    if (/[a-z]/.test(password)) types++;
    if (/[A-Z]/.test(password)) types++;
    if (/[^0-9a-zA-Z]/.test(password)) types++;

    if (types >= 3 && len >= 10) score++;
  }

  score = Math.min(score, 4);

  const levels = [
    { text: 'Muito Fraca', color: '#ef4444' }, // 0 or 1 bar
    { text: 'Fraca', color: '#f97316' },       // 1 bar
    { text: 'Média', color: '#f59e0b' },       // 2 bars
    { text: 'Forte', color: '#10b981' },       // 3 bars
    { text: 'Muito Forte', color: '#3b82f6' }  // 4 bars
  ];

  return {
    score: score,
    text: levels[score].text,
    color: levels[score].color
  };
}

/**
 * Render Password Strength UI
 */
function updateStrengthUI(password) {
  const strengthText = document.getElementById('strengthText');
  const strengthBars = document.getElementById('strengthBars');
  if (!strengthText || !strengthBars) return;

  const { score, text, color } = calculateStrength(password, currentMode);
  strengthText.textContent = text;
  strengthText.style.color = color || 'inherit';

  const bars = strengthBars.querySelectorAll('.bar');
  bars.forEach((bar, index) => {
    if (index < score) {
      bar.style.backgroundColor = color;
    } else {
      bar.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }
  });
}

/**
 * LocalStorage History Operations
 */
function getHistory() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error reading history from localStorage', e);
    return [];
  }
}

function saveHistory(history) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving history to localStorage', e);
  }
}

function addToHistory(value, type) {
  let history = getHistory();
  // Avoid duplicate if same as the last generated item
  if (history.length > 0 && history[0].value === value) {
    return;
  }

  const newItem = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    value: value,
    type: type, // 'Senha' or 'PIN'
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  history.unshift(newItem);
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }

  saveHistory(history);
  renderHistory();
}

function removeFromHistory(id) {
  let history = getHistory();
  history = history.filter(item => item.id !== id);
  saveHistory(history);
  renderHistory();
}

function clearAllHistory() {
  saveHistory([]);
  renderHistory();
}

/**
 * Render History List UI
 */
function renderHistory() {
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (!historyList || !clearHistoryBtn) return;

  const history = getHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">Nenhuma senha salva no histórico.</div>';
    clearHistoryBtn.style.display = 'none';
    return;
  }

  clearHistoryBtn.style.display = 'inline-flex';

  history.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';

    itemEl.innerHTML = `
      <div class="history-item-left">
        <span class="history-type-tag">${item.type}</span>
        <span class="history-value" title="${item.value}">${escapeHtml(item.value)}</span>
      </div>
      <div class="history-item-actions">
        <button class="icon-btn copy-item-btn" title="Copiar" data-value="${escapeHtml(item.value)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="icon-btn remove-item-btn text-danger" title="Excluir" data-id="${item.id}">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;

    // Copy event
    itemEl.querySelector('.copy-item-btn').addEventListener('click', (e) => {
      const val = e.currentTarget.getAttribute('data-value');
      copyToClipboard(val);
    });

    // Remove event
    itemEl.querySelector('.remove-item-btn').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      removeFromHistory(id);
    });

    historyList.appendChild(itemEl);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/**
 * Copy to Clipboard Helper
 */
function copyToClipboard(text) {
  if (!text) return;
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('Copiado para a área de transferência!'));
  } else if (typeof document !== 'undefined') {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copiado para a área de transferência!');
  }
}

/**
 * Toast Notification Helper
 */
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

/**
 * Generate Action Handler
 */
function handleGenerate() {
  const lengthSlider = document.getElementById('lengthSlider');
  const chkNumbers = document.getElementById('chkNumbers');
  const chkUppercase = document.getElementById('chkUppercase');
  const chkLowercase = document.getElementById('chkLowercase');
  const chkSymbols = document.getElementById('chkSymbols');

  const options = {
    length: lengthSlider ? parseInt(lengthSlider.value, 10) : 10,
    includeNumbers: chkNumbers ? chkNumbers.checked : true,
    includeUppercase: chkUppercase ? chkUppercase.checked : true,
    includeLowercase: chkLowercase ? chkLowercase.checked : true,
    includeSymbols: chkSymbols ? chkSymbols.checked : true,
    mode: currentMode
  };

  currentPassword = generatePasswordOptions(options);
  renderDisplayPassword();
  updateStrengthUI(currentPassword);
  addToHistory(currentPassword, currentMode === 'pin' ? 'PIN' : 'Senha');
}

/**
 * Render Main Output Display
 */
function renderDisplayPassword() {
  const passwordText = document.getElementById('passwordText');
  if (!passwordText) return;

  if (isPasswordHidden) {
    passwordText.textContent = '•'.repeat(currentPassword.length);
    passwordText.classList.add('hidden-password');
  } else {
    passwordText.textContent = currentPassword;
    passwordText.classList.remove('hidden-password');
  }
}

/**
 * Event Listeners Registration
 */
function initEvents() {
  const lengthSlider = document.getElementById('lengthSlider');
  const lengthValue = document.getElementById('lengthValue');
  const chkNumbers = document.getElementById('chkNumbers');
  const chkUppercase = document.getElementById('chkUppercase');
  const chkLowercase = document.getElementById('chkLowercase');
  const chkSymbols = document.getElementById('chkSymbols');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const passwordOutput = document.getElementById('passwordOutput');
  const toggleVisibilityBtn = document.getElementById('toggleVisibilityBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const modeBtns = document.querySelectorAll('.mode-btn');

  // Slider update
  if (lengthSlider && lengthValue) {
    lengthSlider.addEventListener('input', (e) => {
      lengthValue.textContent = e.target.value;
      handleGenerate();
    });
  }

  // Checkbox updates
  [chkNumbers, chkUppercase, chkLowercase, chkSymbols].forEach(chk => {
    if (chk) {
      chk.addEventListener('change', () => {
        // Ensure at least one checkbox is checked in custom mode
        if (chkNumbers && chkUppercase && chkLowercase && chkSymbols) {
          if (!chkNumbers.checked && !chkUppercase.checked && !chkLowercase.checked && !chkSymbols.checked) {
            chk.checked = true;
          }
        }
        handleGenerate();
      });
    }
  });

  // Mode button toggle
  if (modeBtns) {
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;

        const optionsGrid = document.getElementById('optionsGrid');
        if (optionsGrid) {
          if (currentMode === 'pin') {
            optionsGrid.style.opacity = '0.4';
            optionsGrid.style.pointerEvents = 'none';
          } else {
            optionsGrid.style.opacity = '1';
            optionsGrid.style.pointerEvents = 'auto';
          }
        }

        handleGenerate();
      });
    });
  }

  // Main Generate Button
  if (generateBtn) generateBtn.addEventListener('click', handleGenerate);

  // Copy Main Password
  if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard(currentPassword));
  if (passwordOutput) {
    passwordOutput.addEventListener('click', (e) => {
      if (!e.target.closest('.display-actions')) {
        copyToClipboard(currentPassword);
      }
    });
  }

  // Toggle Visibility
  if (toggleVisibilityBtn && eyeIcon) {
    toggleVisibilityBtn.addEventListener('click', () => {
      isPasswordHidden = !isPasswordHidden;
      if (isPasswordHidden) {
        eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
      } else {
        eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
      renderDisplayPassword();
    });
  }

  // Clear All History
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja excluir todo o histórico?')) {
        clearAllHistory();
        showToast('Histórico limpo com sucesso!');
      }
    });
  }
}

// Initial application startup
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    renderHistory();
    handleGenerate();
  });
}

// Export functions for testing environment if present
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generatePasswordOptions,
    calculateStrength,
    CHAR_SETS
  };
}
