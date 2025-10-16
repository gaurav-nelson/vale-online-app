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

var editor = CodeMirror(document.querySelector("#editor"), {
  lineNumbers: true,
  lineWrapping: true,
  tabSize: 2,
  placeholder: "Paste or drop your AsciiDoc content here ...",
  mode: "asciidoc",
  autofocus: true,
});

var loadingSpinner = document.getElementById("spinner");
var cover = document.getElementById("cover");
loadingSpinner.style.display = "none";
cover.style.display = "none";

var markers = [];
var widgetsError = [];
var widgetsWarning = [];
var widgetsSuggestion = [];

// Ollama integration variables
var ollamaAvailable = false;
var ollamaModels = [];
var selectedModel = null;
var allIssues = []; // Store all issues from the last lint

// Approval workflow state
var currentIssueIndex = 0;
var selectedIssuesList = [];
var approvedFixes = [];
var skippedIssues = [];
var failedIssues = [];
var currentIssue = null;
var currentOriginalText = null;
var currentFixedText = null;

function isEmptyOrSpaces(str) {
  return str === null || str.match(/^ *$/) !== null;
}

async function postData(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      mode: "cors",
      cache: "no-cache",
    },
    body: data,
  });
  return response.json();
}

function sendRequest(adoc) {
  //console.log("REQ DATA: ", JSON.stringify(adoc));
  postData("http://localhost:8080/", JSON.stringify(adoc))
    .then((data) => {
      loadingSpinner.style.display = "none";
      cover.style.display = "none";
      document.body.style.cursor = "default";
      document.getElementById("lint-button").removeAttribute("disabled");
      //console.log("RES DATA: ", data);
      if (!Object.keys(data).length) {
        //console.log("Response data: ", data);
        showNotification("Hooray, no errors!");
      } else {
        highlightResults(data["stdin.adoc"]);
        updateCounts();
      }
    })
    .catch((error) => {
      loadingSpinner.style.display = "none";
      cover.style.display = "none";
      document.body.style.cursor = "default";
      document.getElementById("lint-button").removeAttribute("disabled");
      console.error("ERROR:", error);
      showNotification(
        "ERROR: Please check your terminal."
      );
    });
}

function clearEditor() {
  editor.setValue("");
  clearCountsMarksWidgets();
  loadingSpinner.style.display = "none";
  cover.style.display = "none";
  document.getElementById("lint-button").removeAttribute("disabled");
  document.body.style.cursor = "default";
}

function clearCountsMarksWidgets() {
  markers = [];
  widgetsError = [];
  widgetsWarning = [];
  widgetsSuggestion = [];
  document.getElementById("errorCount").textContent = "0";
  document.getElementById("warningCount").textContent = "0";
  document.getElementById("suggestionCount").textContent = "0";
  document.getElementById("results").style.display = "none";
  updateAIFixButtonVisibility();
}

function clearWidgetsMarkers(callback) {
  var currentText = editor.getValue();
  if (widgetsError.length != 0 && widgetsWarning.length != 0) {
    widgetsError.forEach(function (widget) {
      //console.log("removing widget: ", widget);
      editor.getDoc().removeLineWidget(widget);
      widget.clear();
    });
    widgetsWarning.forEach(function (widget) {
      //console.log("removing widget: ", widget);
      widget.clear();
      editor.getDoc().removeLineWidget(widget);
    });
    widgetsSuggestion.forEach(function (widget) {
      //console.log("removing widget: ", widget);
      widget.clear();
      editor.getDoc().removeLineWidget(widget);
    });
  }
  if (markers.length != 0) {
    markers.forEach(function (marker) {
      //console.log("removing marker: ", marker);
      marker.clear();
    });
  }

  editor.setValue(currentText);

  callback();
}

function runValeLint() {
  clearWidgetsMarkers(clearCountsMarksWidgets);
  //editor.getDoc().textMarker.clear();
  if (isEmptyOrSpaces(editor.getValue())) {
    //console.log("Editor value: ", editor.getValue());
    showNotification("Enter some text ...");
  } else {
    {
      loadingSpinner.style.display = "block";
      cover.style.display = "block";
      document.getElementById("lint-button").setAttribute("disabled", "true");
      document.body.style.cursor = "wait";
      sendRequest({
        textarea: editor.getValue(),
      });
    }
  }
}

