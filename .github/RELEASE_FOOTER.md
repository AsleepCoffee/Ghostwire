---

### Verify your download

SHA-256 checksums for every file are in **`SHA256SUMS.txt`** on this release. Check the file you downloaded matches before running it:

- **Windows (PowerShell):** `Get-FileHash .\GhostWire-Setup-__V__.exe -Algorithm SHA256`
- **Linux / macOS:** `sha256sum GhostWire-__V__.AppImage`

Compare the result against the matching line in `SHA256SUMS.txt`. If they differ, don't run it.

### Prefer to build it yourself?

GhostWire is fully open source — don't trust the binary, compile it. These are the exact commands CI used to produce this release:

```bash
git clone https://github.com/__REPO__.git
cd Ghostwire
git checkout __TAG__
npm ci
npm run build:win     # Windows installer  ->  dist/
npm run build:linux   # Linux AppImage/.deb -> dist/
```

Requires Node 22+. See the README's **Build from source** section for details.
