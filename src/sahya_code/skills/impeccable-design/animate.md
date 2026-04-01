---
name: animate
description: Add purposeful motion and animation to enhance user experience, provide feedback, and create delightful interactions while maintaining performance and accessibility.
---

Add purposeful motion and animation to enhance user experience, provide feedback, and create delightful interactions while maintaining performance and accessibility. Focus on animations that serve functional purposes and enhance usability.

**First**: Use the impeccable-design skill for motion design principles and animation best practices.

## Animation Philosophy

Animations should serve functional purposes and enhance the user experience:

1. **Functional Animation** - Serve:
   - State transitions and changes
   - Spatial relationships and hierarchy
   - Cause and effect relationships
   - Loading and waiting states
   - Success and error feedback
   - Navigation and orientation

2. **Feedback Animation** - Provide:
   - Immediate response to user actions
   - Visual confirmation of interactions
   - Progress indicators for ongoing operations
   - Error states with clear feedback
   - Success celebrations
   - Warning and caution indicators

3. **Guidance Animation** - Offer:
   - Onboarding and tutorial assistance
   - Attention direction to important elements
   - Flow guidance through processes
   - Contextual help and instructions
   - Focus management
   - Orientation in complex interfaces

## Animation Principles

### Performance Standards
- **Maintain 60fps**: All animations should run smoothly
- **Use transform and opacity**: Animate only compositor-friendly properties
- **Avoid layout thrashing**: Don't trigger reflow during animations
- **Optimize duration**: Keep animations short (100-500ms typically)
- **Consider device capability**: Adapt for lower-end hardware

### Accessibility Compliance
- **Respect reduced motion**: Honor user preferences for motion reduction
- **Provide alternatives**: Ensure functionality without animation
- **Maintain performance**: Don't compromise usability for animation
- **Clear communication**: Animations should enhance, not obscure information
- **Focus management**: Maintain keyboard navigation during animations

### Design Quality
- **Purposeful motion**: Every animation should serve a clear purpose
- **Natural easing**: Use appropriate easing functions for realistic motion
- **Consistent timing**: Maintain consistent animation durations and curves
- **Subtle enhancement**: Animation should enhance, not distract
- **Brand alignment**: Motion should reflect brand personality

## Animation Categories

### Micro-interactions
- Button hover and click states
- Form field focus and validation
- Menu opening and closing
- Tooltips and popovers
- Toggle switches and checkboxes
- Loading spinners and progress bars

### State Transitions
- Page transitions and navigation
- Modal and overlay appearances
- Tab and accordion changes
- List item additions/removals
- Filter and sort operations
- Data loading and updates

### Feedback Animations
- Success and error notifications
- Form submission responses
- Action confirmations
- Undo and redo operations
- Drag and drop feedback
- Selection and highlighting

## Implementation Guidelines

### Technical Best Practices
1. **Use CSS for simple animations**: Leverage hardware acceleration
2. **Use JavaScript for complex sequences**: When precise control is needed
3. **Implement FLIP technique**: First, Last, Invert, Play for efficient animations
4. **Use animation libraries wisely**: Leverage tools like Framer Motion or GSAP when appropriate
5. **Optimize for performance**: Profile animations to ensure smoothness

### Animation Timing
- **Instant feedback**: 0-100ms for direct interaction feedback
- **Subtle transitions**: 100-200ms for minor state changes
- **Moderate animations**: 200-400ms for significant transitions
- **Complex sequences**: 400-600ms for multi-step animations
- **Loading indicators**: Continuous until operation completes

### Easing Functions
- **Ease-out**: For elements entering the screen
- **Ease-in**: For elements leaving the screen
- **Ease-in-out**: For symmetric movements
- **Custom curves**: For brand-specific motion personalities
- **Avoid bounce/elastic**: These feel dated and unprofessional

## Animation Audit Process

### Current State Assessment
1. **Identify missing feedback**: Where do interactions lack visual response?
2. **Evaluate existing animations**: Are current animations purposeful and effective?
3. **Check performance**: Do animations run smoothly on all devices?
4. **Verify accessibility**: Do animations respect user preferences?

### Implementation Planning
1. **Prioritize high-impact areas**: Focus on most important interactions first
2. **Design motion specifications**: Define timing, easing, and behavior
3. **Consider accessibility**: Plan for reduced motion scenarios
4. **Test performance**: Ensure animations don't degrade experience

### Quality Assurance
1. **Performance testing**: Verify 60fps on target devices
2. **Accessibility verification**: Test with reduced motion enabled
3. **User feedback**: Validate that animations enhance experience
4. **Cross-browser testing**: Ensure consistent behavior

## Motion Design System

### Animation Tokens
- **Duration scales**: fast, medium, slow for consistent timing
- **Easing curves**: standard, entrance, exit for different contexts
- **Animation states**: idle, active, disabled for different conditions
- **Motion preferences**: standard, reduced for accessibility

### Animation Components
- **Fade transitions**: For opacity changes
- **Slide transitions**: For positional changes
- **Scale transitions**: For size changes
- **Staggered animations**: For sequential element animation
- **Spring animations**: For natural, bouncy motion

## Documentation Requirements

Record animation implementations:
- **Purpose**: Why this animation exists and what it accomplishes
- **Specifications**: Duration, easing, and behavior details
- **Accessibility**: How it behaves with reduced motion
- **Performance**: Testing results and optimization notes
- **Usage guidelines**: When and how to use this animation

**CRITICAL**: Every animation should serve a functional purpose. Avoid decorative animations that don't enhance the user experience or provide meaningful feedback.