//parse the JSON object
function highlightResults(data) {
  for (i = 0; i < data.length; i++) {
    if (data[i].Severity === "error") {
      var lineNumber = data[i].Line - 1;
      var startChar = data[i].Span[0] - 1;
      var endChar = data[i].Span[1];
      var message = data[i].Message;
      // console.log(
      //   "Marking line: ",
      //   lineNumber,
      //   " from: ",
      //   startChar,
      //   " to: ",
      //   endChar,
      //   " with error: ",
      //   message
      // );
      markers.push(
        editor.getDoc().markText(
          {
            line: lineNumber,
            ch: startChar,
          },
          {
            line: lineNumber,
            ch: endChar,
          },
          {
            className: "valeError",
          }
        )
      );
      var msg = document.createElement("div");
      var msgText =
        "❌ " +
        data[i].Check +
        " " +
        data[i].Line +
        "(" +
        startChar +
        "-" +
        endChar +
        ") " +
        data[i].Message;
      msg.appendChild(document.createTextNode(msgText));
      msg.className = "valeErrorMessage";
      widgetsError.push(editor.getDoc().addLineWidget(lineNumber, msg));
    }
    if (data[i].Severity === "warning") {
      var lineNumber = data[i].Line - 1;
      var startChar = data[i].Span[0] - 1;
      var endChar = data[i].Span[1];
      markers.push(
        editor.getDoc().markText(
          {
            line: lineNumber,
            ch: startChar,
          },
          {
            line: lineNumber,
            ch: endChar,
          },
          {
            className: "valeWarning",
          },
          {
            clearOnEnter: true,
          }
        )
      );
      var msg = document.createElement("div");
      var msgText =
        "❗ " +
        data[i].Check +
        " " +
        data[i].Line +
        "(" +
        startChar +
        "-" +
        endChar +
        ") " +
        data[i].Message;
      msg.appendChild(document.createTextNode(msgText));
      msg.className = "valeWarningMessage";
      widgetsWarning.push(editor.getDoc().addLineWidget(lineNumber, msg));
    }
    if (
      data[i].Severity === "suggestion" &&
      document.getElementById("suggestionsCheckbox").checked
    ) {
      var lineNumber = data[i].Line - 1;
      var startChar = data[i].Span[0] - 1;
      var endChar = data[i].Span[1];
      markers.push(
        editor.getDoc().markText(
          {
            line: lineNumber,
            ch: startChar,
          },
          {
            line: lineNumber,
            ch: endChar,
          },
          {
            className: "valeSuggestion",
          }
        )
      );
      var msg = document.createElement("div");
      var msgText =
        "💡 " +
        data[i].Check +
        " " +
        data[i].Line +
        "(" +
        startChar +
        "-" +
        endChar +
        ") " +
        data[i].Message;
      msg.appendChild(document.createTextNode(msgText));
      msg.className = "valeSuggestionMessage";
      widgetsSuggestion.push(editor.getDoc().addLineWidget(lineNumber, msg));
    }
  }
}

function updateCounts() {
  document.getElementById("errorCount").textContent = widgetsError.length;
  document.getElementById("warningCount").textContent = widgetsWarning.length;
  document.getElementById("suggestionCount").textContent =
    widgetsSuggestion.length;
  document.getElementById("results").style.display = "block";
  if (!document.getElementById("suggestionsCheckbox").checked) {
    //hide the suggestion chip
    document.getElementById("suggestionChip").style.display = "none";
  } else {
    //show the suggestion chip
    document.getElementById("suggestionChip").style.display = "block";
  }
  updateAIFixButtonVisibility();
}

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

function dropHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items.length > 1) {
    showNotification("You can only drop a single file!");
  } else {
    var file = ev.dataTransfer.files[0];
    var reader = new FileReader();
    reader.onload = function (event) {
      editor.setValue(event.target.result);
      editor.focus();
    };
    reader.readAsText(file);
  }
}

