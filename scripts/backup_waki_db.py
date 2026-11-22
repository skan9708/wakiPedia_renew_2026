"""Create a consistent, checked SQLite backup without stopping the web server."""

import argparse
import os
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote


BACKUP_NAME = re.compile(r"^waki-daily-(\d{8}-\d{6})\.sqlite3$")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=Path("/home/ubuntu/waki/backend/db.sqlite3"))
    parser.add_argument("--destination", type=Path, default=Path("/home/ubuntu/backups"))
    parser.add_argument("--keep-days", type=int, default=30)
    args = parser.parse_args()
    if args.keep_days < 1 or not args.database.is_file():
        parser.error("a real database and positive retention period are required")

    os.umask(0o077)
    args.destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    args.destination.chmod(0o700)
    now = datetime.now(timezone.utc)
    name = f"waki-daily-{now:%Y%m%d-%H%M%S}.sqlite3"
    target = args.destination / name
    temporary = args.destination / f".{name}.{os.getpid()}.tmp"

    try:
        source_uri = f"file:{quote(str(args.database.resolve()))}?mode=ro"
        with closing(sqlite3.connect(source_uri, uri=True, timeout=30)) as source:
            with closing(sqlite3.connect(temporary, timeout=30)) as snapshot:
                source.backup(snapshot, pages=1000, sleep=0.25)
                result = snapshot.execute("PRAGMA integrity_check").fetchone()
                if result != ("ok",):
                    raise RuntimeError(f"backup integrity check failed: {result}")
        temporary.chmod(0o600)
        with temporary.open("r+b") as stream:
            os.fsync(stream.fileno())
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)

    cutoff = now - timedelta(days=args.keep_days)
    removed = 0
    for candidate in args.destination.iterdir():
        match = BACKUP_NAME.fullmatch(candidate.name)
        if not match or not candidate.is_file() or candidate == target:
            continue
        created = datetime.strptime(match.group(1), "%Y%m%d-%H%M%S").replace(tzinfo=timezone.utc)
        if created < cutoff:
            candidate.unlink()
            removed += 1
    print(f"Created {target.name} ({target.stat().st_size} bytes); removed {removed} expired daily backups")


if __name__ == "__main__":
    main()
