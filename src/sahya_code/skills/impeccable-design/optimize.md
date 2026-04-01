---
name: optimize
description: Identify and implement performance improvements across loading speed, rendering efficiency, resource utilization, and user experience responsiveness.
---

Identify and implement performance improvements across loading speed, rendering efficiency, resource utilization, and user experience responsiveness. Optimize for both technical performance metrics and perceived performance.

**First**: Use the impeccable-design skill for performance considerations and efficient implementation principles.

## Performance Audit Framework

Comprehensive analysis across performance dimensions:

1. **Loading Performance** - Measure and improve:
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)
   - Time to Interactive (TTI)
   - Resource loading strategies

2. **Runtime Performance** - Optimize:
   - JavaScript execution efficiency
   - Rendering and repaint cycles
   - Memory usage and garbage collection
   - Animation performance (maintain 60fps)
   - Event handling and responsiveness
   - CPU usage during interactions

3. **Resource Optimization** - Enhance:
   - Image compression and format selection
   - Code splitting and lazy loading
   - Bundle size reduction
   - Caching strategies
   - Third-party script optimization
   - Font loading and rendering

4. **Network Efficiency** - Improve:
   - HTTP request minimization
   - Compression and minification
   - CDN utilization
   - Prefetch and preload strategies
   - API call optimization
   - Offline capability where appropriate

## Optimization Strategies

### Asset Optimization
1. **Images**: 
   - Use modern formats (WebP, AVIF)
   - Implement proper sizing and resolution
   - Add lazy loading for below-fold content
   - Use responsive images with srcset
   - Compress without quality loss

2. **JavaScript**:
   - Code splitting for route-based chunks
   - Tree shaking to remove unused code
   - Bundle analysis to identify bloat
   - Optimize third-party library usage
   - Defer non-critical scripts

3. **CSS**:
   - Remove unused styles
   - Optimize critical CSS delivery
   - Use efficient selectors
   - Implement CSS containment
   - Minimize complex animations

### Rendering Optimization
1. **Layout Performance**:
   - Avoid forced synchronous layouts
   - Use transform and opacity for animations
   - Implement virtual scrolling for large lists
   - Use CSS containment properties
   - Minimize DOM manipulation

2. **Paint Performance**:
   - Reduce paint areas
   - Use will-change property appropriately
   - Implement layer composition
   - Optimize clip paths and masks
   - Minimize complex CSS filters

### User Experience Optimization
1. **Perceived Performance**:
   - Implement skeleton screens
   - Use progressive loading
   - Optimize above-the-fold content
   - Provide loading feedback
   - Implement smart prefetching

2. **Interaction Responsiveness**:
   - Optimize event handler performance
   - Use requestAnimationFrame for animations
   - Implement debouncing and throttling
   - Prioritize user input processing
   - Optimize scroll performance

## Implementation Process

### Performance Baseline
1. **Measure current metrics**: Establish baseline performance scores
2. **Identify bottlenecks**: Use profiling tools to find issues
3. **Prioritize fixes**: Focus on highest impact improvements
4. **Set targets**: Define acceptable performance thresholds

### Optimization Execution
1. **Low-hanging fruit**: Address easiest wins first
2. **High-impact changes**: Tackle biggest performance drains
3. **Iterative improvements**: Make measured changes
4. **Continuous monitoring**: Track performance over time

### Verification Process
1. **Technical metrics**: Verify improvements in performance scores
2. **User experience**: Ensure optimizations don't harm UX
3. **Cross-browser testing**: Validate performance across browsers
4. **Device diversity**: Test on various hardware capabilities

## Performance Budget

Establish limits for:
- **Bundle size**: Maximum JavaScript/CSS payload
- **Image size**: Optimized asset dimensions
- **Load time**: Acceptable time to interactive
- **Animation performance**: Maintain 60fps standards
- **Memory usage**: Reasonable consumption limits

## Monitoring and Maintenance

### Performance Tracking
- Implement performance monitoring tools
- Set up alerts for performance regressions
- Regular performance audits
- User experience metrics tracking

### Continuous Optimization
- Regular code reviews for performance impact
- Performance testing in CI/CD pipeline
- Ongoing asset optimization
- Third-party script evaluation

## Quality Assurance

Verify that optimizations:
- **Maintain functionality**: No features broken by optimizations
- **Preserve design quality**: Visual experience unaffected
- **Improve user experience**: Faster, smoother interactions
- **Meet accessibility standards**: Performance gains don't hurt accessibility
- **Scale appropriately**: Performance holds under load

**CRITICAL**: Balance performance improvements with code maintainability and design quality. Never sacrifice core functionality or user experience for performance gains.