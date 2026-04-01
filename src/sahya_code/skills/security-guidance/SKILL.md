---
name: "security-guidance"
description: "Provides security guidance and identifies potential vulnerabilities in code"
version: "1.0.0"
safety_level: "high"
---

# Security Guidance

## Purpose
This skill analyzes code to identify potential security vulnerabilities and provides guidance on secure coding practices. It helps ensure that applications are developed with security best practices in mind.

## Context
Use this skill when reviewing code for security vulnerabilities, during security audits, or when implementing new features that handle sensitive data. This is essential for maintaining secure applications and preventing common security issues.

## Input Requirements
- Code to be analyzed for security issues
- Information about data sensitivity levels
- Application architecture details (optional)

## Execution Steps
1. Identify input sources
   - Locate all external input sources (user input, file uploads, network requests)
   - Identify data flows from external sources to internal systems
   - Map trust boundaries within the application

2. Scan for common vulnerabilities
   - Check for injection vulnerabilities (SQL, command, script)
   - Identify authentication and authorization issues
   - Look for sensitive data exposure
   - Check for security misconfigurations
   - Identify weak cryptographic implementations

3. Analyze authentication and access controls
   - Verify proper authentication mechanisms
   - Check authorization logic for privilege escalation risks
   - Review session management practices
   - Validate secure credential storage

4. Examine data handling practices
   - Verify proper validation of all inputs
   - Check for secure handling of sensitive data
   - Review encryption and hashing implementations
   - Assess secure transmission of data

5. Evaluate error handling
   - Check for information leakage in error messages
   - Verify secure logging practices
   - Review exception handling for security implications

6. Generate security report
   - List identified vulnerabilities with severity ratings
   - Provide specific remediation guidance
   - Suggest preventive measures
   - Recommend security best practices

7. Provide recommendations
   - Suggest security improvements
   - Recommend security libraries or frameworks
   - Advise on security testing approaches
   - Propose security monitoring solutions

## Safety Guidelines
- Ensure that security analysis doesn't expose sensitive information
- Focus on constructive guidance rather than criticism
- Verify that recommendations are practical and implementable
- Maintain confidentiality of code and architecture details

## Output Format
- Executive summary of security posture
- Detailed vulnerability report with severity ratings
- Specific remediation steps for each issue
- Security best practice recommendations
- Priority-ranked list of security improvements

## Limitations
- Automated analysis cannot identify all security issues
- Some vulnerabilities require manual review and understanding of business logic
- Effectiveness depends on code accessibility and quality
- Complex security issues may require expert consultation

## Verification
- Confirm that all identified issues are legitimate security concerns
- Verify that recommendations are practical and appropriate
- Ensure that no sensitive information was inappropriately exposed
- Check that guidance aligns with current security best practices