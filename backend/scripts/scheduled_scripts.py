"""
Run scheduled scripts based on a YAML/JSON config or an env var.

Config format (YAML):
timezone: Europe/Vienna
jobs:
  - name: enrich_company_travel_times
    schedule: "0 1 * * *"
    command: "python scripts/enrich_company_travel_times.py"
    enabled: true
    allow_overlap: false
    shell: false
    env:
      SOME_VAR: "value"
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shlex
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import yaml
from croniter import croniter

DEFAULT_CONFIG_PATH = Path(__file__).with_name("scheduled_jobs.yml")
DEFAULT_TIMEZONE = "Europe/Vienna"


@dataclass(frozen=True)
class JobDefinition:
    name: str
    schedule: str
    command: str
    timezone: str
    enabled: bool
    allow_overlap: bool
    shell: bool
    env: Dict[str, str]


@dataclass
class JobState:
    next_run: datetime
    process: Optional[subprocess.Popen] = None
    last_started: Optional[datetime] = None
    last_finished: Optional[datetime] = None
    last_exit_code: Optional[int] = None


def setup_logger(level: str) -> logging.Logger:
    logger = logging.getLogger("scheduled-scripts")
    logger.setLevel(level)
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(levelname)s] %(message)s")
    handler.setFormatter(formatter)
    if not logger.handlers:
        logger.addHandler(handler)
    return logger


def load_config_from_env(logger: logging.Logger) -> Optional[Dict[str, Any]]:
    raw = os.getenv("SCHEDULED_JOBS")
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        try:
            return yaml.safe_load(raw)
        except yaml.YAMLError as exc:
            logger.error("Failed to parse SCHEDULED_JOBS: %s", exc)
            return None


def load_config_from_file(path: Path, logger: logging.Logger) -> Dict[str, Any]:
    if not path.exists():
        logger.warning("Scheduled jobs file not found: %s", path)
        return {}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        logger.error("Failed to read scheduled jobs file: %s", exc)
        return {}
    try:
        return yaml.safe_load(text) or {}
    except yaml.YAMLError as exc:
        logger.error("Failed to parse scheduled jobs file: %s", exc)
        return {}


def normalize_env(env: Optional[Dict[str, Any]]) -> Dict[str, str]:
    if not env:
        return {}
    return {str(key): str(value) for key, value in env.items()}


def parse_jobs(config: Dict[str, Any], logger: logging.Logger) -> List[JobDefinition]:
    timezone_default = str(config.get("timezone") or DEFAULT_TIMEZONE)
    jobs = []
    for item in config.get("jobs", []) or []:
        name = str(item.get("name") or "").strip()
        schedule = str(item.get("schedule") or "").strip()
        command = str(item.get("command") or "").strip()
        if not name or not schedule or not command:
            logger.warning("Skipping job with missing name/schedule/command: %s", item)
            continue
        job = JobDefinition(
            name=name,
            schedule=schedule,
            command=command,
            timezone=str(item.get("timezone") or timezone_default),
            enabled=bool(item.get("enabled", True)),
            allow_overlap=bool(item.get("allow_overlap", False)),
            shell=bool(item.get("shell", False)),
            env=normalize_env(item.get("env")),
        )
        jobs.append(job)
    return jobs


def compute_next_run(schedule: str, tz_name: str, base_time: Optional[datetime] = None) -> datetime:
    tz = ZoneInfo(tz_name)
    now = base_time or datetime.now(tz)
    iterator = croniter(schedule, now)
    next_time = iterator.get_next(datetime)
    if next_time.tzinfo is None:
        next_time = next_time.replace(tzinfo=tz)
    return next_time


def start_job(job: JobDefinition, logger: logging.Logger, cwd: Path) -> subprocess.Popen:
    env = os.environ.copy()
    env.update(job.env)
    if job.shell:
        logger.info("Starting job %s (shell): %s", job.name, job.command)
        return subprocess.Popen(job.command, shell=True, cwd=cwd, env=env)
    logger.info("Starting job %s: %s", job.name, job.command)
    return subprocess.Popen(shlex.split(job.command), cwd=cwd, env=env)


def build_state_for_jobs(jobs: Dict[str, JobDefinition], old_states: Dict[str, JobState]) -> Dict[str, JobState]:
    new_states: Dict[str, JobState] = {}
    for name, job in jobs.items():
        state = old_states.get(name)
        now = datetime.now(ZoneInfo(job.timezone))
        next_run = compute_next_run(job.schedule, job.timezone, now)
        if state and state.process and state.process.poll() is None:
            state.next_run = next_run
            new_states[name] = state
        else:
            new_states[name] = JobState(next_run=next_run)
    return new_states


def scheduler_loop(args: argparse.Namespace, logger: logging.Logger) -> None:
    config_path = Path(args.config) if args.config else Path(
        os.getenv("SCHEDULED_JOBS_FILE", str(DEFAULT_CONFIG_PATH))
    )
    config_signature = ""
    jobs: Dict[str, JobDefinition] = {}
    states: Dict[str, JobState] = {}
    cwd = Path(__file__).resolve().parents[1]

    while True:
        config = load_config_from_env(logger)
        if config is None:
            config = load_config_from_file(config_path, logger)
        signature = json.dumps(config, sort_keys=True, default=str)
        if signature != config_signature:
            config_signature = signature
            job_list = parse_jobs(config, logger)
            jobs = {job.name: job for job in job_list if job.enabled}
            states = build_state_for_jobs(jobs, states)
            logger.info("Loaded %s scheduled job(s)", len(jobs))

        if not jobs:
            time.sleep(args.poll_interval)
            continue

        for name, state in list(states.items()):
            if name not in jobs:
                states.pop(name, None)
                logger.info("Job removed from schedule: %s", name)
                continue
            if state.process and state.process.poll() is not None:
                state.last_finished = datetime.now(timezone.utc)
                state.last_exit_code = state.process.returncode
                logger.info("Job %s finished with code %s", name, state.last_exit_code)
                state.process = None

        for name, job in jobs.items():
            state = states.get(name)
            if state is None:
                state = JobState(next_run=compute_next_run(job.schedule, job.timezone))
                states[name] = state
            now = datetime.now(ZoneInfo(job.timezone))
            if state.next_run <= now:
                if state.process and not job.allow_overlap:
                    logger.info("Job %s skipped (still running)", name)
                else:
                    state.process = start_job(job, logger, cwd)
                    state.last_started = datetime.now(timezone.utc)
                state.next_run = compute_next_run(job.schedule, job.timezone, now)

        next_times = [state.next_run.astimezone(timezone.utc) for state in states.values()]
        if next_times:
            delta_seconds = (min(next_times) - datetime.now(timezone.utc)).total_seconds()
            sleep_seconds = max(1, int(delta_seconds))
            time.sleep(min(args.poll_interval, sleep_seconds))
        else:
            time.sleep(args.poll_interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run scheduled scripts from config.")
    parser.add_argument("--config", help="Path to YAML config file.")
    parser.add_argument("--poll-interval", type=int, default=30, help="Seconds between config reload checks.")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    logger = setup_logger(args.log_level.upper())
    scheduler_loop(args, logger)


if __name__ == "__main__":
    main()
