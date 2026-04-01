---
name: "commit-commands"
description: "Generates well-formatted Git commit messages and assists with version control commands"
version: "1.0.0"
safety_level: "high"
---

# Commit Commands

## Purpose
This skill helps generate well-formatted Git commit messages and provides assistance with version control commands. It ensures consistent commit practices and helps maintain a clean project history.

## Context
Use this skill when committing code changes, writing commit messages, or needing guidance on Git commands. This is particularly valuable for maintaining a clean and informative commit history that helps team members understand changes over time.

## Input Requirements
- Description of changes made
- Type of changes (feature, bug fix, documentation, etc.)
- Files or scope of changes (optional)

## Execution Steps
1. Analyze the changes
   - Determine the type of changes made (feature, bug fix, refactor, etc.)
   - Identify the scope of changes (which modules/components affected)
   - Assess the impact level of changes

2. Apply conventional commit format
   - Use appropriate commit type (feat, fix, docs, style, refactor, test, chore)
   - Write concise, imperative tense commit subject
   - Add detailed description if needed in commit body
   - Include breaking change notices if applicable

3. Generate commit message
   - Create subject line (50 character limit)
   - Add body with detailed explanation if needed (72 character limit per line)
   - Include issue references if applicable
   - Follow project-specific commit conventions

4. Suggest Git commands
   - Recommend appropriate Git commands for the situation
   - Provide command options with explanations
   - Warn about potential issues with certain commands
   - Suggest best practices for the current Git state

5. Verify commit quality
   - Check for clarity and descriptiveness
   - Ensure proper formatting
   - Verify the message explains the "why" behind changes
   - Confirm it follows project standards

6. Provide additional guidance
   - Suggest related Git commands that might be helpful
   - Recommend branching strategies if applicable
   - Offer tips for squashing or amending commits if needed

## Safety Guidelines
- Ensure commit messages don't expose sensitive information
- Avoid including confidential details in commit messages
- Verify that suggested commands are safe to execute
- Warn about potentially destructive Git operations

## Output Format
- Well-formatted Git commit message following conventional standards
- Recommended Git commands with explanations
- Additional version control guidance
- Warnings about potential issues

## Limitations
- Requires accurate description of changes to generate meaningful messages
- Cannot execute Git commands directly (only suggests them)
- Effectiveness depends on quality of change description provided
- May need adjustment based on specific project conventions

## Verification
- Confirm that commit message follows conventional commit format
- Verify that no sensitive information is included
- Ensure the message clearly describes the changes
- Check that suggested commands are appropriate for the situation