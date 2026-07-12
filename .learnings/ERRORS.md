# Errors

Command failures and integration errors.

---

## [ERR-20260712-001] git-merge-ff-only

**Logged**: 2026-07-12T07:48:00+08:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
An attempted fast-forward merge failed because `main` had advanced after the feature worktree was created.

### Error
```
fatal: Not possible to fast-forward, aborting.
```

### Context
- The feature worktree was branched from an earlier `main` commit.
- The primary worktree later gained additional commits, so the branches diverged.
- The failed `--ff-only` command made no changes.

### Suggested Fix
Inspect the branch graph before assuming fast-forward eligibility, then use a normal merge when both sides contain intentional commits.

### Metadata
- Reproducible: yes
- Related Files: .git/worktrees/smart-shortcut-placement

### Resolution
- **Resolved**: 2026-07-12T07:48:00+08:00
- **Notes**: Switched to graph inspection followed by a normal non-destructive merge.

---

## [ERR-20260711-001] shell-search-command

**Logged**: 2026-07-11T21:52:54+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
An `rg` self-review command failed because a backtick inside a double-quoted zsh command produced unmatched command-substitution quoting.

### Error
```
zsh:1: unmatched "
```

### Context
- The command searched an implementation-plan document for coverage phrases.
- A search alternative contained Markdown backticks inside the shell command string.
- No file was modified and the other independent self-review checks completed.

### Suggested Fix
Avoid Markdown backticks in shell search expressions. Search for plain text alternatives or place the pattern in a safely quoted file argument.

### Metadata
- Reproducible: yes
- Related Files: docs/superpowers/plans/2026-07-11-smart-shortcut-element-placement.md

### Resolution
- **Resolved**: 2026-07-11T21:52:54+08:00
- **Notes**: Replaced the unsafe search with plain-text patterns and reran the review.

---
