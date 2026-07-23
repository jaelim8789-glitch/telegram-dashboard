---
description: generate a weekly report of all changes, commits, and deployments
agent: code
---
1. Run `git log --since='7 days ago' --oneline` for commit summary
2. Run `git shortlog -sn --since='7 days ago'` for contributor stats
3. Check GitHub issues/PRs: `gh issue list --limit 20`
4. Check VPS deploy status with `/prod-health`
5. Format as markdown report with sections: Commits, Contributors, Issues, Deploys, Hotspots
6. Save to `reports/weekly-YYYY-MM-DD.md`
