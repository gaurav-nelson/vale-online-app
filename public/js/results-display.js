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

