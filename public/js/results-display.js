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
      
      // Add Fix button for custom AsciiDocDITA fixes
      if (isCustomFixableIssue(data[i].Check)) {
        var fixButton = document.createElement("button");
        fixButton.textContent = " [Fix]";
        fixButton.className = "inline-fix-button";
        fixButton.setAttribute("data-issue-index", i);
        fixButton.onclick = (function(issue, mkr, wgt) {
          return function() {
            applyCustomFix(issue, mkr, wgt, widgetsError, "error");
          };
        })(data[i], marker, widget);
        msg.appendChild(fixButton);
      }
      // Add Fix button if action exists (after widget is created)
      else if (data[i].Action && data[i].Action.Name) {
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
      
      // Add Fix button for custom AsciiDocDITA fixes
      if (isCustomFixableIssue(data[i].Check)) {
        var fixButton = document.createElement("button");
        fixButton.textContent = " [Fix]";
        fixButton.className = "inline-fix-button";
        fixButton.setAttribute("data-issue-index", i);
        fixButton.onclick = (function(issue, mkr, wgt) {
          return function() {
            applyCustomFix(issue, mkr, wgt, widgetsWarning, "warning");
          };
        })(data[i], marker, widget);
        msg.appendChild(fixButton);
      }
      // Add Fix button if action exists (after widget is created)
      else if (data[i].Action && data[i].Action.Name) {
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
      
      // Add Fix button for custom AsciiDocDITA fixes
      if (isCustomFixableIssue(data[i].Check)) {
        var fixButton = document.createElement("button");
        fixButton.textContent = " [Fix]";
        fixButton.className = "inline-fix-button";
        fixButton.setAttribute("data-issue-index", i);
        fixButton.onclick = (function(issue, mkr, wgt) {
          return function() {
            applyCustomFix(issue, mkr, wgt, widgetsSuggestion, "suggestion");
          };
        })(data[i], marker, widget);
        msg.appendChild(fixButton);
      }
      // Add Fix button if action exists (after widget is created)
      else if (data[i].Action && data[i].Action.Name) {
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
  
  // Update Convert to DITA button visibility
  if (typeof updateConvertToDitaButtonVisibility !== "undefined") {
    updateConvertToDitaButtonVisibility();
  }
}

// Check if issue is a custom fixable AsciiDocDITA issue
function isCustomFixableIssue(checkName) {
  return checkName === "AsciiDocDITA.ContentType" ||
         checkName === "AsciiDocDITA.ShortDescription" ||
         checkName === "AsciiDocDITA.BlockTitle";
}

// Route to appropriate custom fix based on issue type
function applyCustomFix(issue, marker, widget, widgetArray, severity) {
  var checkName = issue.Check;
  
  try {
    if (checkName === "AsciiDocDITA.ContentType") {
      applyContentTypeFix(issue, marker, widget, widgetArray);
    } else if (checkName === "AsciiDocDITA.ShortDescription") {
      applyShortDescriptionFix(issue, marker, widget, widgetArray);
    } else if (checkName === "AsciiDocDITA.BlockTitle") {
      applyBlockTitleFix(issue, marker, widget, widgetArray);
    }
  } catch (error) {
    console.error("Error applying custom fix:", error);
    showNotification("Error applying fix: " + error.message);
  }
}

// Fix for AsciiDocDITA.ContentType - Show dropdown to select content type
function applyContentTypeFix(issue, marker, widget, widgetArray) {
  // Create dropdown element
  var dropdown = document.createElement("select");
  dropdown.className = "content-type-dropdown";
  
  var options = ["ASSEMBLY", "CONCEPT", "REFERENCE", "PROCEDURE", "SNIPPET"];
  
  // Add placeholder option
  var placeholderOption = document.createElement("option");
  placeholderOption.textContent = "Select content type...";
  placeholderOption.value = "";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  dropdown.appendChild(placeholderOption);
  
  // Add content type options
  options.forEach(function(optionValue) {
    var option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    dropdown.appendChild(option);
  });
  
  // Handle selection
  dropdown.onchange = function() {
    if (dropdown.value) {
      insertContentType(dropdown.value, marker, widget, widgetArray);
      dropdown.remove();
    }
  };
  
  // Add dropdown to the widget
  widget.node.appendChild(dropdown);
  dropdown.focus();
}

// Insert content type attribute after comments
function insertContentType(contentType, marker, widget, widgetArray) {
  var doc = editor.getDoc();
  var totalLines = doc.lineCount();
  var insertLine = 0;
  
  // Find the last comment line or the beginning
  for (var i = 0; i < totalLines; i++) {
    var lineText = doc.getLine(i).trim();
    if (lineText.startsWith("//")) {
      insertLine = i + 1;
    } else if (lineText !== "") {
      // Found first non-empty, non-comment line
      break;
    }
  }
  
  // Build the text to insert with blank lines
  var textToInsert = "\n:_mod-docs-content-type: " + contentType + "\n";
  
  // Insert at the appropriate position
  doc.replaceRange(textToInsert, { line: insertLine, ch: 0 });
  
  // Clear the marker and remove widget
  marker.clear();
  var widgetIndex = widgetArray.indexOf(widget);
  if (widgetIndex > -1) {
    widgetArray.splice(widgetIndex, 1);
  }
  doc.removeLineWidget(widget);
  
  // Update counts
  updateCounts();
  showNotification("Content type added successfully!");
}

// Fix for AsciiDocDITA.ShortDescription - Add [role="_abstract"] after title
function applyShortDescriptionFix(issue, marker, widget, widgetArray) {
  var doc = editor.getDoc();
  var totalLines = doc.lineCount();
  var titleLine = -1;
  
  // Find the title line (starts with single =)
  for (var i = 0; i < totalLines; i++) {
    var lineText = doc.getLine(i);
    if (lineText.match(/^=\s+\S/)) {
      titleLine = i;
      break;
    }
  }
  
  if (titleLine === -1) {
    showNotification("Error: Could not find title line (starting with =)");
    return;
  }
  
  // Check if there's already a blank line after title
  var nextLineAfterTitle = titleLine + 1;
  var hasBlankLine = false;
  
  if (nextLineAfterTitle < totalLines) {
    var nextLineText = doc.getLine(nextLineAfterTitle).trim();
    if (nextLineText === "") {
      hasBlankLine = true;
    }
  }
  
  // Insert [role="_abstract"] with proper spacing
  var insertText;
  if (hasBlankLine) {
    // Blank line exists, insert role on the next line after it
    insertText = "[role=\"_abstract\"]\n\n";
    doc.replaceRange(insertText, { line: nextLineAfterTitle + 1, ch: 0 });
  } else {
    // No blank line, add blank line and then role
    insertText = "\n\n[role=\"_abstract\"]\n";
    doc.replaceRange(insertText, { line: titleLine + 1, ch: 0 });
  }
  
  // Clear the marker and remove widget
  marker.clear();
  var widgetIndex = widgetArray.indexOf(widget);
  if (widgetIndex > -1) {
    widgetArray.splice(widgetIndex, 1);
  }
  doc.removeLineWidget(widget);
  
  // Update counts
  updateCounts();
  showNotification("Abstract role added successfully!");
}

// Fix for AsciiDocDITA.BlockTitle - Remove block title lines starting with .
function applyBlockTitleFix(issue, marker, widget, widgetArray) {
  var doc = editor.getDoc();
  var lineNumber = issue.Line - 1;
  var startChar = issue.Span[0] - 1;
  var endChar = issue.Span[1];
  var foundLine = -1;
  
  // Search for a line starting with . followed by a character in a range around the issue line
  // (line numbers may have shifted due to previous fixes)
  var searchRange = 5; // Search 5 lines before and after
  var startSearch = Math.max(0, lineNumber - searchRange);
  var endSearch = Math.min(doc.lineCount() - 1, lineNumber + searchRange);
  
  // Regex to match lines starting with . followed by a character (e.g., .Example, .Table)
  var blockTitleRegex = /^\.\S/;
  
  for (var i = startSearch; i <= endSearch; i++) {
    var lineText = doc.getLine(i);
    
    // Check if line matches block title pattern
    if (blockTitleRegex.test(lineText)) {
      // Verify the span matches - check if the columns are in valid range for this line
      if (startChar >= 0 && endChar <= lineText.length) {
        foundLine = i;
        break;
      } else if (endChar <= lineText.length) {
        // If only endChar is valid, still consider it a match
        foundLine = i;
        break;
      }
    }
  }
  
  if (foundLine !== -1) {
    // Delete the entire line
    doc.replaceRange("", 
      { line: foundLine, ch: 0 },
      { line: foundLine + 1, ch: 0 }
    );
    
    // Clear the marker and remove widget
    marker.clear();
    var widgetIndex = widgetArray.indexOf(widget);
    if (widgetIndex > -1) {
      widgetArray.splice(widgetIndex, 1);
    }
    doc.removeLineWidget(widget);
    
    // Update counts
    updateCounts();
    showNotification("Block title removed successfully!");
  } else {
    showNotification("Error: Could not find block title line (starting with . followed by text)");
  }
}