function dragOverHandler(ev) {
  //console.log('File(s) in drop zone');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

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

// Ollama Integration Functions

async function checkOllamaStatus() {
  try {
    const response = await fetch("http://localhost:8080/api/ollama/status");
    const data = await response.json();
    ollamaAvailable = data.available;
    
    if (ollamaAvailable) {
      await loadOllamaModels();
      document.getElementById("model-selection-container").style.display = "block";
    } else {
      document.getElementById("model-selection-container").style.display = "none";
    }
    
    updateAIFixButtonVisibility();
  } catch (error) {
    ollamaAvailable = false;
    document.getElementById("model-selection-container").style.display = "none";
    updateAIFixButtonVisibility();
  }
}

async function loadOllamaModels() {
  try {
    const response = await fetch("http://localhost:8080/api/ollama/models");
    const data = await response.json();
    ollamaModels = data.models;
    
    const selectElement = document.getElementById("ollamaModelSelect");
    selectElement.innerHTML = "";
    
    ollamaModels.forEach((model, index) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      selectElement.appendChild(option);
      
      // Set first model as default if no model is selected
      if (index === 0 && !selectedModel) {
        selectedModel = model;
        localStorage.setItem("ollamaModel", model);
      }
    });
    
    // Set the selected model in the dropdown
    if (selectedModel && ollamaModels.includes(selectedModel)) {
      selectElement.value = selectedModel;
    } else if (ollamaModels.length > 0) {
      selectedModel = ollamaModels[0];
      selectElement.value = selectedModel;
      localStorage.setItem("ollamaModel", selectedModel);
    }
  } catch (error) {
    console.error("Failed to load Ollama models:", error);
  }
}

function saveSelectedModel(selectElement) {
  selectedModel = selectElement.value;
  localStorage.setItem("ollamaModel", selectedModel);
}

function updateAIFixButtonVisibility() {
  const hasIssues = widgetsError.length > 0 || widgetsWarning.length > 0 || widgetsSuggestion.length > 0;
  const button = document.getElementById("ai-fix-button");
  
  if (ollamaAvailable && hasIssues) {
    button.style.display = "inline-block";
  } else {
    button.style.display = "none";
  }
}

function showAIFixModal() {
  if (!ollamaAvailable || !selectedModel) {
    showNotification("Ollama is not available or no model selected");
    return;
  }
  
  // Build the issues list
  const issuesList = document.getElementById("issues-list");
  issuesList.innerHTML = "";
  issuesList.style.display = "block";
  
  allIssues = [];
  
  // Add errors
  widgetsError.forEach((widget, index) => {
    const issue = getIssueFromWidget(widget, "error");
    if (issue) {
      allIssues.push(issue);
      issuesList.appendChild(createIssueElement(issue, allIssues.length - 1));
    }
  });
  
  // Add warnings
  widgetsWarning.forEach((widget, index) => {
    const issue = getIssueFromWidget(widget, "warning");
    if (issue) {
      allIssues.push(issue);
      issuesList.appendChild(createIssueElement(issue, allIssues.length - 1));
    }
  });
  
  // Add suggestions
  widgetsSuggestion.forEach((widget, index) => {
    const issue = getIssueFromWidget(widget, "suggestion");
    if (issue) {
      allIssues.push(issue);
      issuesList.appendChild(createIssueElement(issue, allIssues.length - 1));
    }
  });
  
  document.getElementById("ai-fix-modal").style.display = "flex";
  document.getElementById("ai-fix-loading").style.display = "none";
  document.getElementById("fix-issues-btn").disabled = false;
}

function closeAIFixModal() {
  // Reset all views
  document.getElementById("issue-selection-view").style.display = "block";
  document.getElementById("approval-view").style.display = "none";
  document.getElementById("ai-fix-loading").style.display = "none";
  document.getElementById("completion-summary").style.display = "none";
  
  // Reset buttons
  document.getElementById("fix-issues-btn").style.display = "inline-block";
  document.getElementById("apply-fixes-btn").style.display = "none";
  document.getElementById("fix-issues-btn").disabled = false;
  
  // Reset state
  currentIssueIndex = 0;
  approvedFixes = [];
  skippedIssues = [];
  failedIssues = [];
  selectedIssuesList = [];
  
  document.getElementById("ai-fix-modal").style.display = "none";
}

