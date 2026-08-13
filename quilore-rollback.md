# Quilore AI Team Orchestrator — Full Rollback Guide

Everything below was created or changed during this session. Nothing here has been undone yet — this is a checklist for you to execute (or ask me to execute, if you change your mind).

## 1. VPS (local-vps / Pi) — stop and remove the orchestrator

```bash
cd /opt/quilore-ai-team
docker compose down -v          # stops and removes both containers + the Postgres volume
cd /opt
rm -rf quilore-ai-team          # deletes the cloned code and .env (contains secrets — safe to delete)
```

This removes:
- Container `quilore_ai_orchestrator`
- Container `quilore_ai_db`
- Docker network `quilore-ai-team_quilore_ai_net`
- Volume `quilore-ai-team_quilore_ai_db_data`

## 2. Cloudflare Tunnel config — remove the added route

```bash
sudo nano /etc/cloudflared/config.yml
```

Delete this block (leave everything else — `ssh`, `jarvis`, `ha`, and the final `http_status:404` — untouched):

```yaml
  - hostname: quilore-ai.sm4devlabs.dpdns.org
    service: http://127.0.0.1:8081
```

Then:

```bash
sudo systemctl restart cloudflared
```

Optional cleanup — remove the DNS record entirely:

```bash
cloudflared tunnel route dns sm4devlabs-pi quilore-ai.sm4devlabs.dpdns.org --overwrite-dns
```
(or delete the `quilore-ai` DNS record directly in the Cloudflare dashboard for `sm4devlabs.dpdns.org`).

## 3. Cloudflare security settings — restore if you changed them

If you turned off Bot Fight Mode or added a WAF "skip" rule for `quilore-ai.sm4devlabs.dpdns.org` earlier, and want the original security posture back on that zone:
- Security → Settings → re-enable Bot Fight Mode
- Security → WAF → Custom rules → delete the `allow quilore-ai api` rule if you created it

## 4. GitHub — `subh2312/quilore` (your real app repo)

PR #3 was merged into `dev`, adding `.github/workflows/pr-evidence.yml`, `.github/workflows/uat-release.yml`, and one entry in `docs/agent-log.md`. To fully revert:

```bash
git clone https://github.com/subh2312/quilore.git
cd quilore
git checkout dev
git revert 93c1e5e57182718aaf986faaeae4d862640b6353 --no-edit
git push origin dev
```

Then delete the now-unused branch:

```bash
git push origin --delete orchestrator-ci-integration
```

If you also want PR #2 (the one I closed) gone entirely rather than just closed, that's already in a closed state — no further action needed unless you want to delete its branch too:

```bash
git push origin --delete subh2312-repo-hardening-setup
```

Also check and remove, if no longer wanted:
- Actions secrets `AI_ORCHESTRATOR_URL` and `AI_ORCHESTRATOR_TOKEN` (Settings → Secrets and variables → Actions)
- The branch protection rule changes on `dev` (Settings → Branches) — you fixed the required-check name during this session; revert or adjust as you see fit
- GitHub Copilot coding agent enablement (Settings → Copilot → Coding agent) if you no longer want it on
- Cursor's connection to this repository (Cursor Dashboard → Integrations → GitHub)

## 5. GitHub — `sm1523dev/quilore-ai-team` (entirely new repo I created)

This repo only exists to hold the orchestrator's own source code. Nothing outside your VPS deployment (already removed in step 1) depends on it. Delete it:

```bash
gh repo delete sm1523dev/quilore-ai-team --yes
```
or via GitHub UI: repo → Settings → scroll to bottom → Delete this repository.

## 6. Plane

Plane changes in this session were made by Gemini via its own MCP connection, based on instructions I gave — I never had direct Plane access myself, so I can't verify or revert these for you. Check and remove manually if unwanted:
- Webhook pointing to `https://quilore-ai.sm4devlabs.dpdns.org/v1/webhooks/plane` (Workspace Settings → Webhooks)
- Labels: `agent:cursor`, `agent:copilot`, `risk:db`, `risk:auth`, `risk:pii`, `risk:payments`, `requires-human-approval` (if not otherwise useful to you)
- Any states added that you don't otherwise want (`PR Review`, `Integration Review`, `Ready for UAT`, `Blocked`, etc. — some of these may be worth keeping regardless of this project)

## 7. Google AI Studio

You created a new paid project and added ₹1000 in prepay credit at your own initiative. That spend is with Google, not Perplexity, and isn't something I can refund or reverse — the balance simply sits in that Google Cloud/AI Studio project until you use or close it. If you want it gone:
- [ai.studio/projects](https://ai.studio/projects) → your project → billing → close/downgrade the project, or leave the balance for other use.

## 8. Local files from this session

Nothing outside your VPS/GitHub/Plane/Google accounts was affected — the code I generated only exists in this conversation's workspace and the shared zip/repo link. No action needed unless you want me to stop referencing them.

---

Nothing in this document has been executed. If you want me to run any of these steps myself, say so explicitly and I will — otherwise this stops here as requested.
