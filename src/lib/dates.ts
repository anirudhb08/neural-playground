import { execFileSync } from "node:child_process";

/**
 * When a part was first written and last touched, taken from git.
 *
 * Hand-maintained frontmatter dates rot the moment someone edits a file and
 * forgets, and a wrong `dateModified` is worse than none — it tells a search
 * engine the page is fresh when it is not. Git already knows.
 *
 * Build-time only. Falls back to the tutorial's own published date when there
 * is no git history, which is the case for a deploy from a tarball.
 */
function gitDate(file: string, first: boolean): string | null {
  try {
    const args = ["log", "--format=%cI", "--", file];
    const out = execFileSync("git", args, { encoding: "utf8" }).trim();
    if (!out) return null;
    const lines = out.split("\n");
    return first ? lines[lines.length - 1] : lines[0];
  } catch {
    return null;
  }
}

export function fileDates(path: string, fallback: Date) {
  const iso = fallback.toISOString();
  return {
    published: gitDate(path, true) ?? iso,
    modified: gitDate(path, false) ?? iso,
  };
}
