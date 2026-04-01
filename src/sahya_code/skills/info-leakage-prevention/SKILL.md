---
name: "info-leakage-prevention"
description: "Prevents information leakage in AI/ML applications through secure practices and monitoring"
version: "1.0.0"
safety_level: "high"
---

# Information Leakage Prevention

## Purpose
This skill prevents information leakage in AI/ML applications by implementing secure practices and monitoring for potential data exposure. It helps identify and mitigate risks that could lead to unauthorized disclosure of sensitive information.

## Context
Use this skill when developing, training, or deploying AI/ML models that handle sensitive data, when working with confidential datasets, or when concerned about privacy risks in machine learning workflows. This is critical for maintaining data privacy and preventing model-based data extraction attacks.

## Input Requirements
- AI/ML model or system to assess for leakage risks
- Training or operational data used by the system
- Sensitivity classification of data involved
- Privacy requirements and compliance obligations

## Execution Steps
1. Assess model architecture for leakage risks
   - Identify potential privacy vulnerabilities
   - Evaluate model memorization tendencies
   - Assess susceptibility to inference attacks
   - Review model output generation patterns

2. Analyze training data for sensitive information
   - Identify personally identifiable information (PII)
   - Detect confidential or proprietary data
   - Assess data anonymization quality
   - Evaluate re-identification risks

3. Implement privacy-preserving techniques
   - Apply differential privacy during training
   - Use secure multi-party computation when appropriate
   - Implement federated learning approaches
   - Apply model distillation to reduce memorization

4. Set up monitoring systems
   - Monitor for unusual data access patterns
   - Implement anomaly detection for potential leaks
   - Set up alerts for suspicious model behavior
   - Track data flow throughout the system

5. Conduct privacy risk assessment
   - Perform membership inference attack testing
   - Test for model inversion vulnerabilities
   - Assess model stealing risks
   - Evaluate property inference attack potential

6. Apply mitigation measures
   - Implement output filtering for sensitive data
   - Add noise to prevent reconstruction attacks
   - Apply model watermarking for ownership protection
   - Set up access rate limiting

7. Document and report findings
   - Record identified risks and mitigations
   - Document privacy controls implemented
   - Create privacy impact assessment
   - Establish ongoing monitoring procedures

## Safety Guidelines
- Ensure all privacy-preserving measures are properly validated
- Verify that mitigation techniques don't compromise model utility
- Protect against adversarial attacks designed to extract data
- Implement proper access controls to prevent unauthorized access
- Maintain audit logs for privacy compliance
- Regularly reassess privacy risks as models evolve

## Output Format
- Privacy risk assessment report
- List of identified vulnerabilities and recommended mitigations
- Implementation guide for privacy controls
- Monitoring dashboard for ongoing privacy assurance
- Compliance documentation

## Limitations
- Privacy-preserving techniques may impact model performance
- Some attacks may not be detectable with current methods
- Effectiveness depends on proper implementation of controls
- Advanced adversaries may develop new attack methods
- Trade-offs may exist between privacy and utility

## Verification
- Confirm that privacy controls are properly implemented
- Verify that model outputs don't contain sensitive information
- Test resistance to known privacy attacks
- Ensure compliance with privacy regulations
- Validate that model utility remains acceptable after applying controls