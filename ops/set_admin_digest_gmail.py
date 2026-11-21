"""Install Gmail digest credentials from stdin without putting them in command arguments."""

import argparse
import os
import re
import stat
import sys
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", type=Path, default=Path("/etc/waki.env"))
    args = parser.parse_args()

    password = re.sub(r"\s", "", sys.stdin.readline())
    if not re.fullmatch(r"[A-Za-z0-9]{16}", password):
        raise SystemExit("Expected a 16-character Gmail app password on stdin.")

    target = args.env_file
    current_stat = target.stat()
    updates = {
        "ADMIN_DIGEST_EMAILS": "wakipedia1682@gmail.com",
        "ADMIN_DIGEST_GMAIL_USER": "wakipedia1682@gmail.com",
        "ADMIN_DIGEST_GMAIL_APP_PASSWORD": password,
    }
    retired_keys = {"ADMIN_DIGEST_SES_FROM_EMAIL"}
    lines = [
        line for line in target.read_text(encoding="utf-8").splitlines()
        if line.split("=", 1)[0] not in updates and line.split("=", 1)[0] not in retired_keys
    ]
    lines.extend(f"{key}={value}" for key, value in updates.items())

    fd, temp_name = tempfile.mkstemp(prefix=".waki-env-", dir=target.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            os.fchmod(stream.fileno(), stat.S_IMODE(current_stat.st_mode))
            os.fchown(stream.fileno(), current_stat.st_uid, current_stat.st_gid)
            stream.write("\n".join(lines) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, target)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)

    print("Administrator Gmail digest settings installed.")


if __name__ == "__main__":
    main()
