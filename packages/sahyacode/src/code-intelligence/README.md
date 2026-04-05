# Code Intelligence Module

The Code Intelligence module provides deep codebase understanding for SahyaCode.

## Features

- **AST Parsing**: Tree-sitter based parsing for TypeScript/JavaScript
- **Dependency Graph**: Build and analyze import/export relationships
- **Semantic Search**: Fuzzy symbol search across the codebase
- **Code Metrics**: Complexity analysis and dead code detection

## Architecture

```
code-intelligence/
├── index.ts              # Main service and exports
├── parser/
│   ├── index.ts          # Parser types and interface
│   ├── tree-sitter.ts    # Tree-sitter utilities
│   └── languages/
│       └── typescript.ts # TypeScript/JS parser
├── graph/
│   └── index.ts          # Dependency graph builder
├── search/
│   └── index.ts          # Symbol search indexer
└── analysis/
    └── index.ts          # Code metrics analyzer
```

## CLI Usage

```bash
# Analyze current directory
sahyacode analyze

# Analyze specific path
sahyacode analyze ./src

# Show dependency analysis
sahyacode analyze --dependencies

# Detect circular dependencies
sahyacode analyze --circular

# Find dead code
sahyacode analyze --dead-code

# Search for symbols
sahyacode analyze --symbols "MyClass"

# Output as JSON
sahyacode analyze --format json
```

## Programmatic Usage

```typescript
import { CodeIntelligence } from "sahyacode/code-intelligence"

// Initialize
await CodeIntelligence.init()

// Index a file
await CodeIntelligence.indexFile("./src/index.ts")

// Parse and get symbols
const result = await CodeIntelligence.parseFile("./src/index.ts")
console.log(result.symbols)

// Find references
const references = await CodeIntelligence.findReferences(symbol)

// Search symbols
const matches = await CodeIntelligence.searchSymbols("myFunction", 10)

// Get metrics
const metrics = await CodeIntelligence.getMetrics("./src/index.ts")
const projectMetrics = await CodeIntelligence.analyzeProject()

// Find dead code
const deadCode = await CodeIntelligence.getDeadCode()

// Detect circular dependencies
const cycles = await CodeIntelligence.detectCircularDependencies()
```

## Integration

The module automatically integrates with:
- **File Watcher**: Files are re-indexed when changed
- **LSP**: Complements language server features
- **TUI**: Can be visualized in the terminal UI

## Extending

To add support for more languages:

1. Create a new parser in `parser/languages/{language}.ts`
2. Implement the `Parser.Interface`
3. Register in `parser/index.ts`
