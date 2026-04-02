import type { Argv } from "yargs"
import { cmd } from "./cmd"
import * as prompts from "@clack/prompts"
import { UI } from "../ui"
import { Global } from "../../global"
import { Filesystem } from "../../util/filesystem"
import path from "path"
import os from "os"
import type { ThemeJson } from "../cmd/tui/context/theme"
import { DEFAULT_THEMES } from "../cmd/tui/context/theme"

// Color input formats supported: hex, rgb, rgba
type ColorInput = string // hex like "#ff0000" or "ff0000"

type ColorMode = "dark" | "light"

interface ColorValue {
  dark: string
  light: string
}

// Core theme colors that must be defined
const CORE_COLORS = [
  { key: "primary", label: "Primary", description: "Main brand color (buttons, highlights)" },
  { key: "secondary", label: "Secondary", description: "Secondary accent color" },
  { key: "accent", label: "Accent", description: "Accent color for emphasis" },
  { key: "error", label: "Error", description: "Error messages, failed states" },
  { key: "warning", label: "Warning", description: "Warning messages" },
  { key: "success", label: "Success", description: "Success messages, confirmations" },
  { key: "info", label: "Info", description: "Info messages" },
  { key: "text", label: "Text", description: "Main text color" },
  { key: "textMuted", label: "Text Muted", description: "Secondary/muted text" },
  { key: "background", label: "Background", description: "Main background color" },
  { key: "backgroundPanel", label: "Background Panel", description: "Sidebar/panel backgrounds" },
  { key: "backgroundElement", label: "Background Element", description: "Input fields, buttons" },
  { key: "border", label: "Border", description: "Standard borders" },
  { key: "borderActive", label: "Border Active", description: "Active/focused borders" },
  { key: "borderSubtle", label: "Border Subtle", description: "Subtle dividers" },
] as const

// Extended colors for syntax highlighting and diffs
const EXTENDED_COLORS = [
  { key: "diffAdded", label: "Diff Added", description: "Added lines in diffs" },
  { key: "diffRemoved", label: "Diff Removed", description: "Removed lines in diffs" },
  { key: "diffAddedBg", label: "Diff Added BG", description: "Background for added lines" },
  { key: "diffRemovedBg", label: "Diff Removed BG", description: "Background for removed lines" },
  { key: "syntaxComment", label: "Syntax Comment", description: "Code comments" },
  { key: "syntaxKeyword", label: "Syntax Keyword", description: "Keywords (if, for, return)" },
  { key: "syntaxFunction", label: "Syntax Function", description: "Function names" },
  { key: "syntaxVariable", label: "Syntax Variable", description: "Variables" },
  { key: "syntaxString", label: "Syntax String", description: "String literals" },
  { key: "syntaxNumber", label: "Syntax Number", description: "Numbers" },
  { key: "syntaxType", label: "Syntax Type", description: "Types (string, number, etc)" },
] as const

// Parse color input in various formats
function parseColorInput(input: string): { valid: boolean; hex?: string; error?: string } {
  const trimmed = input.trim()
  
  // Hex format: #ff0000 or ff0000
  if (trimmed.match(/^#?[0-9a-fA-F]{6}$/)) {
    const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
    return { valid: true, hex: hex.toLowerCase() }
  }
  
  // RGB format: rgb(255, 0, 0)
  const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1])
    const g = parseInt(rgbMatch[2])
    const b = parseInt(rgbMatch[3])
    if (r > 255 || g > 255 || b > 255) {
      return { valid: false, error: "RGB values must be 0-255" }
    }
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    return { valid: true, hex }
  }
  
  // RGBA format: rgba(255, 0, 0, 0.5)
  const rgbaMatch = trimmed.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0?\.\d+|1|0)\s*\)$/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1])
    const g = parseInt(rgbaMatch[2])
    const b = parseInt(rgbaMatch[3])
    const a = parseFloat(rgbaMatch[4])
    if (r > 255 || g > 255 || b > 255) {
      return { valid: false, error: "RGB values must be 0-255" }
    }
    if (a < 0 || a > 1) {
      return { valid: false, error: "Alpha must be 0-1" }
    }
    // For now, convert to hex (ignoring alpha for simplicity)
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    return { valid: true, hex }
  }
  
  return { valid: false, error: "Invalid format. Use: #ff0000, rgb(255,0,0), or rgba(255,0,0,0.5)" }
}

