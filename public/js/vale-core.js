// Vale linting core functionality

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

