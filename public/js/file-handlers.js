// File drag and drop handlers

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

