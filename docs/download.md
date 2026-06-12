# Download LegalCode Desktop

Use this as the public download URL:

[Download LegalCode Desktop](https://github.com/user-in-search-of-a-name/legalcode/releases/latest)

The latest GitHub Release should contain free desktop installers for ordinary users. They should not need Bun, Node.js, Git, or terminal commands.

## Installer Names

| Platform | User-facing asset |
| --- | --- |
| macOS Apple Silicon | `legalcode-desktop-mac-arm64.dmg` |
| macOS Intel | `legalcode-desktop-mac-x64.dmg` |
| Windows | `legalcode-desktop-win-x64.exe` |
| Linux | `legalcode-desktop-linux-x64.AppImage`, `.deb`, or `.rpm` |

The signed production publish flow can also upload macOS app archives named `legalcode-desktop-mac-*.app.tar.gz` for update and verification workflows.

## Release Checklist

1. Build from a clean release branch.
2. Run the `legalcode desktop release` GitHub Actions workflow with a tag such as `v0.1.0`.
3. Confirm app name, installer name, and first-run screen say LegalCode.
4. Confirm the workflow uploaded installers to the GitHub Release for the version tag.
5. Keep the release notes short and user-facing:
   - what changed,
   - what is still lawyer-reviewed only,
   - known limitations,
   - how to report issues.
6. Link the download button to `https://github.com/user-in-search-of-a-name/legalcode/releases/latest`.

The OSS release workflow sets `LEGALCODE_SKIP_SIGNING=true` so contributors can publish free builds without Apple or Windows signing certificates. Signed and notarized builds should be added before a broader public launch, especially for macOS and Windows users who expect operating-system trust prompts to be minimal.

## User Promise

LegalCode Desktop is free, local-first, and bring-your-own-key for external AI and legal data sources in the open-source edition. Matter data starts on the user's device, and legal outputs remain human-approved before filing, export, or external writeback.