function getIssueFromWidget(widget, severity) {
  try {
    const line = widget.line;
    const text = widget.node.textContent;
    
    // Parse the widget text to extract issue details
    // Format: "❌ Check Line(start-end) Message"
    const match = text.match(/^[❌❗💡]\s+(.+?)\s+(\d+)\((\d+)-(\d+)\)\s+(.+)$/);
    
    if (match) {
      return {
        Check: match[1],
        Line: parseInt(match[2]),
        Span: [parseInt(match[3]), parseInt(match[4])],
        Message: match[5],
        Severity: severity,
        lineNumber: line.lineNo()
      };
    }
  } catch (error) {
    console.error("Error parsing issue from widget:", error);
  }
  return null;
}

function createIssueElement(issue, index) {
  const div = document.createElement("div");
  div.className = "issue-item";
  div.setAttribute("data-severity", issue.Severity);
  
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `issue-${index}`;
  checkbox.checked = true;
  
  const label = document.createElement("label");
  label.htmlFor = `issue-${index}`;
  label.className = "issue-details";
  
  const severitySpan = document.createElement("span");
  severitySpan.className = `issue-severity ${issue.Severity}`;
  severitySpan.textContent = issue.Severity.toUpperCase();
  
  const lineSpan = document.createElement("div");
  lineSpan.className = "issue-line";
  lineSpan.textContent = `Line ${issue.Line} (${issue.Span[0]}-${issue.Span[1]})`;
  
  const checkDiv = document.createElement("div");
  checkDiv.className = "issue-check";
  checkDiv.textContent = issue.Check;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "issue-message";
  messageDiv.textContent = issue.Message;
  
  label.appendChild(severitySpan);
  label.appendChild(lineSpan);
  label.appendChild(checkDiv);
  label.appendChild(messageDiv);
  
  div.appendChild(checkbox);
  div.appendChild(label);
  
  return div;
}

function selectAllIssues() {
  const checkboxes = document.querySelectorAll('.issue-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
}

function deselectAllIssues() {
  const checkboxes = document.querySelectorAll('.issue-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
}

function selectAllErrors() {
  const checkboxes = document.querySelectorAll('.issue-item input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const issueItem = cb.closest('.issue-item');
    if (issueItem && issueItem.getAttribute('data-severity') === 'error') {
      cb.checked = true;
    }
  });
}

function selectAllWarnings() {
  const checkboxes = document.querySelectorAll('.issue-item input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const issueItem = cb.closest('.issue-item');
    if (issueItem && issueItem.getAttribute('data-severity') === 'warning') {
      cb.checked = true;
    }
  });
}

async function fixSelectedIssues() {
  const checkboxes = document.querySelectorAll('.issue-item input[type="checkbox"]');
  selectedIssuesList = [];
  
  checkboxes.forEach((cb, index) => {
    if (cb.checked) {
      selectedIssuesList.push({ issue: allIssues[index], index: index });
    }
  });
  
  if (selectedIssuesList.length === 0) {
    showNotification("Please select at least one issue to fix");
    return;
  }
  
  // Reset approval state
  currentIssueIndex = 0;
  approvedFixes = [];
  skippedIssues = [];
  failedIssues = [];
  
  // Hide issue selection view
  document.getElementById("issue-selection-view").style.display = "none";
  document.getElementById("fix-issues-btn").style.display = "none";
  
  // Process first issue
  processCurrentIssue();
}

function extractParagraph(text, lineNumber) {
  const lines = text.split("\n");
  let startLine = lineNumber;
  let endLine = lineNumber;
  
  // Find paragraph start (blank line or start of document)
  while (startLine > 0 && lines[startLine - 1].trim() !== "") {
    startLine--;
  }
  
  // Find paragraph end (blank line or end of document)
  while (endLine < lines.length - 1 && lines[endLine + 1].trim() !== "") {
    endLine++;
  }
  
  return lines.slice(startLine, endLine + 1).join("\n");
}

function extractProblematicText(text, issue) {
  const lines = text.split("\n");
  const line = lines[issue.Line - 1] || "";
  const startChar = issue.Span[0] - 1;
  const endChar = issue.Span[1];
  return line.substring(startChar, endChar);
}

// Approval Workflow Functions

