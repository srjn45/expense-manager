# Releasing Expense Manager

How to cut a new public release. The promotional site's **Download for Android**
buttons link to a fixed URL that GitHub redirects to the newest release:

```
https://github.com/srjn45/expense-manager/releases/latest/download/expense-manager.apk
```

> ⚠️ **The asset MUST be named `expense-manager.apk` on every release.** GitHub's
> `releases/latest/download/<name>` redirect only works if `<name>` is identical
> across releases. A versioned filename (e.g. `expense-manager-1.1.0.apk`) breaks
> the website button. Keep the version in the release **tag/title**, not the file.

Prerequisites and the sideload walkthrough live in
[`doc/android-install.md`](doc/android-install.md).

---

## 1. Bump the version

Set the same version in both files:

- `apps/mobile/app.json` → `expo.version`
- `apps/mobile/package.json` → `version`

Commit on a branch and merge to `main` before building, so the release is cut
from `main`.

## 2. (Only if the icon/branding changed) regenerate the icon set

The app icon is generated from vector sources in `apps/mobile/assets/logo/`:

```bash
node apps/mobile/assets/logo/render.cjs
```

This rewrites `apps/mobile/assets/images/*.png` (icon, adaptive
foreground/background/monochrome, splash, favicon) and the website images under
`docs/assets/`. Commit those too. Skip this step for a normal release.

## 3. Build the Android APK (EAS)

From `apps/mobile`, with the **`preview`** profile (it produces a directly
installable APK — see `apps/mobile/eas.json`):

```bash
cd apps/mobile
npx eas-cli@latest whoami   # confirm you're logged in (e.g. srjn45)
npx eas-cli@latest build --platform android --profile preview
```

The build runs in Expo's cloud (~10–20 min) and reuses the EAS-managed keystore,
so updates install in place over a previous version without wiping data.

## 4. Download the APK

Grab the artifact URL for the finished build and save it as `expense-manager.apk`:

```bash
# newest finished Android build's APK url
URL=$(npx eas-cli@latest build:list --platform android --limit 1 --non-interactive --json \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['artifacts']['applicationArchiveUrl'])")

curl -sL "$URL" -o expense-manager.apk
```

(You can also download it from the build details page on `expo.dev`.)

## 5. Create the GitHub Release

Tag on `main`, and attach the APK **with the exact `expense-manager.apk` name**:

```bash
gh release create v1.1.0 ./expense-manager.apk#expense-manager.apk \
  --repo srjn45/expense-manager \
  --target main \
  --title "Expense Manager v1.1.0" \
  --notes "What changed in this release…"
```

The `#expense-manager.apk` suffix sets the uploaded asset's display name — keep
it constant even if your local file is named differently.

## 6. Verify

```bash
curl -sL -o /dev/null -w '%{http_code} %{content_type}\n' \
  https://github.com/srjn45/expense-manager/releases/latest/download/expense-manager.apk
# expect: 200 application/vnd.android.package-archive
```

The website updates automatically — its button points at the redirect above, so
there's no site change to deploy for a new release.

---

## iOS / Play Store

Out of scope for now (no Apple Developer account; Play Store submission not
wired up). See `doc/android-install.md` → *Out of scope (future)* and the master
plan §8.
