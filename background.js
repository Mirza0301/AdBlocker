// background.js
// Dynamic AdBlock core using chrome.declarativeNetRequest.updateDynamicRules


const DYNAMIC_RULE_ID_BASE = 1000000; // large base for dynamic rules
const MAX_DYNAMIC_RULES = 5000; // chrome limit for dynamic rules (approx.)

// Generate a stable rule ID from a string (e.g., urlFilter + type)
function ruleIdFromString(s) {
  // djb2-like hash to produce stable id
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i);
    hash = hash & 0x7fffffff; // 
  }
  return DYNAMIC_RULE_ID_BASE + (hash % 4000000);
}

// Convert user rule to declarativeNetRequest rule format
function userRuleToDNR(rule) {
  const id = rule.id || ruleIdFromString(rule.urlFilter + (rule.type || "block"));
  return {
    id: id,
    priority: rule.priority || 1,
    action: { type: (rule.type === "allow" ? "allow" : "block") },
    condition: {
      // urlFilter supports substring / host / wildcard forms; keep simple here
      urlFilter: rule.urlFilter,
      resourceTypes: rule.resourceTypes || ["script", "image", "sub_frame", "xmlhttprequest", "other"]
    }
  };
}

// Retrieve stored user rules
async function getStoredUserRules() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["user_rules"], (res) => {
      resolve(res.user_rules || []);
    });
  });
}

// Save stored user rules
async function setStoredUserRules(rules) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ user_rules: rules }, () => resolve());
  });
}

// Apply stored user rules to declarativeNetRequest dynamic rules
async function applyStoredRulesToDNR() {
  const userRules = await getStoredUserRules();
  const dnrRules = userRules.map(userRuleToDNR);

  // Extract IDs to remove previously set dynamic rules (we will replace)
  const removeIds = dnrRules.map(r => r.id);

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: dnrRules
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("updateDynamicRules error:", chrome.runtime.lastError);
    } else {
      console.log("Applied dynamic rules:", dnrRules.length);
    }
  });
}

// Add or update a user rule

async function addUserRule(userRule) {
  const rules = await getStoredUserRules();
  // ensure deterministic id
  const id = ruleIdFromString(userRule.urlFilter + (userRule.type || "block"));
  userRule.id = id;
  // replace if exists (by id)
  const filtered = rules.filter(r => r.id !== id);
  filtered.push(userRule);
  await setStoredUserRules(filtered);
  await applyStoredRulesToDNR();
  return userRule;
}

// Remove a user rule by id or urlFilter
async function removeUserRuleById(idOrUrl) {
  let rules = await getStoredUserRules();
  if (typeof idOrUrl === "number") {
    rules = rules.filter(r => r.id !== idOrUrl);
  } else {
    rules = rules.filter(r => r.urlFilter !== idOrUrl && r.id !== ruleIdFromString(idOrUrl));
  }
  await setStoredUserRules(rules);
  await applyStoredRulesToDNR();
  return rules;
}

// Clear all user rules
async function clearAllUserRules() {
  await setStoredUserRules([]);
  // Remove all dynamic rules in the DNR system
  const toRemove = [];
  for (let i = DYNAMIC_RULE_ID_BASE; i < DYNAMIC_RULE_ID_BASE + 500000; i += 1000) {
    toRemove.push(i);
    if (toRemove.length >= 5000) break;
  }
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: toRemove
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn("clear dynamic rules error:", chrome.runtime.lastError);
    } else {
      console.log("Cleared dynamic rules attempt.");
    }
  });
}

// Message handler for commands from popup or other parts

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || !msg.action) {
        sendResponse({ success: false, error: "no action" });
        return;
      }
      if (msg.action === "addRule") {
        const r = await addUserRule(msg.rule);
        sendResponse({ success: true, rule: r });
      } else if (msg.action === "removeRule") {
        const rules = await removeUserRuleById(msg.idOrUrl);
        sendResponse({ success: true, rules });
      } else if (msg.action === "listRules") {
        const rules = await getStoredUserRules();
        sendResponse({ success: true, rules });
      } else if (msg.action === "clearRules") {
        await clearAllUserRules();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "unknown action" });
      }
    } catch (e) {
      console.error("message handler error", e);
      sendResponse({ success: false, error: e && e.message });
    }
  })();
  // Indicate async response
  return true;
});

// On install - initialize storage if needed

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Dynamic AdBlock installed/updated:", details);
  const stored = await getStoredUserRules();
  if (!stored) {
    await setStoredUserRules([]);
  }
  await applyStoredRulesToDNR();
});

// On startup - re-apply stored rules
(async () => {
  await applyStoredRulesToDNR();
})();