// Convert RGBA to hex
function rgbaToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

// Generate a theme from user inputs
function generateTheme(name: string, colors: Record<string, ColorValue>): ThemeJson {
  const defs: Record<string, string> = {}
  const theme: Record<string, { dark: string; light: string } | string> = {}
  
  // Add all colors to defs and theme
  for (const [key, value] of Object.entries(colors)) {
    // Create a def entry for this color
    const defKey = `${key}Dark`
    const defKeyLight = `${key}Light`
    
    defs[defKey] = value.dark
    defs[defKeyLight] = value.light
    
    theme[key] = { dark: defKey, light: defKeyLight }
  }
  
  return {
    $schema: "https://opencode.ai/theme.json",
    defs,
    theme: theme as ThemeJson["theme"],
  }
}

// Get themes directory
async function getThemesDir(global: boolean): Promise<string> {
  if (global) {
    const dir = path.join(Global.Path.config, "themes")
    await Filesystem.mkdir(dir, { recursive: true })
    return dir
  }
  
  // Project-local
  const projectDir = path.join(process.cwd(), ".sahyacode", "themes")
  await Filesystem.mkdir(projectDir, { recursive: true })
  return projectDir
}

// List custom themes
async function listCustomThemes(): Promise<Record<string, ThemeJson>> {
  const themes: Record<string, ThemeJson> = {}
  
  const dirs = [
    path.join(Global.Path.config, "themes"),
    path.join(process.cwd(), ".sahyacode", "themes"),
  ]
  
  for (const dir of dirs) {
    if (!(await Filesystem.exists(dir))) continue
    
    const files = await Filesystem.readdir(dir).catch(() => [])
    for (const file of files) {
      if (!file.endsWith(".json")) continue
      
      const filePath = path.join(dir, file)
      try {
        const content = await Filesystem.readJson(filePath)
        const name = path.basename(file, ".json")
        themes[name] = content
      } catch {
        // Skip invalid themes
      }
    }
  }
  
  return themes
}

// Interactive color input for both dark and light modes
async function promptColor(colorInfo: { key: string; label: string; description: string }, defaults?: { dark?: string; light?: string }): Promise<{ dark: string; light: string } | null> {
  prompts.log.step(`${colorInfo.label} - ${colorInfo.description}`)
  
  const darkInput = await prompts.text({
    message: `  Dark mode color (hex/rgb/rgba):`,
    placeholder: defaults?.dark || "#ff4f00",
    defaultValue: defaults?.dark,
    validate: (value) => {
      if (!value) return "Required"
      const result = parseColorInput(value)
      return result.valid ? undefined : result.error
    },
  })
  
  if (prompts.isCancel(darkInput)) return null
  const darkResult = parseColorInput(darkInput)
  if (!darkResult.valid) return null
  
  const lightInput = await prompts.text({
    message: `  Light mode color (hex/rgb/rgba):`,
    placeholder: defaults?.light || darkResult.hex!,
    defaultValue: defaults?.light || darkResult.hex,
    validate: (value) => {
      if (!value) return "Required"
      const result = parseColorInput(value)
      return result.valid ? undefined : result.error
    },
  })
  
  if (prompts.isCancel(lightInput)) return null
  const lightResult = parseColorInput(lightInput)
  if (!lightResult.valid) return null
  
  return { dark: darkResult.hex!, light: lightResult.hex! }
}

