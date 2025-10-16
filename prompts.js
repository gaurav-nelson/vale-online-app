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
 * Creates a prompt for fixing a Vale issue
 * @param {string} paragraph - The full paragraph containing the issue
 * @param {object} issue - The Vale issue object with Check, Message, Line, Span, Severity
 * @param {string} problematicText - The specific text that has the issue
 * @param {string} additionalContext - Optional additional context from the user
 * @returns {string} - The complete prompt for the AI
 */
function createFixPrompt(paragraph, issue, problematicText, additionalContext = '') {
  let prompt = `${SYSTEM_PROMPT}

Context paragraph:
"""
${paragraph}
"""

Issue to fix:
- Rule: ${issue.Check}
- Severity: ${issue.Severity}
- Problem: ${issue.Message}
- Problematic text: "${problematicText}"`;

  // Add additional context if provided
  if (additionalContext && additionalContext.trim()) {
    prompt += `

Additional context from user:
${additionalContext.trim()}`;
  }

  prompt += `

Please rewrite the entire paragraph above to fix this issue. Maintain the technical accuracy and meaning, only change what's necessary to address the style/grammar issue. Return only the corrected paragraph text.`;

  return prompt;
}

module.exports = {
  SYSTEM_PROMPT,
  createFixPrompt,
};

