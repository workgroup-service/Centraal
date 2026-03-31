# Centraal

<p align="center">
  <img src="public/centraal_icon.png" alt="Centraal" width="128" />
</p>

GitLab の自分担当 Issue を一覧表示し、作業時間を計測、退勤時に GitLab へ工数を自動送信するデスクトップアプリ。

## 前提条件

- [Node.js](https://nodejs.org/) v18 以上
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- 各 OS のシステム依存パッケージ（後述）

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run tauri dev
```

## 本番ビルド

### macOS

必要な依存: Xcode Command Line Tools

```bash
xcode-select --install   # 未インストールの場合
npm run tauri build
```

成果物:

- `src-tauri/target/release/bundle/dmg/centraal_0.1.0_aarch64.dmg`
- `src-tauri/target/release/bundle/macos/centraal.app`

### Windows

必要な依存: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)、[WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

```powershell
npm run tauri build
```

成果物:

- `src-tauri\target\release\bundle\msi\centraal_0.1.0_x64_en-US.msi`
- `src-tauri\target\release\bundle\nsis\centraal_0.1.0_x64-setup.exe`

### Linux

必要な依存 (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

必要な依存 (Fedora):

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libxdo-devel libappindicator-gtk3-devel librsvg2-devel
```

必要な依存 (Arch):

```bash
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file openssl \
  xdotool libappindicator-gtk3 librsvg
```

ビルド:

```bash
npm run tauri build
```

成果物:

- `src-tauri/target/release/bundle/deb/centraal_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/centraal_0.1.0_amd64.AppImage`
- `src-tauri/target/release/bundle/rpm/centraal-0.1.0-1.x86_64.rpm`

## クロスコンパイルについて

Tauri はネイティブアプリのためクロスコンパイルに対応していません。各 OS 向けのビルドは、その OS 上で実行する必要があります。CI/CD で複数 OS 向けにビルドする場合は、GitHub Actions / GitLab CI の matrix ジョブを使用してください。