// Create a new theme interactively
async function createTheme() {
  UI.empty()
  UI.println(UI.logo("  "))
  UI.empty()
  prompts.intro("Create Custom Theme")
  
  const name = await prompts.text({
    message: "Theme name (lowercase, no spaces):",
    placeholder: "my-awesome-theme",
    validate: (value) => {
      if (!value) return "Required"
      if (!value.match(/^[a-z0-9-]+$/)) return "Use lowercase letters, numbers, and hyphens only"
      return undefined
    },
  })
  
  if (prompts.isCancel(name)) {
    prompts.outro("Cancelled")
    return
  }
  
  // Check if theme already exists
  const existing = await listCustomThemes()
  if (existing[name]) {
    const overwrite = await prompts.confirm({
      message: `Theme "${name}" already exists. Overwrite?`,
      initialValue: false,
    })
    if (prompts.isCancel(overwrite) || !overwrite) {
      prompts.outro("Cancelled")
      return
    }
  }
  
  const colors: Record<string, ColorValue> = {}
  
  prompts.log.message("\n🎨 Configure Core Colors\n")
  
  for (const colorInfo of CORE_COLORS) {
    const result = await promptColor(colorInfo)
    if (result === null) {
      prompts.outro("Cancelled")
      return
    }
    colors[colorInfo.key] = result
  }
  
  // Ask if user wants to configure extended colors
  const configureExtended = await prompts.confirm({
    message: "Configure extended colors (syntax highlighting, diffs)?",
    initialValue: false,
  })
  
  if (!prompts.isCancel(configureExtended) && configureExtended) {
    prompts.log.message("\n🎨 Configure Extended Colors\n")
    
    for (const colorInfo of EXTENDED_COLORS) {
      const result = await promptColor(colorInfo, {
        dark: colors.success?.dark,
        light: colors.success?.light,
      })
      if (result === null) continue // Skip if cancelled
      colors[colorInfo.key] = result
    }
  }
  
  // Generate and save theme
  const theme = generateTheme(name, colors)
  
  // Preview option
  const preview = await prompts.confirm({
    message: "Preview theme before saving?",
    initialValue: true,
  })
  
  if (!prompts.isCancel(preview) && preview) {
    showThemePreview(name, colors)
  }
  
  // Choose save location
  const saveLocation = await prompts.select({
    message: "Where to save the theme?",
    options: [
      { label: "Global (all projects)", value: "global" },
      { label: "Project-local (current directory)", value: "local" },
    ],
  })
  
  if (prompts.isCancel(saveLocation)) {
    prompts.outro("Cancelled")
    return
  }
  
  const themesDir = await getThemesDir(saveLocation === "global")
  const themePath = path.join(themesDir, `${name}.json`)
  
  await Filesystem.write(themePath, JSON.stringify(theme, null, 2))
  
  prompts.log.success(`Theme saved to: ${themePath}`)
  
  // Ask if they want to activate it
  const activate = await prompts.confirm({
    message: `Activate "${name}" theme now?`,
    initialValue: true,
  })
  
  if (!prompts.isCancel(activate) && activate) {
    prompts.log.info(`Run "sahyacode" and use Ctrl+Shift+P > theme to select "${name}"`)
    prompts.log.info(`Or add "theme": "${name}" to your sahyacode.json config`)
  }
  
  prompts.outro("Done!")
}

// Show theme preview
function showThemePreview(name: string, colors: Record<string, ColorValue>) {
  UI.empty()
  prompts.log.message(`\n👁️  Theme Preview: ${name}\n`)
  
  // Show a simple color swatch preview
  prompts.log.message("Dark Mode:")
  for (const [key, value] of Object.entries(colors).slice(0, 8)) {
    const swatch = renderColorSwatch(value.dark)
    prompts.log.message(`  ${key.padEnd(20)} ${swatch} ${value.dark}`)
  }
  
  prompts.log.message("\nLight Mode:")
  for (const [key, value] of Object.entries(colors).slice(0, 8)) {
    const swatch = renderColorSwatch(value.light)
    prompts.log.message(`  ${key.padEnd(20)} ${swatch} ${value.light}`)
  }
  
  UI.empty()
}

// Render a color swatch using ANSI codes
function renderColorSwatch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `\x1b[48;2;${r};${g};${b}m  \x1b[0m`
}

