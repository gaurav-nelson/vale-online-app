// AI Fix Workflow - Issue processing and approval

function cleanAIOutput(originalText, aiSuggestion) {
  // If the original text doesn't contain triple quotes, remove them from the AI suggestion
  if (!originalText.includes('"""')) {
    return aiSuggestion.replace(/"""/g, '');
  }
  return aiSuggestion;
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
  
  const currentGroup = selectedIssuesList[currentIssueIndex];
  const lineNumber = currentGroup.lineNumber;
  const issues = currentGroup.issues;
  currentIssues = issues; // Store current issues for approval/skip logic
  
  // Show loading
  document.getElementById("approval-view").style.display = "none";
  document.getElementById("ai-fix-loading").style.display = "block";
  const issueCount = issues.length;
  const issueText = issueCount === 1 ? "issue" : "issues";
  document.getElementById("ai-fix-status").textContent = 
    `Getting AI suggestion for ${issueCount} ${issueText} on line ${lineNumber} (${currentIssueIndex + 1} of ${selectedIssuesList.length} lines) using ${selectedModel}...`;
  
  try {
    const editorText = editor.getValue();
    const paragraph = extractParagraph(editorText, lineNumber - 1);
    
    currentOriginalText = paragraph;
    
    const response = await fetch("http://localhost:8080/api/ollama/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paragraph: paragraph,
        issues: issues,
        model: selectedModel,
      }),
    });
    
    if (!response.ok) {
      issues.forEach(issue => {
        failedIssues.push({ issue, error: "API request failed" });
      });
      showNotification(`Failed to get AI suggestion for ${issueCount} ${issueText} on line ${lineNumber}`);
      currentIssueIndex++;
      processCurrentIssue();
      return;
    }
    
    const data = await response.json();
    currentFixedText = cleanAIOutput(paragraph, data.fixedText);
    
    // Show approval view
    showApprovalView(issues, lineNumber, paragraph, currentFixedText);
    
  } catch (error) {
    console.error(`Error processing line ${lineNumber}:`, error);
    issues.forEach(issue => {
      failedIssues.push({ issue, error: error.message });
    });
    showNotification(`Error processing ${issueCount} ${issueText} on line ${lineNumber}`);
    currentIssueIndex++;
    processCurrentIssue();
  }
}

function showApprovalView(issues, lineNumber, originalText, suggestedText) {
  // Hide loading
  document.getElementById("ai-fix-loading").style.display = "none";
  
  // Show approval view
  const approvalView = document.getElementById("approval-view");
  approvalView.style.display = "block";
  
  // Update progress
  const issueCount = issues.length;
  const issueText = issueCount === 1 ? "issue" : "issues";
  document.getElementById("approval-progress-text").textContent = 
    `Fixing ${issueCount} ${issueText} on line ${lineNumber} (${currentIssueIndex + 1} of ${selectedIssuesList.length} lines)`;
  
  // Clear and rebuild the issue details container
  const issueDetailsContainer = document.getElementById("approval-issue-details");
  
  if (issueDetailsContainer) {
    // Clear all existing content
    issueDetailsContainer.innerHTML = "";
    
    // Create fresh container for issues list
    const issuesListContainer = document.createElement("div");
    issuesListContainer.id = "approval-issues-list";
    issuesListContainer.className = "approval-issues-list";
    issueDetailsContainer.appendChild(issuesListContainer);
    
    // Now populate it with issues
    issues.forEach((issue, index) => {
      const issueItem = document.createElement("div");
      issueItem.className = "approval-issue-item";
      
      const severitySpan = document.createElement("span");
      severitySpan.className = `issue-severity ${issue.Severity}`;
      severitySpan.textContent = issue.Severity.toUpperCase();
      
      const spanInfo = document.createElement("div");
      spanInfo.className = "issue-line";
      spanInfo.textContent = `Line ${lineNumber} (${issue.Span[0]}-${issue.Span[1]})`;
      
      const checkDiv = document.createElement("div");
      checkDiv.className = "issue-check";
      checkDiv.textContent = issue.Check;
      
      const messageDiv = document.createElement("div");
      messageDiv.className = "issue-message";
      messageDiv.textContent = issue.Message;
      
      issueItem.appendChild(severitySpan);
      issueItem.appendChild(spanInfo);
      issueItem.appendChild(checkDiv);
      issueItem.appendChild(messageDiv);
      
      issuesListContainer.appendChild(issueItem);
      
      // Add separator between issues (except for the last one)
      if (index < issues.length - 1) {
        const separator = document.createElement("hr");
        separator.className = "approval-issue-separator";
        issuesListContainer.appendChild(separator);
      }
    });
  }
  
  // Populate model dropdown
  const modelSelect = document.getElementById('approval-model-select');
  modelSelect.innerHTML = '';
  ollamaModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    if (model === selectedModel) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });
  
  // Add event listener to sync model changes globally
  // Remove old listener first to avoid duplicates
  const newModelSelect = modelSelect.cloneNode(true);
  modelSelect.parentNode.replaceChild(newModelSelect, modelSelect);
  newModelSelect.addEventListener('change', function() {
    // Update global selected model
    selectedModel = this.value;
    localStorage.setItem("ollamaModel", selectedModel);
    
    // Update the settings dropdown if it exists
    const settingsModelSelect = document.getElementById('ollamaModelSelect');
    if (settingsModelSelect) {
      settingsModelSelect.value = selectedModel;
    }
    
    console.log('Model changed to:', selectedModel);
  });
  
  // Reset context input
  document.getElementById('add-context-checkbox').checked = false;
  document.getElementById('context-textarea').value = '';
  document.getElementById('context-input-container').style.display = 'none';
  
  // Add event listener for context checkbox (remove old listener first)
  const contextCheckbox = document.getElementById('add-context-checkbox');
  const newCheckbox = contextCheckbox.cloneNode(true);
  contextCheckbox.parentNode.replaceChild(newCheckbox, contextCheckbox);
  newCheckbox.addEventListener('change', function() {
    const container = document.getElementById('context-input-container');
    container.style.display = this.checked ? 'block' : 'none';
  });
  
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
    issues: currentIssues,
    originalText: currentOriginalText,
    fixedText: currentFixedText,
  });
  
  currentIssueIndex++;
  processCurrentIssue();
}

function skipCurrentFix() {
  currentIssues.forEach(issue => {
    skippedIssues.push(issue);
  });
  currentIssueIndex++;
  processCurrentIssue();
}

async function retryCurrentFix() {
  // Re-process the current issue group without incrementing index
  document.getElementById("approval-view").style.display = "none";
  document.getElementById("ai-fix-loading").style.display = "block";
  
  // Get selected model from dropdown
  const modelFromDropdown = document.getElementById('approval-model-select').value;
  
  const currentGroup = selectedIssuesList[currentIssueIndex];
  const lineNumber = currentGroup.lineNumber;
  const issues = currentGroup.issues;
  const issueCount = issues.length;
  const issueText = issueCount === 1 ? "issue" : "issues";
  
  document.getElementById("ai-fix-status").textContent = 
    `Retrying AI suggestion for ${issueCount} ${issueText} on line ${lineNumber} using ${modelFromDropdown}...`;
  
  try {
    const editorText = editor.getValue();
    const paragraph = extractParagraph(editorText, lineNumber - 1);
    
    // Get additional context if provided
    let additionalContext = '';
    if (document.getElementById('add-context-checkbox').checked) {
      additionalContext = document.getElementById('context-textarea').value.trim();
    }
    
    const response = await fetch("http://localhost:8080/api/ollama/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paragraph: paragraph,
        issues: issues,
        model: modelFromDropdown,
        additionalContext: additionalContext,
      }),
    });
    
    if (!response.ok) {
      showNotification("Retry failed. Please try again or skip this line.");
      showApprovalView(issues, lineNumber, currentOriginalText, currentFixedText);
      return;
    }
    
    const data = await response.json();
    currentFixedText = cleanAIOutput(currentOriginalText, data.fixedText);
    
    showApprovalView(issues, lineNumber, currentOriginalText, currentFixedText);
    
  } catch (error) {
    console.error("Error retrying fix:", error);
    showNotification("Retry failed. Please try again or skip this line.");
    showApprovalView(issues, lineNumber, currentOriginalText, currentFixedText);
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

