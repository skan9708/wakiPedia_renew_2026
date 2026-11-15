"""Stage Solapi credentials in a systemd EnvironmentFile without enabling SMS."""

import argparse
import os
import re
import shutil
import stat
import tempfile
from datetime import datetime, timezone
from pathlib import Path


KEYS = ("SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_SENDER")
MANAGED_KEYS = (*KEYS, "PHONE_RECOVERY_ENABLED")


def stage(source: Path, target: Path) -> None:
    try:
        source_stat = source.stat()
        if not stat.S_ISREG(source_stat.st_mode) or source_stat.st_mode & 0o077:
            raise ValueError("Credential upload must be a private regular file (mode 0600).")

        values = {}
        for line in source.read_text(encoding="utf-8-sig").splitlines():
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            key, separator, value = line.partition("=")
            if not separator or key not in KEYS or key in values:
                raise ValueError("Credential upload must contain only the three Solapi settings.")
            values[key] = value.strip()
        if set(values) != set(KEYS):
            raise ValueError("A Solapi setting is missing.")
        if not all(re.fullmatch(r"[A-Za-z0-9_-]+", values[key]) for key in KEYS[:2]):
            raise ValueError("API credentials contain an unsupported character.")
        if not re.fullmatch(r"[0-9]{8,12}", values["SOLAPI_SENDER"]):
            raise ValueError("Sender number must be 8–12 digits without punctuation.")

        target_stat = target.stat()
        old_lines = target.read_text(encoding="utf-8").splitlines()
        kept_lines = [
            line for line in old_lines
            if line.partition("=")[0].strip() not in MANAGED_KEYS
        ]
        new_text = "\n".join([
            *kept_lines,
            *(f"{key}={values[key]}" for key in KEYS),
            "PHONE_RECOVERY_ENABLED=false",
            "",
        ])

        backup = target.with_name(
            f"{target.name}.before-solapi-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}"
        )
        shutil.copy2(target, backup)
        os.chmod(backup, 0o600)
        temporary_name = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=target.parent, prefix=".waki-env-",
                delete=False,
            ) as temporary:
                temporary_name = temporary.name
                os.fchmod(temporary.fileno(), 0o600)
                os.fchown(temporary.fileno(), target_stat.st_uid, target_stat.st_gid)
                temporary.write(new_text)
                temporary.flush()
                os.fsync(temporary.fileno())
            os.replace(temporary_name, target)
        finally:
            if temporary_name and os.path.exists(temporary_name):
                os.unlink(temporary_name)
        print("Solapi settings staged. Phone recovery remains disabled.")
    finally:
        source.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    arguments = parser.parse_args()
    stage(arguments.source, arguments.target)
