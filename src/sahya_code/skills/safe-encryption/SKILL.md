---
name: "safe-encryption"
description: "Provides secure encryption methods for sensitive data with post-quantum support"
version: "1.0.0"
safety_level: "high"
---

# Safe Encryption

## Purpose
This skill provides secure encryption methods for protecting sensitive data, with support for post-quantum algorithms and composable authentication. It helps prevent information leakage by ensuring data is properly encrypted both in transit and at rest.

## Context
Use this skill when handling sensitive data that requires strong encryption, when implementing secure communication between agents, or when storing confidential information. This is essential for maintaining data privacy and preventing unauthorized access.

## Input Requirements
- Data to be encrypted or decrypted
- Encryption algorithm preference (optional)
- Key management information (when applicable)
- Sensitivity level of the data

## Execution Steps
1. Assess data sensitivity
   - Determine the classification level of the data
   - Identify applicable compliance requirements
   - Select appropriate encryption strength based on sensitivity

2. Choose encryption method
   - Select post-quantum resistant algorithm when available
   - Consider performance vs security trade-offs
   - Verify algorithm is not deprecated or compromised

3. Generate or obtain encryption keys
   - Use cryptographically secure random number generation
   - Follow proper key derivation procedures
   - Ensure keys are of appropriate length and entropy

4. Apply encryption
   - Use authenticated encryption to prevent tampering
   - Implement proper initialization vector handling
   - Apply padding schemes securely when needed

5. Manage keys securely
   - Store keys separately from encrypted data
   - Use hardware security modules when available
   - Implement proper key rotation procedures

6. Verify encryption integrity
   - Confirm data can be properly decrypted
   - Validate authentication tags
   - Test recovery procedures

7. Document encryption parameters
   - Record algorithm used
   - Note key identifiers (not keys themselves)
   - Log security-relevant metadata

## Safety Guidelines
- Never log or store encryption keys in plaintext
- Ensure proper separation between keys and encrypted data
- Verify that encryption libraries are up-to-date and not vulnerable
- Protect against side-channel attacks during encryption operations
- Follow zero-knowledge principles when handling sensitive data

## Output Format
- Encrypted data in appropriate format
- Metadata about encryption method used
- Verification of successful encryption
- Recommendations for key management

## Limitations
- Requires secure key management infrastructure
- Performance impact may vary based on algorithm choice
- Post-quantum algorithms may have different performance characteristics
- Proper implementation requires cryptographic expertise

## Verification
- Confirm that original data cannot be recovered without proper keys
- Verify that authentication prevents tampering
- Ensure no sensitive information is leaked during encryption process
- Test decryption process to confirm data integrity