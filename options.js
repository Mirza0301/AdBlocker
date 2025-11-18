
const whitelistList = document.getElementById("whitelist");
const whitelistInput = document.getElementById("whitelistInput");
const addWhitelistBtn = document.getElementById("addWhitelistBtn");

const toggleBlock = document.getElementById("toggleBlock");
const privacyMode = document.getElementById("privacyMode");

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

const statusMessage = document.getElementById("statusMessage");

// ---------------------- Helper Functions ----------------------

function showStatus(text) {
    statusMessage.textContent = text;
    setTimeout(() => (statusMessage.textContent = ""), 2000);
}

// Create a UI element for whitelist items
function addWhitelistItemToUI(text) {
    const li = document.createElement("li");
    li.textContent = text;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.style.marginLeft = "10px";
    removeBtn.style.fontSize = "11px";

    removeBtn.addEventListener("click", () => {
        removeWhitelistItem(text);
    });

    li.appendChild(removeBtn);
    whitelistList.appendChild(li);
}

// Load whitelist from storage and populate UI

function loadWhitelist() {
    chrome.storage.sync.get(["whitelist"], (data) => {
        const whitelist = data.whitelist || [];
        whitelistList.innerHTML = "";
        whitelist.forEach(addWhitelistItemToUI);
    });
}

function addWhitelistItem() {
    const value = whitelistInput.value.trim();
    if (value === "") return;

    chrome.storage.sync.get(["whitelist"], (data) => {
        const whitelist = data.whitelist || [];

        if (!whitelist.includes(value)) {
            whitelist.push(value);
            chrome.storage.sync.set({ whitelist }, () => {
                addWhitelistItemToUI(value);
                showStatus("Added to whitelist.");
            });
        } else {
            showStatus("Already exists.");
        }
    });

    whitelistInput.value = "";
}

function removeWhitelistItem(item) {
    chrome.storage.sync.get(["whitelist"], (data) => {
        const whitelist = (data.whitelist || []).filter((w) => w !== item);
        chrome.storage.sync.set({ whitelist }, () => {
            loadWhitelist();
            showStatus("Removed.");
        });
    });
}

// Settings logic

function loadSettings() {
    chrome.storage.sync.get(["blockingEnabled", "privacyEnabled"], (data) => {
        toggleBlock.checked = data.blockingEnabled ?? true;
        privacyMode.checked = data.privacyEnabled ?? false;
    });
}

function saveSettings() {
    chrome.storage.sync.set({
        blockingEnabled: toggleBlock.checked,
        privacyEnabled: privacyMode.checked
    }, () => {
        showStatus("Settings saved.");
    });
}

// Export and Import logic

function exportRules() {
    chrome.storage.sync.get(null, (data) => {
        const json = JSON.stringify(data, null, 2);

        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "adblock_backup.json";
        a.click();

        URL.revokeObjectURL(url);
        showStatus("Rules exported.");
    });
}

function importRules(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            chrome.storage.sync.set(data, () => {
                loadWhitelist();
                loadSettings();
                showStatus("Import complete.");
            });
        } catch (err) {
            showStatus("Invalid file.");
        }
    };

    reader.readAsText(file);
}

// event listeners

addWhitelistBtn.addEventListener("click", addWhitelistItem);
toggleBlock.addEventListener("change", saveSettings);
privacyMode.addEventListener("change", saveSettings);

exportBtn.addEventListener("click", exportRules);
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", importRules);

loadWhitelist();
loadSettings();
