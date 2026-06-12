# LegalCode Desktop

The standalone LegalCode desktop app, built with Electron on top of the OpenCode runtime.

## Download

[Download LegalCode Desktop](https://github.com/user-in-search-of-a-name/legalcode/releases/latest)

Release builds should publish user-ready installers with LegalCode names:

| Platform | Installer |
| --- | --- |
| macOS Apple Silicon | `legalcode-desktop-mac-arm64.dmg` |
| macOS Intel | `legalcode-desktop-mac-x64.dmg` |
| Windows | `legalcode-desktop-win-x64.exe` |
| Linux | `legalcode-desktop-linux-x64.AppImage`, `.deb`, or `.rpm` |

Maintainers can run the `legalcode desktop release` GitHub Actions workflow to create or update the release assets behind the download URL. The OSS workflow skips signing with `LEGALCODE_SKIP_SIGNING=true`; production-grade distribution should add Apple notarization and Windows code signing.

## Development

```bash
bun install
bun dev
```

## Build

Run the `build` script to build the app's JS assets, then `package` to
bundle the assets as an application. The resulting app will be in `dist/`.

```bash
bun run build && bun run package
```
