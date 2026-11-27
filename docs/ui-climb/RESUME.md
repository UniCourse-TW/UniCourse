# Resume point (paused 2026-11-27 for a planned reboot)

State at pause:
- `main` is green and deployed to production (round-7 UI). Last commit before this note: a31c0a1.
- Round 7 judging: `scores/r7/sol.json` (mean 8.61), `opus.json` (8.35) and `astra.json` (9.11) are complete.
  Fable stopped after 8 of 26 pages; its partial scores and the list of remaining pages/slices are in
  `scores/r7/fable.checkpoint.json` (slices in `~/.cache/unicourse-dev/r7crops`).
- `astra.json` scored the OLD `thread`/`thread-signed-out` shots (they wrongly showed the zero-reply thread;
  fixed in a31c0a1 and the 8 PNGs in `shots/r7/` were re-captured). Re-score those two pages with Astra.

To resume:
1. `podman start unicourse-local-verify-db` (local Postgres; DB `unicourse_shots` = production copy).
2. Finish Fable r7: delegate a Fable judge with `~/.cache/unicourse-dev/judge-brief.md`, ROUND r7, telling it
   to continue from `scores/r7/fable.checkpoint.json` and write the full `scores/r7/fable.json` (26 pages).
   Re-run Astra on `thread` and `thread-signed-out` only and merge into `astra.json`.
3. `node scripts/ui-scoreboard.mjs`, commit scores.
4. Known screenshot-script issues to fix before round 8: `settings-saved` dark variants show the old bio
   (save/capture ordering), `landscape` is cut at maxHeight 3000 (raise it so the 各校 section is visible).
5. Round 8: briefs in `~/.cache/unicourse-dev/page-brief-r7.md` (copy to r8, point at r7 judge files);
   groups as in round 7 (Codex: shell/ui/home/search/schools/school/department/instructor; Claude Opus:
   course/course-reviewed/forum/profile/landscape; Claude Fable: thread/auth*/settings/legal/notfound).
   Cross-page items from r7: hatching still overpowers search rows and sparklines; data hidden behind
   disclosures (department history, landscape phone ranking, instructor ratings); ragged two-column bottoms
   (school, department, settings); PTT board count 4 vs 5 between terms and landscape.
