---
name: "threat-hunting"
description: "Proactively hunts for threats using detection rules and behavioral analysis"
version: "1.0.0"
safety_level: "high"
---

# Threat Hunting

## Purpose
This skill enables proactive threat hunting capabilities to identify potential security threats and anomalies in systems before they result in security incidents. It uses detection rules and behavioral analysis to find indicators of compromise.

## Context
Use this skill when conducting proactive security assessments, investigating suspicious activities, performing security monitoring, or analyzing system logs for potential threats. This is essential for maintaining security posture and identifying advanced persistent threats.

## Input Requirements
- System logs or event data to analyze
- Known threat indicators or IOCs (optional)
- Baseline behavior patterns (optional)
- Detection rules or sigma rules (optional)

## Execution Steps
1. Gather data sources
   - Collect relevant logs and event data
   - Identify appropriate data sources for the hunt
   - Ensure data quality and completeness

2. Establish baseline
   - Understand normal system behavior
   - Identify typical patterns and activities
   - Document expected system interactions

3. Apply detection rules
   - Use sigma rules or other detection patterns
   - Apply behavioral analysis techniques
   - Leverage threat intelligence feeds

4. Analyze anomalies
   - Identify deviations from baseline behavior
   - Correlate multiple events or indicators
   - Prioritize findings based on risk level

5. Investigate findings
   - Drill down into suspicious activities
   - Validate potential threats
   - Determine false positive likelihood

6. Document results
   - Record findings with appropriate detail
   - Note false positives for future reference
   - Update detection rules based on findings

7. Recommend actions
   - Suggest containment measures if threats found
   - Propose additional monitoring for suspicious activities
   - Advise on prevention measures

## Safety Guidelines
- Ensure privacy compliance when analyzing data
- Protect sensitive information during analysis
- Verify that hunting activities don't impact system performance
- Follow proper incident response procedures when threats are found
- Maintain chain of custody for forensic purposes

## Output Format
- Summary of threat hunting activities performed
- List of identified anomalies or potential threats
- Risk assessment for each finding
- Recommended actions for confirmed threats
- Suggestions for improving detection rules

## Limitations
- Effectiveness depends on quality and completeness of data sources
- Requires knowledge of normal system behavior for accurate baselines
- May generate false positives requiring manual review
- Limited by the sophistication of detection rules used

## Verification
- Confirm that hunting activities don't negatively impact system performance
- Verify that privacy requirements are maintained during analysis
- Ensure that detection rules are properly validated
- Check that findings are accurately documented and classified