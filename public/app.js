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
  }
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
