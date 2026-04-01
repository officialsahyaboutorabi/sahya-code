---
name: normalize
description: Align interface with design system standards, consistent patterns, and best practices. Ensures visual and functional consistency across the application.
---

Align the interface with design system standards, consistent patterns, and best practices. Ensure visual and functional consistency across the application while maintaining the intended aesthetic direction.

**First**: Use the impeccable-design skill for design principles and aesthetic direction.

## Normalization Process

Apply systematic improvements across multiple dimensions:

1. **Design Token Consistency** - Standardize:
   - Spacing tokens (use consistent increments like 4px, 8px, 12px, 16px, etc.)
   - Color palette (map to design system tokens)
   - Typography scale (use consistent type hierarchy)
   - Border radius values (standardize corner treatments)
   - Shadow tokens (consistent elevation treatments)
   - Opacity values (use standardized transparency levels)

2. **Component Patterns** - Align:
   - Button styles and hierarchy (primary, secondary, tertiary, etc.)
   - Form elements (inputs, selects, checkboxes, radios)
   - Card and container treatments
   - Navigation patterns (headers, footers, sidebars)
   - Modal and overlay behaviors
   - Loading and empty states

3. **Accessibility Standards** - Ensure:
   - Proper contrast ratios (minimum 4.5:1 for normal text)
   - Semantic HTML structure
   - Keyboard navigation support
   - ARIA attributes where needed
   - Focus indicators
   - Screen reader compatibility

4. **Responsive Behavior** - Verify:
   - Consistent breakpoint usage
   - Proper container queries where applicable
   - Touch target sizing (minimum 44px)
   - Text scalability
   - Viewport awareness

5. **Performance Optimization** - Apply:
   - Efficient CSS (avoid redundant selectors)
   - Proper image optimization
   - Animation performance best practices
   - Resource loading strategies

## Implementation Strategy

### Audit Current State
1. Catalog existing patterns and inconsistencies
2. Identify which elements follow design system vs. custom implementations
3. Note areas where standards are missing or unclear

### Apply Systematic Changes
1. **Replace hardcoded values** with design tokens
2. **Standardize component implementations** to use consistent patterns
3. **Update accessibility features** to meet standards
4. **Optimize performance** where possible
5. **Ensure responsive behavior** follows system patterns

### Verification Steps
1. **Visual consistency check** - Do elements feel cohesive?
2. **Accessibility audit** - Do all elements meet standards?
3. **Performance verification** - Are there any regressions?
4. **Responsive testing** - Do patterns work across devices?

## Before and After Documentation

Document changes made:
- **What was inconsistent**: Specific examples of previous state
- **What was applied**: Which standards were implemented
- **Why the change**: Justification for normalization
- **Impact assessment**: How this improves the experience

## Quality Assurance

Verify that normalization:
- **Maintains aesthetic integrity**: Doesn't sacrifice design vision
- **Improves consistency**: Creates predictable experiences
- **Enhances accessibility**: Makes interface more usable
- **Reduces maintenance**: Simplifies future updates
- **Follows best practices**: Implements industry standards

**CRITICAL**: Preserve the intended aesthetic direction while applying systematic improvements. Normalization should enhance, not diminish, the design's distinctive qualities.