async function processCurrentIssue() {
  if (currentIssueIndex >= selectedIssuesList.length) {
    // All issues processed, show completion summary
    showCompletionSummary();
    return;
  }
  
  const { issue } = selectedIssuesList[currentIssueIndex];
  currentIssue = issue;
  
  // Show loading
  document.getElementById("approval-view").style.display = "none";
  document.getElementById("ai-fix-loading").style.display = "block";
  document.getElementById("ai-fix-status").textContent = 
    `Getting AI suggestion for issue ${currentIssueIndex + 1} of ${selectedIssuesList.length}...`;
  
  try {
    const editorText = editor.getValue();
    const paragraph = extractParagraph(editorText, issue.Line - 1);
    const problematicText = extractProblematicText(editorText, issue);
    
    currentOriginalText = paragraph;
    
    const response = await fetch("http://localhost:8080/api/ollama/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paragraph: paragraph,
        issue: issue,
        problematicText: problematicText,
        model: selectedModel,
      }),
    });
    
    if (!response.ok) {
      failedIssues.push({ issue, error: "API request failed" });
      showNotification(`Failed to get AI suggestion for issue ${currentIssueIndex + 1}`);
      currentIssueIndex++;
      processCurrentIssue();
      return;
    }
    
    const data = await response.json();
    currentFixedText = data.fixedText;
    
    // Show approval view
    showApprovalView(issue, paragraph, data.fixedText);
    
  } catch (error) {
    console.error(`Error processing issue ${currentIssueIndex + 1}:`, error);
    failedIssues.push({ issue, error: error.message });
    showNotification(`Error processing issue ${currentIssueIndex + 1}`);
    currentIssueIndex++;
    processCurrentIssue();
  }
}

function showApprovalView(issue, originalText, suggestedText) {
  // Hide loading
  document.getElementById("ai-fix-loading").style.display = "none";
  
  // Show approval view
  const approvalView = document.getElementById("approval-view");
  approvalView.style.display = "block";
  
  // Update progress
  document.getElementById("approval-progress-text").textContent = 
    `Issue ${currentIssueIndex + 1} of ${selectedIssuesList.length}`;
  
  // Update issue details
  const severitySpan = document.getElementById("approval-severity");
  severitySpan.className = `issue-severity ${issue.Severity}`;
  severitySpan.textContent = issue.Severity.toUpperCase();
  
  document.getElementById("approval-line").textContent = 
    `Line ${issue.Line} (${issue.Span[0]}-${issue.Span[1]})`;
  
  document.getElementById("approval-check").textContent = issue.Check;
  document.getElementById("approval-message").textContent = issue.Message;
  
  // Show text comparison with word-level highlighting
  const { originalHighlighted, fixedHighlighted } = highlightTextDifferences(originalText, suggestedText);
  
  document.getElementById("approval-original-text").innerHTML = originalHighlighted;
  
  // Make the AI suggested text editable with highlighting
  const fixedTextDiv = document.getElementById("approval-fixed-text");
  fixedTextDiv.innerHTML = fixedHighlighted;
  
  // Update currentFixedText when user edits the contenteditable div
  fixedTextDiv.oninput = function() {
    currentFixedText = this.innerText;
  };
}

function highlightTextDifferences(originalText, suggestedText) {
  // Split into words while preserving whitespace
  const words1 = tokenizeText(originalText);
  const words2 = tokenizeText(suggestedText);
  
  // Compute word-level diff
  const diff = computeWordDiff(words1, words2);
  
  let originalHighlighted = '';
  let fixedHighlighted = '';
  
  diff.forEach(item => {
    if (item.type === 'equal') {
      // Unchanged words appear in both columns without highlighting
      originalHighlighted += escapeHtml(item.value);
      fixedHighlighted += escapeHtml(item.value);
    } else if (item.type === 'delete') {
      // Deleted word: highlight in red in ORIGINAL column, don't show in fixed
      originalHighlighted += `<span class="highlight-removed">${escapeHtml(item.value)}</span>`;
      // Don't add to fixed column
    } else if (item.type === 'insert') {
      // Inserted word: don't show in original, highlight in green in FIXED column
      // Don't add to original column
      fixedHighlighted += `<span class="highlight-added">${escapeHtml(item.value)}</span>`;
    }
  });
  
  return { originalHighlighted, fixedHighlighted };
}