// Edit an existing theme
async function editTheme() {
  UI.empty()
  UI.println(UI.logo("  "))
  UI.empty()
  prompts.intro("Edit Theme")
  
  const customThemes = await listCustomThemes()
  const allThemes = { ...DEFAULT_THEMES, ...customThemes }
  
  const themeNames = Object.keys(customThemes).sort()
  
  if (themeNames.length === 0) {
    prompts.log.warn("No custom themes found. Create one first with 'sahyacode theme create'")
    prompts.outro("Done")
    return
  }
  
  const selected = await prompts.select({
    message: "Select theme to edit:",
    options: themeNames.map((name) => ({ label: name, value: name })),
  })
  
  if (prompts.isCancel(selected)) {
    prompts.outro("Cancelled")
    return
  }
  
  const theme = customThemes[selected]
  const currentColors: Record<string, ColorValue> = {}
  
  // Extract current colors from theme
  for (const [key, value] of Object.entries(theme.theme)) {
    if (typeof value === "object" && "dark" in value && "light" in value) {
      const darkDef = value.dark as string
      const lightDef = value.light as string
      currentColors[key] = {
        dark: theme.defs?.[darkDef] || darkDef,
        light: theme.defs?.[lightDef] || lightDef,
      }
    }
  }
  
  prompts.log.message(`\nEditing theme: ${selected}\n`)
  
  // Let user pick which colors to edit
  const editMode = await prompts.select({
    message: "What would you like to do?",
    options: [
      { label: "Edit specific colors", value: "specific" },
      { label: "Edit all colors", value: "all" },
      { label: "Duplicate and modify", value: "duplicate" },
    ],
  })
  
  if (prompts.isCancel(editMode)) {
    prompts.outro("Cancelled")
    return
  }
  
  if (editMode === "duplicate") {
    const newName = await prompts.text({
      message: "New theme name:",
      placeholder: `${selected}-copy`,
      validate: (value) => {
        if (!value) return "Required"
        if (!value.match(/^[a-z0-9-]+$/)) return "Use lowercase letters, numbers, and hyphens only"
        return undefined
      },
    })
    
    if (prompts.isCancel(newName)) {
      prompts.outro("Cancelled")
      return
    }
    
    // Save as new theme
    const themesDir = await getThemesDir(true) // Always save duplicated themes globally
    const themePath = path.join(themesDir, `${newName}.json`)
    await Filesystem.write(themePath, JSON.stringify(theme, null, 2))
    
    prompts.log.success(`Theme duplicated as "${newName}"`)
    prompts.log.info(`Run "sahyacode theme edit" to modify it`)
    prompts.outro("Done!")
    return
  }
  
  const colorsToEdit = editMode === "all" 
    ? [...CORE_COLORS, ...EXTENDED_COLORS]
    : await prompts.multiselect({
        message: "Select colors to edit:",
        options: [...CORE_COLORS, ...EXTENDED_COLORS].map((c) => ({
          label: `${c.label} - ${c.description}`,
          value: c,
        })),
        required: false,
      })
  
  if (prompts.isCancel(colorsToEdit) || (Array.isArray(colorsToEdit) && colorsToEdit.length === 0)) {
    prompts.outro("Cancelled")
    return
  }
  
  const colors = Array.isArray(colorsToEdit) ? colorsToEdit : [...CORE_COLORS, ...EXTENDED_COLORS]
  
  for (const colorInfo of colors) {
    const defaults = currentColors[colorInfo.key]
    const result = await promptColor(colorInfo, defaults)
    if (result === null) continue
    currentColors[colorInfo.key] = result
  }
  
  // Generate and save updated theme
  const updatedTheme = generateTheme(selected, currentColors)
  
  // Find and update the theme file
  const dirs = [
    path.join(Global.Path.config, "themes"),
    path.join(process.cwd(), ".sahyacode", "themes"),
  ]
  
  for (const dir of dirs) {
    const themePath = path.join(dir, `${selected}.json`)
    if (await Filesystem.exists(themePath)) {
      await Filesystem.write(themePath, JSON.stringify(updatedTheme, null, 2))
      prompts.log.success(`Theme "${selected}" updated!`)
      break
    }
  }
  
  prompts.outro("Done!")
}

// List all themes
async function listThemes() {
  UI.empty()
  UI.println(UI.logo("  "))
  UI.empty()
  prompts.intro("Available Themes")
  
  prompts.log.message("\n📦 Built-in Themes:")
  const builtinNames = Object.keys(DEFAULT_THEMES).sort()
  for (const name of builtinNames) {
    prompts.log.message(`  • ${name}`)
  }
  
  const customThemes = await listCustomThemes()
  const customNames = Object.keys(customThemes).sort()
  
  if (customNames.length > 0) {
    prompts.log.message("\n🎨 Custom Themes:")
    for (const name of customNames) {
      prompts.log.message(`  • ${name} (custom)`)
    }
  }
  
  prompts.log.message("\n💡 Tip: Use 'sahyacode theme create' to make your own theme")
  prompts.outro("Done!")
}

