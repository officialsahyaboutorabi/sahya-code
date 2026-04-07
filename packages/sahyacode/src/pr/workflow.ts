/**
 * PRWorkflow — full GitHub PR lifecycle from inside sahyacode.
 *
 * Uses `gh` CLI when available, falls back to raw GitHub REST API with a token
 * sourced from the GITHUB_TOKEN env var or the `github.token` git config key.
 */

import { Process } from "@/util/process"
import { git } from "@/util/git"
import { parseGitHubRemote } from "@/cli/cmd/github"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PR {
  number: number
  title: string
  state: string
  url: string
  headRef: string
  baseRef: string
  author: string
  createdAt: string
  draft: boolean
}

export interface PRReviewComment {
  id: number
  body: string
  author: string
  path?: string
  line?: number
  createdAt: string
}

export interface PRReview {
  number: number
  title: string
  body: string
  diff: string
  comments: PRReviewComment[]
  reviews: Array<{
    author: string
    state: string
    body: string
    submittedAt: string
  }>
  headRef: string
  baseRef: string
  additions: number
  deletions: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the `gh` CLI is installed and authenticated.
 */
async function ghAvailable(): Promise<boolean> {
  try {
    const result = await Process.run(["gh", "auth", "status"], { nothrow: true })
    return result.code === 0
  } catch {
    return false
  }
}

/**
 * Resolve the GitHub token: GITHUB_TOKEN env var → git config github.token.
 */
async function resolveToken(cwd: string): Promise<string | undefined> {
  if (process.env["GITHUB_TOKEN"]) return process.env["GITHUB_TOKEN"]
  try {
    const result = await git(["config", "--get", "github.token"], { cwd })
    if (result.exitCode === 0) {
      const t = result.text().trim()
      if (t) return t
    }
  } catch {
    // ignore
  }
  return undefined
}

/**
 * Parse owner/repo from git remote. Throws if not a GitHub remote.
 */
async function resolveRepo(cwd: string): Promise<{ owner: string; repo: string }> {
  const result = await git(["remote", "get-url", "origin"], { cwd })
  if (result.exitCode !== 0) throw new Error("Could not read git remote 'origin'")
  const parsed = parseGitHubRemote(result.text().trim())
  if (!parsed) throw new Error("Remote 'origin' is not a GitHub repository")
  return parsed
}

/**
 * Get the current working directory for git operations.
 * Prefers the `cwd` argument; falls back to process.cwd().
 */
function resolveCwd(cwd?: string): string {
  return cwd ?? process.cwd()
}

// ---------------------------------------------------------------------------
// Raw GitHub REST API helpers (used when gh CLI is unavailable)
// ---------------------------------------------------------------------------

async function githubFetch(
  path: string,
  token: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const url = `https://api.github.com${path}`
  const response = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "sahyacode-pr-workflow/1.0",
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`GitHub API error ${response.status}: ${text}`)
  }

  // 204 No Content
  if (response.status === 204) return null
  return response.json()
}

// ---------------------------------------------------------------------------
// PRWorkflow service
// ---------------------------------------------------------------------------

export class PRWorkflow {
  private readonly cwd: string

  constructor(cwd?: string) {
    this.cwd = resolveCwd(cwd)
  }

  // -------------------------------------------------------------------------
  // createPR
  // -------------------------------------------------------------------------