function tokenizeText(text) {
  // Split text into words and whitespace tokens
  const tokens = [];
  const regex = /(\s+|\S+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

function computeWordDiff(words1, words2) {
  // Simple LCS-based diff algorithm
  const m = words1.length;
  const n = words2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Build LCS table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find diff
  const diff = [];
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      diff.unshift({ type: 'equal', value: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'insert', value: words2[j - 1] });
      j--;
    } else if (i > 0) {
      diff.unshift({ type: 'delete', value: words1[i - 1] });
      i--;
    }
  }
  
  return diff;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function approveCurrentFix() {
  approvedFixes.push({
    issue: currentIssue,
    originalText: currentOriginalText,
    fixedText: currentFixedText,
  });
  
  currentIssueIndex++;
  processCurrentIssue();
}

function skipCurrentFix() {
  skippedIssues.push(currentIssue);
  currentIssueIndex++;
  processCurrentIssue();
}

async function retryCurrentFix() {
  // Re-process the current issue without incrementing index
  document.getElementById("approval-view").style.display = "none";
  document.getElementById("ai-fix-loading").style.display = "block";
  document.getElementById("ai-fix-status").textContent = 
    `Retrying AI suggestion for issue ${currentIssueIndex + 1}...`;
  
  try {
    const editorText = editor.getValue();
    const paragraph = extractParagraph(editorText, currentIssue.Line - 1);
    const problematicText = extractProblematicText(editorText, currentIssue);
    
    const response = await fetch("http://localhost:8080/api/ollama/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paragraph: paragraph,
        issue: currentIssue,
        problematicText: problematicText,
        model: selectedModel,
      }),
    });
    
    if (!response.ok) {
      showNotification("Retry failed. Please try again or skip this issue.");
      showApprovalView(currentIssue, currentOriginalText, currentFixedText);
      return;
    }
    
    const data = await response.json();
    currentFixedText = data.fixedText;
    
    showApprovalView(currentIssue, currentOriginalText, data.fixedText);
    
  } catch (error) {
    console.error("Error retrying fix:", error);
    showNotification("Retry failed. Please try again or skip this issue.");
    showApprovalView(currentIssue, currentOriginalText, currentFixedText);
  }
}

function backToIssueList() {
  // Reset state
  currentIssueIndex = 0;
  approvedFixes = [];
  skippedIssues = [];
  failedIssues = [];
  selectedIssuesList = [];
  
  // Hide approval and loading views
  document.getElementById("approval-view").style.display = "none";
  document.getElementById("ai-fix-loading").style.display = "none";
  document.getElementById("completion-summary").style.display = "none";
  
  // Show issue selection view
  document.getElementById("issue-selection-view").style.display = "block";
  document.getElementById("fix-issues-btn").style.display = "inline-block";
  document.getElementById("apply-fixes-btn").style.display = "none";
}

function showCompletionSummary() {
  // Hide approval and loading views
  document.getElementById("approval-view").style.display = "none";
  document.getElementById("ai-fix-loading").style.display = "none";
  
  // Show completion summary
  const summaryView = document.getElementById("completion-summary");
  summaryView.style.display = "block";
  
  document.getElementById("summary-approved").textContent = approvedFixes.length;
  document.getElementById("summary-skipped").textContent = skippedIssues.length;
  document.getElementById("summary-failed").textContent = failedIssues.length;
  
  if (approvedFixes.length === 0) {
    document.getElementById("summary-message").textContent = 
      "No changes were approved. Click Cancel to close.";
    document.getElementById("apply-fixes-btn").style.display = "none";
  } else {
    document.getElementById("summary-message").textContent = 
      "Click 'Apply Changes' to update your text with the approved fixes.";
    document.getElementById("apply-fixes-btn").style.display = "inline-block";
    document.getElementById("fix-issues-btn").style.display = "none";
  }
}

function applyApprovedFixes() {
  if (approvedFixes.length === 0) {
    showNotification("No fixes to apply");
    closeAIFixModal();
    return;
  }
  
  let updatedText = editor.getValue();
  
  // Apply fixes in order
  approvedFixes.forEach(fix => {
    updatedText = updatedText.replace(fix.originalText, fix.fixedText);
  });
  
  // Update editor
  editor.setValue(updatedText);
  clearWidgetsMarkers(clearCountsMarksWidgets);
  
  showNotification(`Successfully applied ${approvedFixes.length} fix(es)`);
  closeAIFixModal();
  updateAIFixButtonVisibility();
}
