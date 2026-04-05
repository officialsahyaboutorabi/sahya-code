import path from "path"
import { pathToFileURL } from "url"
import z from "zod"
import { Tool } from "./tool"
import { Skill } from "../skill"
import { Ripgrep } from "../file/ripgrep"
import { iife } from "@/util/iife"

export const SkillTool = Tool.define("skill", async (ctx) => {
  const list = await Skill.available(ctx?.agent)

  const description =
    list.length === 0
      ? "Load a specialized skill that provides domain-specific instructions and workflows. No skills are currently available."
      : [
          "Load a specialized skill that provides domain-specific instructions and workflows.",
          "",
          "When you recognize that a task matches one of the available skills listed below, use this tool to load the full skill instructions.",
          "",
          "The skill will inject detailed instructions, workflows, and access to bundled resources (scripts, references, templates) into the conversation context.",
          "",
          'Tool output includes a `<skill_content name="...">` block with the loaded content.',
          "",
          "The following skills provide specialized sets of instructions for particular tasks",
          "Invoke this tool to load a skill when a task matches one of the available skills listed below:",
          "",
          Skill.fmt(list, { verbose: false }),
        ].join("\n")

  const examples = list
    .map((skill) => `'${skill.name}'`)
    .slice(0, 3)
    .join(", ")
  const hint = examples.length > 0 ? ` (e.g., ${examples}, ...)` : ""

  // Helper to clean up malformed skill names
  const cleanSkillName = (val: string): string => {
    return val
      // Remove common prefixes
      .replace(/^\s*[>\-•*]\s*Loading skill\s*`?/i, "")
      .replace(/^\s*[>\-•*]\s*Using skill\s*`?/i, "")
      .replace(/^\s*[>\-•*]\s*Skill\s*:?\s*`?/i, "")
      // Remove common suffixes
      .replace(/`?\.\.\.$/, "")
      .replace(/`?\s*\.\.\.$/, "")
      // Remove backticks
      .replace(/`/g, "")
      // Remove brackets
      .replace(/[\[\]\{\}]/g, "")
      // Trim whitespace
      .trim()
  }

  const parameters = z.object({
    name: z
      .string()
      .transform((val) => cleanSkillName(val))
      .pipe(
        z.string()
          .min(3, "Skill name must be at least 3 characters long")
          .max(50, "Skill name is too long")
          .regex(
            /^[a-z0-9\-]+$/,
            "Skill name must contain only lowercase letters, numbers, and hyphens (e.g., 'ui-developer', 'code-review')"
          )
      )
      .describe(`The EXACT skill name from the list above (lowercase, hyphenated)${hint}`),
  })

  return {
    description,
    parameters,
    formatValidationError(error: z.ZodError) {
      const issues = error.issues.map((issue) => {
        if (issue.message.includes("lowercase letters, numbers, and hyphens")) {
          return `Invalid skill name format. The skill name should be a simple lowercase string like "frontend-design" or "code-review". Do not include descriptions, prefixes like "> Loading skill", or backticks.`
        }
        return issue.message
      })
      return [
        "Invalid skill name provided.",
        "",
        ...issues,
        "",
        "IMPORTANT: Use ONLY the exact skill name from the available skills list above.",
        "",
        "CORRECT examples:",
        examples.split(", ").map(e => `  - ${e}`).join("\n"),
        "",
        "INCORRECT examples:",
        '  - "> Loading skill `frontend-design`..."',
        '  - "Skill: frontend-design"',
        '  - "Using `frontend-design`"',
      ].join("\n")
    },
    async execute(params: z.infer<typeof parameters>, ctx) {
      const skill = await Skill.get(params.name)

      if (!skill) {
        const available = await Skill.all().then((x) => x.map((skill) => skill.name).join(", "))
        const didYouMean = available
          .split(", ")
          .find((name) => name.toLowerCase().includes(params.name.toLowerCase()) ||
            params.name.toLowerCase().includes(name.toLowerCase()))
        const suggestion = didYouMean ? ` Did you mean '${didYouMean}'?` : ""
        throw new Error(
          `Skill "${params.name}" not found.${suggestion} Available skills: ${available || "none"}`
        )
      }

      await ctx.ask({
        permission: "skill",
        patterns: [params.name],
        always: [params.name],
        metadata: {},
      })

      const dir = path.dirname(skill.location)
      const base = pathToFileURL(dir).href

      const limit = 10
      const files = await iife(async () => {
        const arr = []
        for await (const file of Ripgrep.files({
          cwd: dir,
          follow: false,
          hidden: true,
          signal: ctx.abort,
        })) {
          if (file.includes("SKILL.md")) {
            continue
          }
          arr.push(path.resolve(dir, file))
          if (arr.length >= limit) {
            break
          }
        }
        return arr
      }).then((f) => f.map((file) => `<file>${file}</file>`).join("\n"))

      return {
        title: `Loaded skill: ${skill.name}`,
        output: [
          `<skill_content name="${skill.name}">`,
          `# Skill: ${skill.name}`,
          "",
          skill.content.trim(),
          "",
          `Base directory for this skill: ${base}`,
          "Relative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.",
          "Note: file list is sampled.",
          "",
          "<skill_files>",
          files,
          "</skill_files>",
          "</skill_content>",
        ].join("\n"),
        metadata: {
          name: skill.name,
          dir,
        },
      }
    },
  }
})
