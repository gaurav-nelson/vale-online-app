// Global variables
var editor;
var loadingSpinner;
var cover;
var markers = [];
var widgetsError = [];
var widgetsWarning = [];
var widgetsSuggestion = [];

// Ollama integration variables
var ollamaAvailable = false;
var ollamaModels = [];
var selectedModel = null;
var allIssues = []; // Store all issues from the last lint
var valeIssuesData = []; // Store full Vale response data with Action fields

// Approval workflow state
var currentIssueIndex = 0;
var selectedIssuesList = [];
var approvedFixes = [];
var skippedIssues = [];
var failedIssues = [];
var currentIssue = null;
var currentOriginalText = null;
var currentFixedText = null;

// Initialize editor and load settings
window.onload = function () {
  if (navigator.userAgent.toLowerCase().match(/mobile/i)) {
    document.getElementById("appHeader").innerHTML = "Vale@RH";
  }
  //check if localstorgae is available
  if (window.localStorage) {
    //if localstorage is available, check if there is a saved theme
    if (localStorage.getItem("theme")) {
      if (localStorage.getItem("theme") == "dark") {
        setDarkTheme();
      } else {
        setLightTheme();
        localStorage.setItem("theme", "light");
      }
    }
    //toggle suggestions on/off
    if (localStorage.getItem("showSuggestions")) {
      if (localStorage.getItem("showSuggestions") == "on") {
        document.getElementById("suggestionsCheckbox").checked = true;
      } else {
        document.getElementById("suggestionsCheckbox").checked = false;
        localStorage.setItem("showSuggestions", "off");
      }
    }
    // Load saved Ollama model
    if (localStorage.getItem("ollamaModel")) {
      selectedModel = localStorage.getItem("ollamaModel");
    }
  }
  
  // Check Ollama status and start polling
  checkOllamaStatus();
  setInterval(checkOllamaStatus, 30000); // Check every 30 seconds
};

// Initialize CodeMirror editor
editor = CodeMirror(document.querySelector("#editor"), {
  lineNumbers: true,
  lineWrapping: true,
  tabSize: 2,
  placeholder: "Paste or drop your AsciiDoc content here ...",
  mode: "asciidoc",
  autofocus: true,
});

// Initialize UI elements
loadingSpinner = document.getElementById("spinner");
cover = document.getElementById("cover");
loadingSpinner.style.display = "none";
cover.style.display = "none";

