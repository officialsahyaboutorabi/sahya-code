---
name: "secure-data-handling"
description: "Secure handling of sensitive data in AI/ML applications to prevent information leakage"
version: "1.0.0"
safety_level: "high"
---

# Secure Data Handling

## Purpose
This skill provides guidelines and tools for secure handling of sensitive data in AI/ML applications to prevent information leakage. It ensures that sensitive information is properly protected throughout the data lifecycle in machine learning workflows.

## Context
Use this skill when working with sensitive datasets, training models on confidential data, or deploying AI/ML applications that handle personal or proprietary information. This is essential for maintaining data privacy and preventing unauthorized disclosure of sensitive information.

## Input Requirements
- Dataset or data source to be handled securely
- Sensitivity classification of the data
- Compliance requirements (GDPR, HIPAA, etc.) if applicable
- Data processing requirements and constraints

## Execution Steps
1. Classify data sensitivity
   - Identify personally identifiable information (PII)
   - Determine regulatory compliance requirements
   - Assess potential impact of data exposure
   - Label data according to sensitivity levels

2. Apply data minimization
   - Remove unnecessary sensitive fields
   - Limit data collection to essential elements only
   - Apply purpose limitation principles
   - Retain data only as long as necessary

3. Implement access controls
   - Apply principle of least privilege
   - Use role-based access controls
   - Implement audit logging for data access
   - Ensure secure authentication mechanisms

4. Apply data protection measures
   - Encrypt data at rest and in transit
   - Use tokenization for sensitive fields
   - Apply differential privacy techniques when possible
   - Implement secure data masking

5. Secure data processing
   - Use secure computing environments
   - Apply federated learning when appropriate
   - Implement secure multi-party computation if needed
   - Ensure secure model training procedures

6. Monitor for data leakage
   - Implement data loss prevention measures
   - Monitor for unusual data access patterns
   - Apply anomaly detection for potential leaks
   - Set up alerts for sensitive data exposure

7. Document security measures
   - Record applied security controls
   - Document data flow and handling procedures
   - Maintain compliance records
   - Log security-relevant decisions

## Safety Guidelines
- Never process sensitive data without proper security measures
- Ensure all team members understand data sensitivity levels
- Verify that data handling complies with applicable regulations
- Protect against model inversion and membership inference attacks
- Implement proper sanitization of outputs to prevent data leakage
- Ensure secure deletion of sensitive data when retention period ends

## Output Format
- Securely processed dataset or model
- Documentation of applied security measures
- Compliance verification report
- Recommendations for ongoing security maintenance

## Limitations
- Effectiveness depends on proper implementation of security measures
- Some privacy-preserving techniques may impact model performance
- Requires ongoing maintenance of security controls
- May have performance implications for processing speed

## Verification
- Confirm that sensitive data cannot be reconstructed from outputs
- Verify that all access controls are properly enforced
- Ensure compliance with relevant regulations
- Test that security measures don't compromise intended functionality
- Validate that data minimization was properly applied