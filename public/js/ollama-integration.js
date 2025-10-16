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

