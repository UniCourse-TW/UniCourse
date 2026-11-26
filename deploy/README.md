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
