/**
 * AI prompts for fixing Vale linting issues
 */

const SYSTEM_PROMPT = `You are a technical editor that fixes style and grammar issues in documentation.
Your task is to fix specific writing issues while preserving the technical accuracy and meaning of the content.

STYLE GUIDE COMPLIANCE:
- Follow the IBM style guide for technical documentation
- Follow the Red Hat Supplementary style guide for product documentation
- Ensure consistency with enterprise technical writing standards

IMPORTANT: The content is written in AsciiDoc format. Your fix MUST:
- Maintain all AsciiDoc markup and syntax exactly as it appears
- Preserve formatting elements like *bold*, _italic_, \`code\`, links, anchors, etc.
- Keep document structure intact (headings with =, lists with *, -, tables, etc.)
- Preserve AsciiDoc attributes, macros, and special syntax
- DO NOT convert to Markdown or any other format
- Only fix the style/grammar issue without changing the AsciiDoc formatting

Return ONLY the corrected text without any explanations, comments, or additional formatting.`;

/**
 * Creates a prompt for fixing Vale issues
 * @param {string} paragraph - The full paragraph containing the issues
 * @param {Array<object>} issues - Array of Vale issue objects with Check, Message, Line, Span, Severity
 * @param {string} additionalContext - Optional additional context from the user
 * @returns {string} - The complete prompt for the AI
 */
function createFixPrompt(paragraph, issues, additionalContext = '') {
  // Ensure issues is an array
  const issuesArray = Array.isArray(issues) ? issues : [issues];
  
  let prompt = `${SYSTEM_PROMPT}

Context paragraph:
"""
${paragraph}
"""

Issue${issuesArray.length > 1 ? 's' : ''} to fix:`;

  // List all issues
  // Since all issues are on the same line (grouped by line), we need to find that line in the paragraph
  const paragraphLines = paragraph.split("\n");
  const firstIssue = issuesArray[0];
  
  // Find which line in the paragraph contains the issue
  // We'll use a heuristic: find the line that has enough characters to contain the span
  // Since spans are character positions within a line, we look for a line long enough
  let issueLineInParagraph = -1;
  let issueLineText = "";
  
  // Try to find the line that could contain the span
  // The span[0] is the start character position on the document line
  // We'll look for a line in the paragraph that's long enough to contain this span
  for (let i = 0; i < paragraphLines.length; i++) {
    const line = paragraphLines[i];
    // Check if this line is long enough to potentially contain the span
    // We use a simple heuristic: if the line is long enough and the span start is reasonable
    if (line.length >= firstIssue.Span[0] - 1) {
      issueLineInParagraph = i;
      issueLineText = line;
      break;
    }
  }
  
  // If we couldn't find it, use the longest line or first non-empty line as fallback
  if (issueLineInParagraph === -1) {
    let longestLineIndex = 0;
    let maxLength = 0;
    paragraphLines.forEach((line, idx) => {
      if (line.length > maxLength) {
        maxLength = line.length;
        longestLineIndex = idx;
      }
    });
    issueLineInParagraph = longestLineIndex;
    issueLineText = paragraphLines[longestLineIndex] || "";
  }
  
  issuesArray.forEach((issue, index) => {
    // Extract problematic text from the line
    // Clamp the span to the actual line length
    const startChar = Math.max(0, Math.min(issue.Span[0] - 1, issueLineText.length));
    const endChar = Math.min(issue.Span[1], issueLineText.length);
    const problematicText = startChar < endChar 
      ? issueLineText.substring(startChar, endChar)
      : "";
    
    prompt += `
${index + 1}. Rule: ${issue.Check}
   Severity: ${issue.Severity}
   Problem: ${issue.Message}
   Problematic text: "${problematicText}"`;
  });

  // Add additional context if provided
  if (additionalContext && additionalContext.trim()) {
    prompt += `

Additional context from user:
${additionalContext.trim()}`;
  }

  const issueText = issuesArray.length > 1 ? 'all of these issues' : 'this issue';
  prompt += `

Please rewrite the entire paragraph above to fix ${issueText}. Maintain the technical accuracy and meaning, only change what's necessary to address the style/grammar ${issuesArray.length > 1 ? 'issues' : 'issue'}. Return only the corrected paragraph text.`;

  return prompt;
}

module.exports = {
  SYSTEM_PROMPT,
  createFixPrompt,
};

