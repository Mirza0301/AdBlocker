// popup.js add/remove/list dynamic rules

const ruleCountEl = document.getElementById('ruleCount');
const rulesListEl = document.getElementById('rulesList');
const addForm = document.getElementById('addForm');
const urlFilterInput = document.getElementById('urlFilter');
const ruleTypeSelect = document.getElementById('ruleType');
const clearBtn = document.getElementById('clearBtn');
const openOptions = document.getElementById('openOptions');

function sendMessage(msg) {
  return new Promise((res) => chrome.runtime.sendMessage(msg, (r) => res(r)));
}

async function refreshRules() {
  const resp = await sendMessage({ action: 'listRules' });
  if (!resp || !resp.success) return;
  const rules = resp.rules || [];
  ruleCountEl.textContent = rules.length;
  rulesListEl.innerHTML = '';
  rules.forEach(r => {
    const el = document.createElement('div');
    el.className = 'rule-item';
    const left = document.createElement('div');
    left.innerHTML = `<div class="rule-text">${escapeHtml(r.urlFilter)}</div><div class="rule-meta">${r.type || 'block'} · id:${r.id}</div>`;
    const actions = document.createElement('div');
    actions.className = 'rule-actions';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', async () => {
      await sendMessage({ action: 'removeRule', idOrUrl: r.id });
      refreshRules();
    });
    actions.appendChild(removeBtn);
    el.appendChild(left);
    el.appendChild(actions);
    rulesListEl.appendChild(el);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"})[c]);
}

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const urlFilter = urlFilterInput.value.trim();
  if (!urlFilter) return;
  const type = ruleTypeSelect.value;
  const resp = await sendMessage({ action: 'addRule', rule: { urlFilter, type, priority: 1 } });
  if (resp && resp.success) {
    urlFilterInput.value = '';
    refreshRules();
  } else {
    console.warn('Failed to add rule', resp);
  }
});

clearBtn.addEventListener('click', async () => {
  if (!confirm('Clear all dynamic rules?')) return;
  await sendMessage({ action: 'clearRules' });
  refreshRules();
});

openOptions.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

refreshRules();
