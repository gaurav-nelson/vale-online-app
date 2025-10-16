// Theme management

function changeTheme() {
  //toggle element
  var themeToggleIcon = document.getElementById("theme-toggle-icon");
  if (themeToggleIcon.innerHTML == "light_mode") {
    setLightTheme();
  } else {
    setDarkTheme();
  }
}

window.addEventListener(
  "resize",
  function (event) {
    if (this.window.innerWidth < 500) {
      document.getElementById("appHeader").innerHTML = "SFO";
    } else {
      document.getElementById("appHeader").innerHTML = "Vale-at-Red-Hat online";
    }
  },
  true
);

function setDarkTheme() {
  document.getElementById("theme-toggle-icon").innerHTML = "light_mode";
  document.getElementById("mainHeader").classList.add("mdl-color--grey-900");
  document.body.classList.add("mdl-color--blue-grey-900");
  document
    .getElementById("notification-msg")
    .classList.add("mdl-color--blue-grey-800");
  editor.setOption("theme", "material");
  localStorage.setItem("theme", "dark");
}

function setLightTheme() {
  document.getElementById("theme-toggle-icon").innerHTML = "dark_mode";
  document.getElementById("mainHeader").classList.remove("mdl-color--grey-900");
  document.body.classList.remove("mdl-color--blue-grey-900");
  editor.setOption("theme", "default");
  document
    .getElementById("notification-msg")
    .classList.remove("mdl-color--blue-grey-800");
  localStorage.setItem("theme", "light");
}

