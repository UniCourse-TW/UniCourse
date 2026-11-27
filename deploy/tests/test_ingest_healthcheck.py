"""Daemon-free deploy contract: real Compose rendering and synthetic process/HTTP seams.

Compose renders the configuration without a daemon. The job fixtures simulate
CLI exit status and --rm cleanup.
"""
import http.server
import json
import os
from pathlib import Path
import select
import shlex
import shutil
import signal
import subprocess
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parents[2]
JOBS = ("ingest", "ingest-tvc")


def render():
    env = {name: os.environ[name] for name in ("PATH", "HOME", "TMPDIR", "DOCKER_CONFIG")
           if name in os.environ}
    env["DOCKER_HOST"] = "unix:///nonexistent/test-only.sock"
    with tempfile.TemporaryDirectory(prefix="compose-config-") as directory:
        env_file = Path(directory) / "synthetic.env"
        env_file.write_text("UNICOURSE_DB_PASSWORD=synthetic-not-a-secret\n"
                            "UNICOURSE_TAG=synthetic\n"
                            "UNICOURSE_HOST=synthetic.invalid\n")
        result = subprocess.run(
            ["docker", "compose", "-f", str(ROOT / "deploy/compose.yaml"),
             "--env-file", str(env_file), "--profile", "jobs", "config", "--format", "json"],
            env=env, text=True, capture_output=True, timeout=15)
    if result.returncode or result.stderr:
        raise AssertionError(f"Compose config exited {result.returncode}: {result.stderr}")
    return json.loads(result.stdout)


def image_probe(root):
    # Narrow, explicit parser for this Dockerfile's final single-line instruction.
    lines = (root / "deploy/Dockerfile.api").read_text().splitlines()
    last_from = max(i for i, line in enumerate(lines) if line.startswith("FROM "))
    health = [line for line in lines[last_from:] if line.startswith("HEALTHCHECK ")]
    assert len(health) == 1 and " CMD " in health[0], health
    return health[0].split(" CMD ", 1)[1]


def effective_probe(service, image_command):
    """Model Compose service override over the image (not an engine execution)."""
    health = service.get("healthcheck", {})
    if health.get("disable") or health.get("test") == ["NONE"]:
        return None
    return health.get("test", ["CMD-SHELL", image_command])


class DeploymentContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = render()
        cls.probe = image_probe(ROOT)

    def test_ingest_never_inherits_api_http_probe(self):
        for name in JOBS:
            with self.subTest(service=name):
                service = self.model["services"][name]
                self.assertEqual(service["image"], self.model["services"]["api"]["image"])
                self.assertEqual(service["command"][0], "unicourse-ingest")
                self.assertIsNone(effective_probe(service, self.probe),
                                  f"{name} still inherits API schools HTTP probe")

    def test_api_retains_image_probe(self):
        api = self.model["services"]["api"]
        self.assertEqual(effective_probe(api, self.probe), ["CMD-SHELL", self.probe])
        self.assertIn("curl -fsS http://127.0.0.1:3001/api/schools", self.probe)

    def run_http_probe(self, status):
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(status if self.path == "/api/schools" else 404)
                self.end_headers()
            def log_message(self, *args):
                pass
        server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            # Keep the Dockerfile shell command byte-exact. A task-local curl shim
            # maps only its fixed URL to an ephemeral synthetic HTTP fixture.
            with tempfile.TemporaryDirectory(prefix="api-probe-") as directory:
                shim = Path(directory) / "curl"
                real_curl = shutil.which("curl")
                self.assertIsNotNone(real_curl)
                shim.write_text("#!/bin/sh\n[ \"$#\" = 2 ] && [ \"$1\" = -fsS ] && "
                                "[ \"$2\" = http://127.0.0.1:3001/api/schools ] || exit 99\n"
                                + "exec " + shlex.quote(real_curl)
                                + f" -fsS http://127.0.0.1:{server.server_port}/api/schools\n")
                shim.chmod(0o700)
                return subprocess.run(["/bin/sh", "-c", self.probe],
                                      env={**os.environ, "PATH": directory + ":" + os.environ["PATH"]},
                                      capture_output=True, timeout=5).returncode
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=2)

    def test_api_probe_accepts_successful_schools_response(self):
        self.assertEqual(self.run_http_probe(200), 0)

    def test_api_probe_rejects_failed_schools_response(self):
        self.assertEqual(self.run_http_probe(500), 1)

    def job_fixture(self, variant, exit_code, missing=False, wait=False):
        unit = "unicourse-refresh-tvc.service" if variant == "ingest-tvc" else "unicourse-refresh.service"
        line = next(line for line in (ROOT / "deploy/systemd" / unit).read_text().splitlines()
                    if line.startswith("ExecStart="))
        command = shlex.split(line.split("=", 1)[1])
        directory = tempfile.TemporaryDirectory(prefix="job-outcome-")
        self.addCleanup(directory.cleanup)
        path = Path(directory.name)
        fixture = path / "docker"
        fixture.write_text(
            "#!/usr/bin/python3\nimport json, os, pathlib, sys\n"
            "args=sys.argv[1:]\n"
            "expected=['compose','--env-file','/srv/unicourse/secrets/compose.env','run','--rm']\n"
            "assert args[:-1] == expected, args\n"
            "name=args[-1]\n"
            "assert name in ['crawl','crawl-tvc','ingest','ingest-tvc'], name\n"
            "if name.startswith('crawl'): sys.exit(0)\n"
            "if os.environ['FIXTURE_MISSING'] == '1': sys.exit(125)\n"
            "record=pathlib.Path(os.environ['FIXTURE_RECORD'])\n"
            "record.write_text(json.dumps({'Status':'running','Healthcheck':'disabled'}))\n"
            "if os.environ['FIXTURE_WAIT'] == '1':\n"
            "    os.write(sys.stdout.fileno(), b'1')\n"
            "    sys.stdin.readline()\n"
            "record.unlink()  # synthetic --rm, on success AND failure\n"
            "sys.exit(int(os.environ['FIXTURE_EXIT']))\n")
        fixture.chmod(0o700)
        record = path / "state.json"
        proc = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, text=True, start_new_session=True,
                                env={**os.environ, "PATH": directory.name + ":" + os.environ["PATH"],
                                     "FIXTURE_RECORD": str(record), "FIXTURE_EXIT": str(exit_code),
                                     "FIXTURE_MISSING": str(int(missing)), "FIXTURE_WAIT": str(int(wait))})
        def cleanup():
            if proc.poll() is None:
                os.killpg(proc.pid, signal.SIGKILL)
            proc.communicate(timeout=5)
        self.addCleanup(cleanup)
        return proc, record

    def test_success_requires_observed_zero_exit_even_after_auto_removal(self):
        for job in JOBS:
            with self.subTest(job=job):
                proc, record = self.job_fixture(job, 0)
                proc.communicate(timeout=5)
                self.assertEqual(proc.returncode, 0)
                self.assertFalse(record.exists())

    def test_failed_exit_remains_failure_even_after_auto_removal(self):
        for job in JOBS:
            with self.subTest(job=job):
                proc, record = self.job_fixture(job, 17)
                proc.communicate(timeout=5)
                self.assertEqual(proc.returncode, 17)
                self.assertFalse(record.exists())

    def test_missing_job_is_not_success(self):
        for job in JOBS:
            with self.subTest(job=job):
                proc, record = self.job_fixture(job, 0, missing=True)
                proc.communicate(timeout=5)
                self.assertEqual(proc.returncode, 125)
                self.assertFalse(record.exists())

    def test_disabled_health_is_not_completed_job(self):
        for job in JOBS:
            with self.subTest(job=job):
                proc, record = self.job_fixture(job, 17, wait=True)
                ready, _, _ = select.select([proc.stdout], [], [], 5)
                self.assertTrue(ready, f"{job} readiness timed out")
                self.assertEqual(os.read(proc.stdout.fileno(), 1), b"1", f"{job} exited before readiness")
                self.assertEqual(json.loads(record.read_text())["Status"], "running")
                self.assertIsNone(proc.poll())
                proc.communicate(input="release\n", timeout=5)
                self.assertEqual(proc.returncode, 17)


if __name__ == "__main__":
    unittest.main(verbosity=2)
