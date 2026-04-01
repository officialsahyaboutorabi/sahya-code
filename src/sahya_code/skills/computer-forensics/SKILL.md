---
name: "computer-forensics"
description: "Digital forensics analysis and investigation capabilities for security incidents"
version: "1.0.0"
safety_level: "high"
---

# Computer Forensics

## Purpose
This skill provides digital forensics analysis and investigation capabilities for security incidents. It enables proper handling of digital evidence following forensic procedures to support incident response and legal proceedings.

## Context
Use this skill when investigating security incidents, analyzing potential data breaches, examining suspicious system activities, or collecting digital evidence. This is essential for understanding attack vectors, determining scope of compromise, and supporting legal actions when necessary.

## Input Requirements
- Incident details or suspicious activity reports
- Access to affected systems (when possible)
- Timeline of events
- Scope of investigation

## Execution Steps
1. Secure the scene
   - Isolate affected systems to preserve evidence
   - Document initial state of systems
   - Establish chain of custody procedures
   - Take forensic images when possible

2. Collect evidence
   - Gather volatile data (memory, network connections)
   - Create bit-for-bit copies of storage media
   - Document system configurations
   - Preserve log files and event records

3. Preserve integrity
   - Calculate hash values for evidence validation
   - Secure evidence in tamper-evident storage
   - Maintain detailed documentation of all actions
   - Follow established forensic procedures

4. Analyze evidence
   - Examine file systems for signs of tampering
   - Analyze network traffic logs
   - Review system logs and event records
   - Identify indicators of compromise (IOCs)

5. Reconstruct events
   - Determine sequence of malicious activities
   - Identify attack vectors and methods
   - Assess scope and impact of compromise
   - Document findings systematically

6. Report findings
   - Create detailed forensic report
   - Document evidence with proper attribution
   - Provide technical analysis of attack methods
   - Include recommendations for remediation

7. Support remediation
   - Advise on containment measures
   - Recommend recovery procedures
   - Suggest security improvements to prevent recurrence

## Safety Guidelines
- Follow established forensic procedures to maintain evidence integrity
- Ensure all actions are legally authorized
- Protect privacy of individuals during investigation
- Maintain confidentiality of investigation details
- Preserve evidence for potential legal proceedings
- Avoid altering evidence during analysis

## Output Format
- Forensic investigation report with findings
- Chain of custody documentation
- Technical analysis of attack methods
- Indicators of compromise (IOCs)
- Recommendations for remediation and prevention
- Evidence inventory with hash values

## Limitations
- Requires proper authorization before accessing systems
- Effectiveness depends on preservation of evidence
- May require specialized forensic tools and expertise
- Legal admissibility depends on proper procedure adherence
- Some evidence may be destroyed by attackers

## Verification
- Confirm that forensic procedures were followed correctly
- Verify that evidence integrity was maintained
- Ensure chain of custody is properly documented
- Check that privacy requirements were maintained
- Validate that findings are technically accurate