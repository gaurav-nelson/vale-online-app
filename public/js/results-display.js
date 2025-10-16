// Parse and display Vale results

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
      var marker = editor.getDoc().markText(
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
      
      var widget = editor.getDoc().addLineWidget(lineNumber, msg);
      
      // Add Fix button if action exists (after widget is created)
      if (data[i].Action && data[i].Action.Name) {
        var fixButton = document.createElement("button");
        fixButton.textContent = " [Fix]";
        fixButton.className = "inline-fix-button";
        fixButton.setAttribute("data-issue-index", i);
        fixButton.onclick = (function(issue, mkr, wgt) {
          return function() {
            applyInlineFix(issue, mkr, wgt, widgetsError, "error");
          };
        })(data[i], marker, widget);
        msg.appendChild(fixButton);
      }
      
      markers.push(marker);
      widgetsError.push(widget);
    }
    if (data[i].Severity === "warning") {
      var lineNumber = data[i].Line - 1;
      var startChar = data[i].Span[0] - 1;
      var endChar = data[i].Span[1];
      var marker = editor.getDoc().markText(
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
      
      var widget = editor.getDoc().addLineWidget(lineNumber, msg);
      
      // Add Fix button if action exists (after widget is created)
      if (data[i].Action && data[i].Action.Name) {
        var fixButton = document.createElement("button");
        fixButton.textContent = " [Fix]";
        fixButton.className = "inline-fix-button";
        fixButton.setAttribute("data-issue-index", i);
        fixButton.onclick = (function(issue, mkr, wgt) {
          return function() {
            applyInlineFix(issue, mkr, wgt, widgetsWarning, "warning");
          };
        })(data[i], marker, widget);
        msg.appendChild(fixButton);
      }
      
      markers.push(marker);
      widgetsWarning.push(widget);
    }
    if (
      data[i].Severity === "suggestion" &&
      document.getElementById("suggestionsCheckbox").checked
    ) {
      var lineNumber = data[i].Line - 1;
      var startChar = data[i].Span[0] - 1;
      var endChar = data[i].Span[1];
      var marker = editor.getDoc().markText(
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
      
      var widget = editor.getDoc().addLineWidget(lineNumber, msg);
      
      // Add Fix button if action exists (after widget is created)
      if (data[i].Action && data[i].Action.Name) {
        var fixButton = document.createElement("button");
        fixButton.textContent = " [Fix]";
        fixButton.className = "inline-fix-button";
        fixButton.setAttribute("data-issue-index", i);
        fixButton.onclick = (function(issue, mkr, wgt) {
          return function() {
            applyInlineFix(issue, mkr, wgt, widgetsSuggestion, "suggestion");
          };
        })(data[i], marker, widget);
        msg.appendChild(fixButton);
      }
      
      markers.push(marker);
      widgetsSuggestion.push(widget);
    }
  }
}

// Apply inline fix for issues with actions
function applyInlineFix(issue, marker, widget, widgetArray, severity) {
  try {
    var lineNumber = issue.Line - 1;
    var startChar = issue.Span[0] - 1;
    var endChar = issue.Span[1];
    
    // Get the current text at the issue location
    var currentText = editor.getDoc().getRange(
      { line: lineNumber, ch: startChar },
      { line: lineNumber, ch: endChar }
    );
    
    var replacementText = "";
    var actionName = issue.Action.Name;
    
    // Apply fix based on action type
    if (actionName === "replace") {
      // Simple replacement with first parameter
      replacementText = issue.Action.Params[0];
    } else if (actionName === "remove") {
      // Remove the text (empty string)
      replacementText = "";
    } else if (actionName === "edit" && issue.Action.Params && issue.Action.Params.length >= 3) {
      // Regex-based replacement
      if (issue.Action.Params[0] === "regex") {
        var pattern = issue.Action.Params[1];
        var replacement = issue.Action.Params[2];
        
        try {
          var regex = new RegExp(pattern);
          replacementText = currentText.replace(regex, replacement);
        } catch (e) {
          console.error("Invalid regex pattern:", pattern, e);
          showNotification("Error: Invalid regex pattern");
          return;
        }
      }
    } else {
      console.warn("Unknown action type:", actionName);
      showNotification("Error: Unknown action type");
      return;
    }
    
    // Replace the text in the editor
    editor.getDoc().replaceRange(
      replacementText,
      { line: lineNumber, ch: startChar },
      { line: lineNumber, ch: endChar }
    );
    
    // Clear the marker
    marker.clear();
    
    // Remove the widget from DOM and array
    var widgetIndex = widgetArray.indexOf(widget);
    if (widgetIndex > -1) {
      widgetArray.splice(widgetIndex, 1);
    }
    editor.getDoc().removeLineWidget(widget);
    
    // Update counts
    updateCounts();
    
    showNotification("Fix applied successfully!");
    
  } catch (error) {
    console.error("Error applying fix:", error);
    showNotification("Error applying fix: " + error.message);
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

