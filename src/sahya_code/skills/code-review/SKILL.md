---
name: "code-review"
description: "Performs automated code reviews with multiple specialized agents"
version: "1.0.0"
safety_level: "high"
---

# Code Review

## Purpose
This skill performs automated code reviews using multiple specialized agents to audit code from different perspectives. It helps maintain code quality, identify potential issues, and ensure adherence to best practices.

## Context
Use this skill when reviewing code changes, pull requests, or new implementations. This is particularly valuable for maintaining consistent quality standards across projects and identifying potential issues before they reach production.

## Input Requirements
- Code to be reviewed
- Project guidelines or standards (optional)
- Specific focus areas for review (optional)

## Execution Steps
1. Initialize review agents
   - Compliance checker: Verifies adherence to coding standards
   - Bug detector: Identifies potential bugs and issues
   - Performance analyzer: Reviews for performance considerations
   - Security scanner: Checks for potential security vulnerabilities

2. Analyze the code
   - Parse and understand code structure
   - Identify key components and relationships
   - Compare against established patterns and practices

3. Apply compliance checks
   - Verify adherence to project guidelines
   - Check for consistent naming conventions
   - Validate code structure and organization

4. Detect potential issues
   - Identify common bug patterns
   - Flag performance anti-patterns
   - Highlight security concerns
   - Point out maintainability issues

5. Generate review report
   - Summarize findings by severity
   - Provide specific recommendations
   - Include relevant code snippets for context
   - Rate confidence in each finding

6. Present feedback
   - Organize feedback in a clear, actionable format
   - Prioritize issues by importance
   - Suggest specific improvements
   - Provide educational context where appropriate

## Safety Guidelines
- Ensure feedback is constructive and respectful
- Focus on code quality rather than personal criticism
- Verify that security scanning doesn't expose sensitive information
- Maintain confidentiality of proprietary code

## Output Format
- Executive summary of review findings
- Detailed issues organized by category and severity
- Specific code recommendations with examples
- Confidence ratings for each finding
- Overall code quality assessment

## Limitations
- Automated review cannot replace human judgment
- May produce false positives that require manual verification
- Effectiveness depends on quality of guidelines provided
- Complex domain-specific issues may require expert review

## Verification
- Confirm that all identified issues are legitimate
- Verify that recommendations are practical and applicable
- Ensure feedback is clear and actionable
- Check that no sensitive information was inappropriately exposed