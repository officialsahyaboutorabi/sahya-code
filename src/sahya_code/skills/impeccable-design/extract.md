---
name: extract
description: Identify and extract reusable components, patterns, and modules from existing code. Create modular, maintainable, and scalable design systems from current implementations.
---

Identify and extract reusable components, patterns, and modules from existing code. Create modular, maintainable, and scalable design systems from current implementations. Transform ad-hoc implementations into systematic, reusable solutions.

**First**: Use the impeccable-design skill for design system principles and component-based architecture.

## Extraction Framework

Systematic approach to identifying and creating reusable elements:

1. **Component Identification** - Discover:
   - Visually similar elements across the interface
   - Functionally equivalent interactive elements
   - Repetitive structural patterns
   - Common layout sections
   - Shared styling patterns
   - Recurring functional modules

2. **Pattern Recognition** - Identify:
   - Consistent spacing and sizing relationships
   - Repeated color and typography combinations
   - Common interaction behaviors
   - Standardized form elements
   - Consistent navigation patterns
   - Shared animation sequences

3. **Modularity Assessment** - Evaluate:
   - Independence of components from context
   - Flexibility for different use cases
   - Configurability through props or parameters
   - Composability with other components
   - Extensibility for future needs
   - Testability of individual parts

4. **System Integration** - Plan:
   - Naming conventions for extracted elements
   - Folder structure and organization
   - Dependency relationships
   - Documentation requirements
   - Testing strategies
   - Migration paths for existing code

## Extraction Process

### Discovery Phase
1. **Audit existing interface**: Catalog all current components and patterns
2. **Identify repetition**: Find similar elements across different sections
3. **Group related elements**: Organize by function, appearance, or behavior
4. **Assess reuse potential**: Evaluate how often elements might be reused
5. **Prioritize extraction candidates**: Focus on highest-impact opportunities

### Analysis Phase
1. **Compare variations**: Document differences between similar elements
2. **Identify core functionality**: Determine essential features of each component
3. **Define configuration options**: Plan for flexibility and customization
4. **Map dependencies**: Understand relationships between elements
5. **Plan interface contracts**: Define how components will interact

### Extraction Phase
1. **Create component structure**: Build the foundational component
2. **Implement core functionality**: Add essential features first
3. **Add configuration options**: Enable flexibility for different uses
4. **Apply consistent styling**: Use design tokens and system patterns
5. **Document usage patterns**: Create clear guidance for implementation

## Component Categories

### Atomic Components
- **Buttons**: Primary, secondary, tertiary, icon, text buttons
- **Inputs**: Text fields, text areas, selects, checkboxes, radio buttons
- **Typography**: Headings, paragraphs, labels, captions, links
- **Media**: Images, icons, avatars, placeholders
- **Navigation**: Breadcrumbs, pagination, tabs, steps

### Molecule Components
- **Input groups**: Field + label + validation + helper text
- **Card elements**: Content containers with header, body, footer
- **List items**: Interactive list elements with various content types
- **Form sections**: Groups of related form elements
- **Navigation items**: Menu items with icons, badges, indicators

### Organism Components
- **Headers and footers**: Complex navigation and branding elements
- **Sidebars**: Navigation and supplementary content areas
- **Modals and dialogs**: Complex interactive overlays
- **Dashboards**: Layouts with multiple content sections
- **Forms**: Complete multi-field data entry experiences

### Template Components
- **Page layouts**: Structural frameworks for different page types
- **Grid systems**: Flexible layout containers
- **Responsive containers**: Adaptable content areas
- **Application shells**: Overall application structure

## Quality Standards

Verify that extracted components:
- **Are truly reusable**: Used in multiple places or likely to be
- **Maintain consistency**: Follow design system principles
- **Remain flexible**: Configurable for different use cases
- **Stay maintainable**: Easy to update and modify
- **Perform well**: Don't introduce performance issues
- **Remain accessible**: Meet accessibility standards
- **Include proper documentation**: Clear usage guidelines

## Implementation Guidelines

### Component Architecture
1. **Single responsibility**: Each component should have one clear purpose
2. **Prop-based configuration**: Use props for customization
3. **Composition over inheritance**: Build complex components from simpler ones
4. **Consistent interfaces**: Similar components should have similar APIs
5. **Default configurations**: Provide sensible defaults for common use cases

### Naming Conventions
- **Descriptive names**: Clearly indicate component purpose
- **Consistent patterns**: Follow established naming conventions
- **Semantic meaning**: Names should reflect component function
- **Scalable structure**: Names should work as component library grows

### Documentation Requirements
- **Props interface**: Complete documentation of all configurable options
- **Usage examples**: Clear examples of common use cases
- **Best practices**: Guidelines for proper implementation
- **Accessibility notes**: Information about accessibility features
- **Performance considerations**: Any performance implications

## Testing Strategy

### Component Testing
- **Unit tests**: Test individual component functionality
- **Integration tests**: Verify component interactions
- **Visual regression**: Catch unintended visual changes
- **Accessibility tests**: Ensure components meet accessibility standards
- **Performance tests**: Verify components don't impact performance

### System Testing
- **Consistency verification**: Ensure components work together
- **Theming compatibility**: Test components with different themes
- **Responsive behavior**: Verify components work across devices
- **Cross-browser compatibility**: Test in different browsers

## Migration Considerations

### Refactoring Strategy
1. **Identify replacement points**: Where existing code will use new components
2. **Plan migration path**: Order and approach for replacing existing code
3. **Maintain backward compatibility**: Where possible, support both systems
4. **Test thoroughly**: Ensure functionality remains intact
5. **Update documentation**: Reflect new component usage

### Risk Management
- **Functionality preservation**: Ensure extracted components work identically
- **Performance maintenance**: Don't introduce performance regressions
- **Breaking change mitigation**: Plan for any necessary breaking changes
- **Team adoption**: Ensure team members can effectively use new components

## Documentation Standards

Record extraction activities:
- **Components extracted**: What was identified and extracted
- **Rationale**: Why these elements were chosen for extraction
- **Architecture decisions**: How components were structured
- **Usage guidelines**: How to properly implement extracted components
- **Migration plan**: How to transition existing code
- **Testing results**: Verification that extraction maintains functionality

**CRITICAL**: Extraction should improve maintainability and consistency without breaking existing functionality. Every extracted component should be more valuable as a reusable element than as scattered implementations.