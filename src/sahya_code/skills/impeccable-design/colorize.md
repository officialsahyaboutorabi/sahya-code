---
name: colorize
description: Introduce strategic color to enhance visual hierarchy, brand identity, accessibility, and user experience while maintaining aesthetic coherence and proper contrast.
---

Introduce strategic color to enhance visual hierarchy, brand identity, accessibility, and user experience while maintaining aesthetic coherence and proper contrast. Apply color thoughtfully to create visual interest and guide user attention effectively.

**First**: Use the impeccable-design skill for color principles and contrast standards.

## Color Strategy Framework

Strategic approach to color implementation:

1. **Brand Identity** - Express:
   - Core brand personality through color choices
   - Emotional connection with target audience
   - Differentiation from competitors
   - Consistency with brand guidelines
   - Cultural appropriateness for target markets
   - Memorable visual identity

2. **Visual Hierarchy** - Establish:
   - Clear primary and secondary color roles
   - Attention-grabbing accent colors
   - Supporting neutral palette
   - Color-based information architecture
   - Sequential and diverging color schemes
   - Contextual color meanings

3. **Accessibility** - Ensure:
   - Minimum 4.5:1 contrast ratio for normal text
   - Minimum 3:1 contrast ratio for large text
   - Color-blind friendly palettes
   - Meaning conveyed without color alone
   - Dark mode compatibility
   - High contrast mode support

4. **Aesthetic Coherence** - Maintain:
   - Harmonious color relationships
   - Consistent saturation and brightness levels
   - Balanced color distribution
   - Tinted neutral palettes
   - Seasonal or thematic variations
   - Cultural sensitivity in color choices

## Color Implementation Process

### Palette Development
1. **Primary colors**: Define main brand colors with multiple shades
2. **Secondary colors**: Establish supporting color roles
3. **Neutral palette**: Create comprehensive grayscale with tinted variants
4. **Accent colors**: Design attention-grabbing accent options
5. **Functional colors**: Assign semantic colors for status, warnings, etc.
6. **Dark mode variants**: Develop appropriate dark theme colors

### Color Application Strategy
1. **Background colors**: Establish base canvas colors
2. **Text colors**: Define primary, secondary, and disabled text
3. **Interactive elements**: Specify button, link, and control colors
4. **Status indicators**: Assign colors for success, warning, error, info
5. **Data visualization**: Create color schemes for charts and graphs
6. **Decorative elements**: Apply accent colors for visual interest

## Modern Color Techniques

### OKLCH Color Space
- **Perceptually uniform**: Equal numeric differences equal perceived differences
- **Wide gamut support**: Access to full display P3 and Rec.2020 color spaces
- **Precise control**: Independent adjustment of lightness, chroma, and hue
- **Consistent tints**: Tinted grays that match your brand hue

### Dynamic Color Systems
- **CSS color-mix()**: Blend colors dynamically
- **light-dark()**: Automatic light/dark mode switching
- **CSS custom properties**: Maintainable color tokens
- **Generated scales**: Algorithmically created color ramps

### Accessibility-First Approach
- **Contrast checking**: Verify all color combinations meet standards
- **Color blindness simulation**: Test palettes with various deficiencies
- **Pattern backup**: Ensure meaning without color alone
- **Focus indicator visibility**: Guarantee accessible focus states

## Color Psychology Considerations

### Emotional Impact
- **Warm colors**: Energy, passion, urgency (reds, oranges, yellows)
- **Cool colors**: Calm, trust, professionalism (blues, greens, purples)
- **Neutral colors**: Balance, sophistication, readability (grays, beiges)
- **Bright colors**: Attention, youthfulness, playfulness
- **Muted colors**: Sophistication, elegance, subtlety

### Cultural Significance
- **Regional preferences**: Adapt to cultural color associations
- **Industry norms**: Consider sector-specific color expectations
- **Demographic factors**: Account for age and gender preferences
- **Contextual appropriateness**: Match color to application purpose

## Quality Standards

Verify that colorization:
- **Maintains accessibility**: All color combinations meet contrast standards
- **Preserves readability**: Text remains legible in all contexts
- **Enhances hierarchy**: Color guides attention appropriately
- **Aligns with brand**: Colors reinforce brand identity
- **Works in all modes**: Functions in light, dark, and high contrast modes
- **Performs well**: Colors render correctly across devices and browsers

## Implementation Guidelines

### Color Token System
```css
/* Example token structure */
:root {
  /* Primary palette */
  --color-primary: oklch(47.8% 0.175 280.6);
  --color-primary-light: oklch(67.8% 0.175 280.6);
  --color-primary-dark: oklch(27.8% 0.175 280.6);
  
  /* Neutral palette with brand tint */
  --color-gray-50: oklch(98% 0.005 280.6);
  --color-gray-900: oklch(20% 0.005 280.6);
  
  /* Functional colors */
  --color-success: oklch(48.26% 0.122 160);
  --color-warning: oklch(81.87% 0.125 80.74);
  --color-error: oklch(57.32% 0.168 27.34);
}
```

### Dark Mode Considerations
- **Not just inverted**: Colors need different treatment in dark contexts
- **Reduced saturation**: Lower saturation in dark mode reduces eye strain
- **Higher contrast**: Sometimes need higher contrast in dark mode
- **Ambient light awareness**: Consider typical dark mode lighting conditions

## Testing Requirements

### Accessibility Testing
- **Contrast verification**: All text/background combinations
- **Color blindness simulation**: Protanopia, deuteranopia, tritanopia
- **Grayscale validation**: Ensure meaning without color
- **Focus state visibility**: All interactive elements clearly indicated

### Cross-Environment Testing
- **Various displays**: Different monitor types and quality levels
- **Lighting conditions**: Bright sun, dim rooms, nighttime use
- **Age considerations**: Vision changes with age
- **Device types**: Desktop, tablet, mobile with varying capabilities

## Documentation Standards

Record color implementations:
- **Palette rationale**: Why specific colors were chosen
- **Usage guidelines**: When and how to apply each color
- **Accessibility compliance**: Contrast ratios and testing results
- **Dark mode variants**: How colors adapt to different themes
- **Brand alignment**: Connection to overall brand identity
- **Cultural considerations**: Any cultural adaptations made

**CRITICAL**: Color should enhance usability and accessibility, not hinder it. Every color choice should serve a functional purpose while reinforcing the brand identity.