// Export a theme
async function exportTheme() {
  UI.empty()
  UI.println(UI.logo("  "))
  UI.empty()
  prompts.intro("Export Theme")
  
  const customThemes = await listCustomThemes()
  const allThemes = { ...DEFAULT_THEMES, ...customThemes }
  
  const selected = await prompts.select({
    message: "Select theme to export:",
    options: Object.keys(allThemes).sort().map((name) => ({
      label: customThemes[name] ? `${name} (custom)` : `${name} (built-in)`,
      value: name,
    })),
  })
  
  if (prompts.isCancel(selected)) {
    prompts.outro("Cancelled")
    return
  }
  
  const theme = allThemes[selected]
  const outputPath = await prompts.text({
    message: "Export to file:",
    placeholder: `./${selected}-theme.json`,
    defaultValue: `./${selected}-theme.json`,
  })
  
  if (prompts.isCancel(outputPath)) {
    prompts.outro("Cancelled")
    return
  }
  
  await Filesystem.write(outputPath, JSON.stringify(theme, null, 2))
  prompts.log.success(`Theme exported to: ${outputPath}`)
  prompts.outro("Done!")
}

// Import a theme
async function importTheme() {
  UI.empty()
  UI.println(UI.logo("  "))
  UI.empty()
  prompts.intro("Import Theme")
  
  const inputPath = await prompts.text({
    message: "Path to theme JSON file:",
    placeholder: "./my-theme.json",
    validate: (value) => {
      if (!value) return "Required"
      return undefined
    },
  })
  
  if (prompts.isCancel(inputPath)) {
    prompts.outro("Cancelled")
    return
  }
  
  if (!(await Filesystem.exists(inputPath))) {
    prompts.log.error(`File not found: ${inputPath}`)
    prompts.outro("Failed")
    return
  }
  
  let theme: ThemeJson
  try {
    theme = await Filesystem.readJson(inputPath)
  } catch {
    prompts.log.error("Invalid theme JSON file")
    prompts.outro("Failed")
    return
  }
  
  const name = await prompts.text({
    message: "Theme name:",
    placeholder: path.basename(inputPath, ".json"),
    defaultValue: path.basename(inputPath, ".json"),
    validate: (value) => {
      if (!value) return "Required"
      if (!value.match(/^[a-z0-9-]+$/)) return "Use lowercase letters, numbers, and hyphens only"
      return undefined
    },
  })
  
  if (prompts.isCancel(name)) {
    prompts.outro("Cancelled")
    return
  }
  
  const saveLocation = await prompts.select({
    message: "Where to save the theme?",
    options: [
      { label: "Global (all projects)", value: "global" },
      { label: "Project-local (current directory)", value: "local" },
    ],
  })
  
  if (prompts.isCancel(saveLocation)) {
    prompts.outro("Cancelled")
    return
  }
  
  const themesDir = await getThemesDir(saveLocation === "global")
  const themePath = path.join(themesDir, `${name}.json`)
  
  await Filesystem.write(themePath, JSON.stringify(theme, null, 2))
  prompts.log.success(`Theme imported as "${name}"`)
  prompts.outro("Done!")
}

export const ThemeCommand = cmd({
  command: "theme [action]",
  describe: "manage custom themes",
  builder: (yargs: Argv) => {
    return yargs
      .positional("action", {
        describe: "action to perform",
        type: "string",
        choices: ["create", "edit", "list", "export", "import"],
      })
      .example("sahyacode theme create", "create a new custom theme")
      .example("sahyacode theme edit", "edit an existing custom theme")
      .example("sahyacode theme list", "list all available themes")
      .example("sahyacode theme export", "export a theme to a file")
      .example("sahyacode theme import", "import a theme from a file")
  },
  handler: async (args: { action?: string }) => {
    const action = args.action
    
    if (!action) {
      // Show interactive menu
      const selected = await prompts.select({
        message: "What would you like to do?",
        options: [
          { label: "Create new theme", value: "create" },
          { label: "Edit existing theme", value: "edit" },
          { label: "List all themes", value: "list" },
          { label: "Export theme", value: "export" },
          { label: "Import theme", value: "import" },
        ],
      })
      
      if (prompts.isCancel(selected)) {
        prompts.outro("Cancelled")
        return
      }
      
      switch (selected) {
        case "create":
          await createTheme()
          break
        case "edit":
          await editTheme()
          break
        case "list":
          await listThemes()
          break
        case "export":
          await exportTheme()
          break
        case "import":
          await importTheme()
          break
      }
    } else {
      switch (action) {
        case "create":
          await createTheme()
          break
        case "edit":
          await editTheme()
          break
        case "list":
          await listThemes()
          break
        case "export":
          await exportTheme()
          break
        case "import":
          await importTheme()
          break
        default:
          prompts.log.error(`Unknown action: ${action}`)
          process.exit(1)
      }
    }
  },
})
