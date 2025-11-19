// AI Fix Modal - Issue selection and management

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
  
  // Show message if no issues found
  if (allIssues.length === 0) {
    const noIssuesMsg = document.createElement("div");
    noIssuesMsg.className = "no-issues-message";
    noIssuesMsg.textContent = "No issues found to fix.";
    issuesList.appendChild(noIssuesMsg);
  }
  
  // Reset the filter dropdown to "None" to match the unchecked default state
  document.getElementById("issue-filter-select").value = "none";
  
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
    const text = widget.node.textContent.trim();
    
    // Parse the widget text to extract issue details
    // Format: "❌ Check Line(start-end) Message"
    // Using a two-stage approach for robust parsing
    
    // Try regex first
    const match = text.match(/^[❌❗💡]\s+(.+?)\s+(\d+)\((\d+)-(\d+)\)\s+(.+?)\.?$/);
    
    if (match) {
      return {
        Check: match[1],
        Line: parseInt(match[2]),
        Span: [parseInt(match[3]), parseInt(match[4])],
        Message: match[5].trim(),
        Severity: severity,
        lineNumber: line.lineNo()
      };
    }
    
    // Fallback: Parse by finding the span pattern
    const spanMatch = text.match(/(\d+)\((\d+)-(\d+)\)/);
    if (spanMatch) {
      const beforeSpan = text.substring(0, text.indexOf(spanMatch[0])).trim();
      const afterSpan = text.substring(text.indexOf(spanMatch[0]) + spanMatch[0].length).trim();
      const checkName = beforeSpan.replace(/^[❌❗💡]\s+/, '');
      
      return {
        Check: checkName,
        Line: parseInt(spanMatch[1]),
        Span: [parseInt(spanMatch[2]), parseInt(spanMatch[3])],
        Message: afterSpan.replace(/^\.?\s*/, '').replace(/\.$/, ''),
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
  checkbox.checked = false;
  
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

function applyIssueFilter(filterValue) {
  const checkboxes = document.querySelectorAll('.issue-item input[type="checkbox"]');
  
  checkboxes.forEach(cb => {
    const issueItem = cb.closest('.issue-item');
    const severity = issueItem ? issueItem.getAttribute('data-severity') : null;
    
    switch(filterValue) {
      case 'all':
        cb.checked = true;
        break;
      case 'none':
        cb.checked = false;
        break;
      case 'errors':
        cb.checked = (severity === 'error');
        break;
      case 'warnings':
        cb.checked = (severity === 'warning');
        break;
      case 'suggestions':
        cb.checked = (severity === 'suggestion');
        break;
    }
  });
}

async function fixSelectedIssues() {
  const checkboxes = document.querySelectorAll('.issue-item input[type="checkbox"]');
  const selectedIssues = [];
  
  checkboxes.forEach((cb, index) => {
    if (cb.checked) {
      selectedIssues.push(allIssues[index]);
    }
  });
  
  if (selectedIssues.length === 0) {
    showNotification("Please select at least one issue to fix");
    return;
  }
  
  // Group issues by line number
  const issuesByLine = {};
  selectedIssues.forEach(issue => {
    const lineNum = issue.Line;
    if (!issuesByLine[lineNum]) {
      issuesByLine[lineNum] = [];
    }
    issuesByLine[lineNum].push(issue);
  });
  
  // Convert to array of groups, sorted by line number
  selectedIssuesList = Object.keys(issuesByLine)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(lineNum => ({
      lineNumber: parseInt(lineNum),
      issues: issuesByLine[lineNum]
    }));
  
  // Reset approval state
  currentIssueIndex = 0;
  approvedFixes = [];
  skippedIssues = [];
  failedIssues = [];
  
  // Hide issue selection view
  document.getElementById("issue-selection-view").style.display = "none";
  document.getElementById("fix-issues-btn").style.display = "none";
  
  // Process first issue group
  processCurrentIssue();
}

