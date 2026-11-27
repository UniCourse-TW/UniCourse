# Deploying UniCourse on sky-server

Layout follows the sky-server conventions: code at `/home/sky/Projects/UniCourse`, data at `/srv/unicourse`
(`pg/` Postgres data, `snapshots/` crawler output, `secrets/` compose env + DB password), ingress through
Dokploy's Traefik on `dokploy-network` (label-based routing, no host ports) behind the Cloudflare tunnel.

```sh
# one-time
sudo mkdir -p /srv/unicourse/{pg,snapshots,secrets} && sudo chown -R sky /srv/unicourse
openssl rand -hex 24 > /srv/unicourse/secrets/db_password
printf 'UNICOURSE_DB_PASSWORD=%s\nUNICOURSE_HOST=unicourse.observe.tw\nUNICOURSE_TAG=latest\n' "$(cat /srv/unicourse/secrets/db_password)" > /srv/unicourse/secrets/compose.env
chmod 600 /srv/unicourse/secrets/*

# build + start (from the repo checkout)
cd deploy && docker compose --env-file /srv/unicourse/secrets/compose.env build
docker compose --env-file /srv/unicourse/secrets/compose.env up -d db api web

# first data load (hours for all schools; crawler image honours per-school rate limits)
docker compose --env-file /srv/unicourse/secrets/compose.env run --rm crawl
docker compose --env-file /srv/unicourse/secrets/compose.env run --rm ingest

# national course platform (every school without its own crawler; ~1 h per term)
docker compose --env-file /srv/unicourse/secrets/compose.env run --rm crawl-tvc
docker compose --env-file /srv/unicourse/secrets/compose.env run --rm ingest-tvc

# nightly refresh (own crawlers) and weekly refresh (national platform)
mkdir -p ~/.config/systemd/user && cp systemd/unicourse-refresh*.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now unicourse-refresh.timer unicourse-refresh-tvc.timer
```

Verify without DNS: `curl -s -H 'Host: unicourse.observe.tw' http://127.0.0.1/` on the host.
Public exposure needs a Cloudflare public hostname `unicourse.observe.tw` on tunnel `sky-server`
pointing at `http://localhost:80` (same as the other `*.observe.tw` sites); this is a DNS/tunnel change
and is done by the operator, not by the deploy scripts.

Rollback: `docker compose ... down` keeps `/srv/unicourse/pg`; re-run `up -d` with the previous `UNICOURSE_TAG`.

## Batch job health and completion

`ingest` and `ingest-tvc` share the API image but run only `unicourse-ingest`,
not the HTTP server. Their service-level healthchecks are disabled; the API
service still inherits the image's `/api/schools` HTTP probe unchanged.
Disabled healthchecking is not evidence that an import finished.

For each job, retain its exact invocation and foreground `docker compose run`
exit status (or the exact container's terminal state/exit before removal).
A nonzero exit is a failed job, a running job is not complete, and an absent
`--rm` container with no retained terminal result is **unknown**, not success.
This change does not add durable job-result storage or repair earlier missing
completion evidence. The existing refresh units deliberately run ingest after
crawl using `;`; their shell exit covers the final ingest, not aggregate crawl
success, which must be checked separately.

Daemon-free deployment regression (Compose CLI required; no Docker daemon,
actual ingest, database, live school website, or real env file):

```sh
# BASELINE is an immutable code-only checkout before this patch.
# TMPDIR, HOME and DOCKER_CONFIG should point to task-local fixture/cache paths.
COMPOSE_BIN=/absolute/path/to/verified/docker-compose \
UNICOURSE_BASELINE_ROOT="$BASELINE" \
UNICOURSE_TEST_ROOT="$PWD" \
GOMAXPROCS=1 GOMEMLIMIT=128MiB PYTHONDONTWRITEBYTECODE=1 \
/usr/bin/python3 deploy/tests/test_ingest_healthcheck.py
```

The test renders real effective Compose with synthetic substitutions and models
its override of the Dockerfile healthcheck. It executes the original probe
against a synthetic loopback HTTP fixture (only its URL is remapped), and runs
the refresh shell commands with a task-local fake Docker executable to check
successful, failed, missing and still-running job outcomes. This is not a live
Docker inheritance/ingest integration test, and is not part of `just check` yet.
