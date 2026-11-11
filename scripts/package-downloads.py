#!/usr/bin/env python3
"""Create browser-ready distribution archives without third-party Python packages."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import os

root = Path(__file__).resolve().parent.parent
site = root / "_site"
dist = site / "dist"
downloads = site / "downloads"
downloads.mkdir(parents=True, exist_ok=True)
bundle_names = ("latch.js", "latch.min.js", "latch.esm.js")
for name in bundle_names:
    if not (dist / name).is_file():
        raise SystemExit(f"Build missing: {dist / name}")

version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
commit = os.environ.get("GITHUB_SHA", "local")[:12]
archive = downloads / "latch-latest.zip"
with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as package:
    for name in bundle_names:
        package.write(dist / name, arcname=name)
    package.writestr("VERSION.txt", f"Latch.js {version}\nCommit {commit}\n")
    package.writestr("INSTALLATION.txt", "Copiez latch.min.js dans votre dossier public puis chargez-le via <script src=\"/assets/latch.min.js\"></script>. Ensuite appelez Latch.start().\n")

hashes = []
for name in bundle_names:
    data = (dist / name).read_bytes()
    hashes.append(f"{hashlib.sha256(data).hexdigest()}  dist/{name}")
hashes.append(f"{hashlib.sha256(archive.read_bytes()).hexdigest()}  downloads/{archive.name}")
(downloads / "SHA256SUMS.txt").write_text("\n".join(hashes) + "\n", encoding="utf-8")

manifest = {"version": version, "commit": commit, "files": [
    {"name": name, "url": f"../dist/{name}", "bytes": (dist / name).stat().st_size}
    for name in bundle_names
] + [{"name": archive.name, "url": archive.name, "bytes": archive.stat().st_size}]}
(downloads / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Created {archive} ({archive.stat().st_size} bytes) and checksum manifest")
