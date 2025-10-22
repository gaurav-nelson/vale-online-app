// Vale mode management and DITA conversion functionality

// Global variable to track current Vale mode
let currentValeMode = "standard"; // 'standard' or 'dita'
let ditaConversionResult = null;

// Default DITA settings
const defaultDitaSettings = {
  enableAuthors: false,
  disableFloatingTitles: false,
  disableCallouts: false,
  secureMode: true
};

// Initialize mode on page load
document.addEventListener("DOMContentLoaded", function() {
  initializeValeMode();
  loadDitaSettings();
});

// Initialize Vale mode from localStorage
function initializeValeMode() {
  const savedMode = localStorage.getItem("valeMode") || "standard";
  currentValeMode = savedMode;
  updateModeUI();
}

// Update UI elements to reflect current mode
function updateModeUI() {
  const modeToggleSwitch = document.getElementById("mode-toggle-switch");
  if (modeToggleSwitch) {
    modeToggleSwitch.checked = currentValeMode === "dita";
  }
  
  // Show/hide DITA settings in the settings modal
  const ditaSettingsContainer = document.getElementById("dita-settings-container");
  if (ditaSettingsContainer) {
    ditaSettingsContainer.style.display = currentValeMode === "dita" ? "block" : "none";
  }
  
  updateConvertToDitaButtonVisibility();
}

// Toggle between Standard and DITA mode
function toggleValeMode() {
  const modeToggleSwitch = document.getElementById("mode-toggle-switch");
  const newMode = modeToggleSwitch.checked ? "dita" : "standard";
  
  // If already in the requested mode, no need to change
  if (newMode === currentValeMode) {
    return;
  }
  
  // Update current mode
  currentValeMode = newMode;
  localStorage.setItem("valeMode", newMode);
  
  // Update UI
  updateModeUI();
  
  // Clear any existing lint results
  clearCountsMarksWidgets();
  
  // Show notification
  showNotification(`Switched to ${newMode === "dita" ? "DITA" : "Standard"} mode`);
}

// Get current Vale mode
function getCurrentValeMode() {
  return currentValeMode;
}

// Load DITA settings from localStorage
function loadDitaSettings() {
  const savedSettings = localStorage.getItem("ditaSettings");
  const settings = savedSettings ? JSON.parse(savedSettings) : defaultDitaSettings;
  
  // Update checkbox states
  const enableAuthorsCheckbox = document.getElementById("ditaEnableAuthorsCheckbox");
  const disableFloatingTitlesCheckbox = document.getElementById("ditaDisableFloatingTitlesCheckbox");
  const disableCalloutsCheckbox = document.getElementById("ditaDisableCalloutsCheckbox");
  const secureModeCheckbox = document.getElementById("ditaSecureModeCheckbox");
  
  if (enableAuthorsCheckbox) enableAuthorsCheckbox.checked = settings.enableAuthors || false;
  if (disableFloatingTitlesCheckbox) disableFloatingTitlesCheckbox.checked = settings.disableFloatingTitles || false;
  if (disableCalloutsCheckbox) disableCalloutsCheckbox.checked = settings.disableCallouts || false;
  if (secureModeCheckbox) secureModeCheckbox.checked = settings.secureMode || false;
  
  // Upgrade MDL components if available
  if (typeof componentHandler !== "undefined") {
    componentHandler.upgradeDom();
  }
}

// Save a DITA setting to localStorage
function saveDitaSetting(settingName, value) {
  const savedSettings = localStorage.getItem("ditaSettings");
  const settings = savedSettings ? JSON.parse(savedSettings) : defaultDitaSettings;
  settings[settingName] = value;
  localStorage.setItem("ditaSettings", JSON.stringify(settings));
}

// Get DITA settings from localStorage
function getDitaSettings() {
  const savedSettings = localStorage.getItem("ditaSettings");
  return savedSettings ? JSON.parse(savedSettings) : defaultDitaSettings;
}

// Update Convert to DITA button visibility
function updateConvertToDitaButtonVisibility() {
  const convertButton = document.getElementById("convert-to-dita-button");
  if (!convertButton) return;
  
  const errorCount = parseInt(document.getElementById("errorCount").textContent) || 0;
  const warningCount = parseInt(document.getElementById("warningCount").textContent) || 0;
  
  // Show button only in DITA mode when there are no errors or warnings
  if (currentValeMode === "dita" && errorCount === 0 && warningCount === 0) {
    // Also check if editor has content
    if (editor && editor.getValue().trim().length > 0) {
      convertButton.style.display = "inline-block";
    } else {
      convertButton.style.display = "none";
    }
  } else {
    convertButton.style.display = "none";
  }
}

// Open DITA conversion modal and trigger conversion
async function openConvertToDitaModal() {
  const modal = document.getElementById("dita-conversion-modal");
  const loadingDiv = document.getElementById("dita-loading");
  const errorDiv = document.getElementById("dita-error");
  const outputContainer = document.getElementById("dita-output-container");
  
  // Show modal
  modal.style.display = "flex";
  
  // Reset modal state
  loadingDiv.style.display = "block";
  errorDiv.style.display = "none";
  outputContainer.style.display = "none";
  
  // Get AsciiDoc content from editor
  const asciidocContent = editor.getValue();
  
  // Get DITA settings
  const settings = getDitaSettings();
  
  try {
    const response = await fetch("http://localhost:8080/convert-to-dita", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ asciidocContent, settings }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Conversion failed");
    }
    
    const data = await response.json();
    ditaConversionResult = data.ditaContent;
    
    // Display DITA content
    const ditaOutput = document.getElementById("dita-output");
    ditaOutput.textContent = ditaConversionResult;
    
    // Show output, hide loading
    loadingDiv.style.display = "none";
    outputContainer.style.display = "block";
    
    // Initialize MDL components for new buttons
    if (typeof componentHandler !== "undefined") {
      componentHandler.upgradeDom();
    }
  } catch (error) {
    console.error("Error converting to DITA:", error);
    
    loadingDiv.style.display = "none";
    errorDiv.style.display = "block";
    
    const errorMessage = document.getElementById("dita-error-message");
    errorMessage.textContent = `Conversion failed: ${error.message}`;
  }
}

// Close DITA modal
function closeDitaModal() {
  const modal = document.getElementById("dita-conversion-modal");
  modal.style.display = "none";
  ditaConversionResult = null;
}

// Copy DITA content to clipboard
async function copyDitaToClipboard() {
  if (!ditaConversionResult) {
    showNotification("No DITA content to copy");
    return;
  }
  
  try {
    await navigator.clipboard.writeText(ditaConversionResult);
    showNotification("DITA content copied to clipboard!");
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    showNotification("Failed to copy to clipboard");
  }
}

// Download DITA content as a file
function downloadDitaFile() {
  if (!ditaConversionResult) {
    showNotification("No DITA content to download");
    return;
  }
  
  // Extract filename from DITA id attribute
  let filename = "converted.dita";
  
  // Try to find id attribute in the DITA content
  // Match patterns like id="some-id" or id="some-id_{context}"
  const idMatch = ditaConversionResult.match(/id=["']([^"']+)["']/);
  
  if (idMatch && idMatch[1]) {
    let ditaId = idMatch[1];
    
    // Remove any _{context}, _{variable}, or similar suffixes
    ditaId = ditaId.replace(/_\{[^}]+\}$/, '');
    
    // Use the cleaned ID as filename
    filename = ditaId + ".dita";
  }
  
  const blob = new Blob([ditaConversionResult], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification(`DITA file downloaded as ${filename}!`);
}

