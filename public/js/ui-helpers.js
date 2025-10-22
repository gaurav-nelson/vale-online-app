// UI helper functions

let confettiInterval = null;

function showNotification(msg) {
  var notification = document.querySelector(".mdl-js-snackbar");
  notification.MaterialSnackbar.showSnackbar({
    message: msg,
  });
  
  // Trigger confetti animation for success messages
  if (msg.toLowerCase().includes("no errors") || msg.toLowerCase().includes("hooray")) {
    triggerConfetti();
  }
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function triggerConfetti() {
  if (typeof confetti === "undefined") {
    return; // Confetti library not loaded
  }
  
  // Launch confetti once from bottom center with random variations
  confetti({
    angle: randomInRange(55, 125),
    spread: randomInRange(50, 70),
    particleCount: randomInRange(50, 100),
    origin: { y: 0.6 }
  });
}

function showHideSuggestions(suggestionsCheckbox) {
  //if checked, turn on suggestions and save to local storage
  if (suggestionsCheckbox.checked) {
    localStorage.setItem("showSuggestions", "on");
  } else {
    localStorage.setItem("showSuggestions", "off");
  }
}

function closeNotification() {
  document.getElementById("notificationBanner").style.display = "none";
}

function openSettingsModal() {
  document.getElementById("settings-modal").style.display = "flex";
  
  // Update DITA settings visibility based on current mode
  if (typeof updateModeUI !== "undefined") {
    updateModeUI();
  }
}

function closeSettingsModal() {
  document.getElementById("settings-modal").style.display = "none";
}