  /**
   * Creates a branch named `sahya/pr-<timestamp>`, commits any staged changes,
   * pushes, opens a PR via `gh` or the GitHub REST API, and returns the PR URL.
   *
   * @param title  PR title
   * @param body   PR body / description
   * @param base   Base branch (defaults to repo default branch, falls back to "main")
   */
  async createPR(title: string, body: string, base?: string): Promise<string> {
    const cwd = this.cwd

    // 1. Generate branch name
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.TZ-]/g, "")
      .slice(0, 14)
    const branch = `sahya/pr-${timestamp}`

    // 2. Create and checkout branch
    const checkoutResult = await git(["checkout", "-b", branch], { cwd })
    if (checkoutResult.exitCode !== 0) {
      throw new Error(
        `Failed to create branch '${branch}': ${checkoutResult.stderr.toString().trim()}`,
      )
    }

    // 3. Stage + commit (only if there are staged or working-tree changes)
    const statusResult = await git(["status", "--porcelain"], { cwd })
    const hasChanges = statusResult.text().trim().length > 0
    if (hasChanges) {
      // Stage everything that isn't already staged
      await git(["add", "-A"], { cwd })
      const commitResult = await git(["commit", "-m", title], { cwd })
      if (commitResult.exitCode !== 0) {
        throw new Error(
          `Failed to commit changes: ${commitResult.stderr.toString().trim()}`,
        )
      }
    }

    // 4. Push branch
    const pushResult = await git(["push", "-u", "origin", branch], { cwd })
    if (pushResult.exitCode !== 0) {
      throw new Error(
        `Failed to push branch '${branch}': ${pushResult.stderr.toString().trim()}`,
      )
    }

    // 5. Resolve base branch
    const resolvedBase = base ?? (await this.defaultBranch())

    // 6. Create PR — prefer gh CLI
    if (await ghAvailable()) {
      return this.createPRViaGh(title, body, branch, resolvedBase, cwd)
    }
    return this.createPRViaApi(title, body, branch, resolvedBase, cwd)
  }

  private async createPRViaGh(
    title: string,
    body: string,
    head: string,
    base: string,
    cwd: string,
  ): Promise<string> {
    const result = await Process.run(
      ["gh", "pr", "create", "--title", title, "--body", body, "--base", base, "--head", head],
      { cwd, nothrow: true },
    )
    if (result.code !== 0) {
      throw new Error(`gh pr create failed: ${result.stderr.toString().trim()}`)
    }
    // gh prints the PR URL to stdout
    return result.stdout.toString().trim()
  }

  private async createPRViaApi(
    title: string,
    body: string,
    head: string,
    base: string,
    cwd: string,
  ): Promise<string> {
    const token = await resolveToken(cwd)
    if (!token) throw new Error("No GitHub token found. Set GITHUB_TOKEN or run: gh auth login")
    const { owner, repo } = await resolveRepo(cwd)

    const data = (await githubFetch(`/repos/${owner}/${repo}/pulls`, token, {
      method: "POST",
      body: { title, body, head, base },
    })) as { html_url: string }

    return data.html_url
  }

  // -------------------------------------------------------------------------
  // listPRs
  // -------------------------------------------------------------------------

  /** Lists open PRs for the current repository. */
  async listPRs(): Promise<PR[]> {
    const cwd = this.cwd

    if (await ghAvailable()) {
      return this.listPRsViaGh(cwd)
    }
    return this.listPRsViaApi(cwd)
  }

  private async listPRsViaGh(cwd: string): Promise<PR[]> {
    const result = await Process.run(
      [
        "gh",
        "pr",
        "list",
        "--state",
        "open",
        "--json",
        "number,title,state,url,headRefName,baseRefName,author,createdAt,isDraft",
        "--limit",
        "50",
      ],
      { cwd, nothrow: true },
    )

    if (result.code !== 0) {
      throw new Error(`gh pr list failed: ${result.stderr.toString().trim()}`)
    }

    type GhPR = {
      number: number
      title: string
      state: string
      url: string
      headRefName: string
      baseRefName: string
      author: { login: string }
      createdAt: string
      isDraft: boolean
    }

    const raw: GhPR[] = JSON.parse(result.stdout.toString())
    return raw.map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      url: p.url,
      headRef: p.headRefName,
      baseRef: p.baseRefName,
      author: p.author?.login ?? "unknown",
      createdAt: p.createdAt,
      draft: p.isDraft,
    }))
  }

  private async listPRsViaApi(cwd: string): Promise<PR[]> {
    const token = await resolveToken(cwd)
    if (!token) throw new Error("No GitHub token found. Set GITHUB_TOKEN or run: gh auth login")
    const { owner, repo } = await resolveRepo(cwd)

    type ApiPR = {
      number: number
      title: string
      state: string
      html_url: string
      head: { ref: string }
      base: { ref: string }
      user: { login: string }
      created_at: string
      draft: boolean
    }

    const data = (await githubFetch(
      `/repos/${owner}/${repo}/pulls?state=open&per_page=50`,
      token,
    )) as ApiPR[]

    return data.map((p) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      url: p.html_url,
      headRef: p.head.ref,
      baseRef: p.base.ref,
      author: p.user?.login ?? "unknown",
      createdAt: p.created_at,
      draft: p.draft,
    }))
  }

  // -------------------------------------------------------------------------
  // reviewPR
  // -------------------------------------------------------------------------

  /**
   * Fetches the PR diff and all comments/reviews so an LLM can review the PR.
   */
  async reviewPR(prNumber: number): Promise<PRReview> {
    const cwd = this.cwd

    if (await ghAvailable()) {
      return this.reviewPRViaGh(prNumber, cwd)
    }
    return this.reviewPRViaApi(prNumber, cwd)
  }

  private async reviewPRViaGh(prNumber: number, cwd: string): Promise<PRReview> {
    // Fetch PR metadata + diff
    const metaResult = await Process.run(
      [
        "gh",
        "pr",
        "view",
        String(prNumber),
        "--json",
        "number,title,body,headRefName,baseRefName,additions,deletions,comments,reviews",
      ],
      { cwd, nothrow: true },
    )
    if (metaResult.code !== 0) {
      throw new Error(`gh pr view failed: ${metaResult.stderr.toString().trim()}`)
    }

    type GhReviewComment = {
      id: number
      body: string
      author: { login: string }
      createdAt: string
      path?: string
      line?: number
    }

    type GhReview = {
      author: { login: string }
      state: string
      body: string
      submittedAt: string
    }

    type GhMeta = {
      number: number
      title: string
      body: string
      headRefName: string
      baseRefName: string
      additions: number
      deletions: number
      comments: GhReviewComment[]
      reviews: GhReview[]
    }

    const meta: GhMeta = JSON.parse(metaResult.stdout.toString())

    const diffResult = await Process.run(["gh", "pr", "diff", String(prNumber)], {
      cwd,
      nothrow: true,
    })
    const diff = diffResult.code === 0 ? diffResult.stdout.toString() : ""

    return {
      number: meta.number,
      title: meta.title,
      body: meta.body ?? "",
      diff,
      headRef: meta.headRefName,
      baseRef: meta.baseRefName,
      additions: meta.additions,
      deletions: meta.deletions,
      comments: (meta.comments ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        author: c.author?.login ?? "unknown",
        createdAt: c.createdAt,
        path: c.path,
        line: c.line,
      })),
      reviews: (meta.reviews ?? []).map((r) => ({
        author: r.author?.login ?? "unknown",
        state: r.state,
        body: r.body ?? "",
        submittedAt: r.submittedAt,
      })),
    }
  }

  private async reviewPRViaApi(prNumber: number, cwd: string): Promise<PRReview> {
    const token = await resolveToken(cwd)
    if (!token) throw new Error("No GitHub token found. Set GITHUB_TOKEN or run: gh auth login")
    const { owner, repo } = await resolveRepo(cwd)

    type ApiPullRequest = {
      number: number
      title: string
      body: string
      head: { ref: string }
      base: { ref: string }
      additions: number
      deletions: number
    }

    type ApiComment = {
      id: number
      body: string
      user: { login: string }
      created_at: string
      path?: string
      line?: number
    }

    type ApiReview = {
      user: { login: string }
      state: string
      body: string
      submitted_at: string
    }

    const [prData, commentsData, reviewsData, reviewCommentsData, diffData] = await Promise.all([
      githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`, token) as Promise<ApiPullRequest>,
      githubFetch(
        `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
        token,
      ) as Promise<ApiComment[]>,
      githubFetch(
        `/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100`,
        token,
      ) as Promise<ApiReview[]>,
      githubFetch(
        `/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`,
        token,
      ) as Promise<ApiComment[]>,
      // Diff via Accept: application/vnd.github.diff
      (async () => {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.diff",
              "X-GitHub-Api-Version": "2022-11-28",
              "User-Agent": "sahyacode-pr-workflow/1.0",
            },
          },
        )
        return response.ok ? response.text() : Promise.resolve("")
      })(),
    ])

    const allComments: PRReviewComment[] = [
      ...(commentsData as ApiComment[]).map((c) => ({
        id: c.id,
        body: c.body,
        author: c.user?.login ?? "unknown",
        createdAt: c.created_at,
      })),
      ...(reviewCommentsData as ApiComment[]).map((c) => ({
        id: c.id,
        body: c.body,
        author: c.user?.login ?? "unknown",
        createdAt: c.created_at,
        path: c.path,
        line: c.line,
      })),
    ]

    return {
      number: prData.number,
      title: prData.title,
      body: prData.body ?? "",
      diff: await diffData,
      headRef: prData.head.ref,
      baseRef: prData.base.ref,
      additions: prData.additions,
      deletions: prData.deletions,
      comments: allComments,
      reviews: (reviewsData as ApiReview[]).map((r) => ({
        author: r.user?.login ?? "unknown",
        state: r.state,
        body: r.body ?? "",
        submittedAt: r.submitted_at,
      })),
    }
  }

  // -------------------------------------------------------------------------
  // mergePR
  // -------------------------------------------------------------------------

  /** Merges a PR by number (squash merge). */
  async mergePR(prNumber: number): Promise<void> {
    const cwd = this.cwd

    if (await ghAvailable()) {
      return this.mergePRViaGh(prNumber, cwd)
    }
    return this.mergePRViaApi(prNumber, cwd)
  }

  private async mergePRViaGh(prNumber: number, cwd: string): Promise<void> {
    const result = await Process.run(
      ["gh", "pr", "merge", String(prNumber), "--squash", "--auto"],
      { cwd, nothrow: true },
    )
    if (result.code !== 0) {
      throw new Error(`gh pr merge failed: ${result.stderr.toString().trim()}`)
    }
  }

  private async mergePRViaApi(prNumber: number, cwd: string): Promise<void> {
    const token = await resolveToken(cwd)
    if (!token) throw new Error("No GitHub token found. Set GITHUB_TOKEN or run: gh auth login")
    const { owner, repo } = await resolveRepo(cwd)

    await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}/merge`, token, {
      method: "PUT",
      body: { merge_method: "squash" },
    })
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  /** Returns the default branch of the repo (main / master fallback). */
  async defaultBranch(): Promise<string> {
    const cwd = this.cwd
    try {
      // Try to get from remote HEAD
      const result = await git(
        ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
        { cwd },
      )
      if (result.exitCode === 0) {
        const ref = result.text().trim().replace(/^origin\//, "")
        if (ref) return ref
      }
    } catch {
      // ignore
    }

    // Fallback: try gh
    if (await ghAvailable()) {
      try {
        const result = await Process.run(
          ["gh", "repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"],
          { cwd, nothrow: true },
        )
        if (result.code === 0) {
          const branch = result.stdout.toString().trim()
          if (branch) return branch
        }
      } catch {
        // ignore
      }
    }

    // Ultimate fallback
    const mainCheck = await git(["show-ref", "--verify", "--quiet", "refs/remotes/origin/main"], { cwd })
    return mainCheck.exitCode === 0 ? "main" : "master"
  }

  /**
   * Builds an LLM-friendly summary string from a PRReview object.
   * Used internally by the TUI `/pr review` command to inject context.
   */
  static formatReviewForLLM(review: PRReview): string {
    const commentBlock =
      review.comments.length === 0
        ? "No comments yet."
        : review.comments
            .map(
              (c) =>
                `### Comment by @${c.author} (${c.createdAt})${c.path ? `\nFile: ${c.path}${c.line ? `:${c.line}` : ""}` : ""}\n${c.body}`,
            )
            .join("\n\n")

    const reviewBlock =
      review.reviews.length === 0
        ? "No reviews yet."
        : review.reviews
            .map(
              (r) =>
                `### Review by @${r.author} — ${r.state} (${r.submittedAt})\n${r.body || "(no comment)"}`,
            )
            .join("\n\n")

    return [
      `## PR #${review.number}: ${review.title}`,
      `**Base:** ${review.baseRef} ← **Head:** ${review.headRef}`,
      `**Changes:** +${review.additions} / -${review.deletions}`,
      "",
      "### Description",
      review.body || "(no description)",
      "",
      "### Diff",
      "```diff",
      review.diff.slice(0, 20_000), // cap to avoid huge contexts
      "```",
      "",
      "### Comments",
      commentBlock,
      "",
      "### Reviews",
      reviewBlock,
    ].join("\n")
  }
}

/** Singleton factory — creates a PRWorkflow scoped to process.cwd(). */
export function createPRWorkflow(cwd?: string): PRWorkflow {
  return new PRWorkflow(cwd)
}
