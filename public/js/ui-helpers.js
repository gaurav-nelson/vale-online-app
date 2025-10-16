// UI helper functions

function showNotification(msg) {
  var notification = document.querySelector(".mdl-js-snackbar");
  notification.MaterialSnackbar.showSnackbar({
    message: msg,
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
}

function closeSettingsModal() {
  document.getElementById("settings-modal").style.display = "none";
}

