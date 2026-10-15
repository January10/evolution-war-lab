# Automated development and real HTML browser-play gate

The 30-minute GitHub Actions scheduler is on main because scheduled workflows only start from the default branch. Game code and its draft PR remain on ai/evolution-war-lab-autodev (PR #1).

## How it works

- The schedule triggers at UTC :13 and :43. GitHub can delay scheduled starts.
- The AI job gets repository read access, not write. With an OPENAI_API_KEY secret in repository Actions settings, it runs Codex. Without that secret it tries GitHub Copilot CLI using the job's built-in GITHUB_TOKEN (requires Copilot entitlement and a compatible plan/policy). GitHub Models inference API was retired and is not used.
- The AI must change real source, tests, docs/ROADMAP.md and ITERATION_LOG.md. A guard refuses unrelated paths, missing code or tests, workflow changes, symlinks, renames and large patches.
- A separate read-only job runs npm test, npm run build, npm run soak, npm run difficulty, scripts/autodev_playtest.py, and scripts/browser_soak.py. The former interacts with the real built HTML for ~24 wall-clock seconds using keyboard and mouse and saves screenshots. The latter checks 600 accelerated game seconds. Neither replaces human testing. If file navigation is blocked, the browser test explicitly reports when it loads the identical HTML via set_content.
- Only after validation succeeds, a separate write-enabled job verifies the exact patch hash and unchanged branch parent SHA, then pushes a normal non-forced commit to the existing PR #1 branch. No automatic main merge or public deployment. Failed runs do not publish.
- A GITHUB_TOKEN-generated commit generally does not trigger other push workflows; the scheduled workflow includes its own pre-push validation.

## First run

Open GitHub Actions and run "Pixel Frontline - autonomous development every 30 minutes" manually. Check develop, validate, and publish jobs; Actions artifacts store test screenshots. If Copilot CLI authentication is unavailable, add OPENAI_API_KEY as a repository Actions secret, or enable Copilot CLI access. ChatGPT subscription/IDE login is NOT an API key. Never paste credentials in chat.

Monitor GitHub Actions minutes, Copilot/model usage and any associated charges. The schedule and job creation alone do not mean that successful autonomous code updates are occurring.
