# 自動アップデートのセットアップ

## 必要なパッケージ
```bash
npm install electron-updater electron-log
npm install --save-dev @types/electron-log
```

## GitHub Releases での配布手順

1. **package.json** の `build.publish` が設定済み：
   ```json
   "publish": {
     "provider": "github",
     "owner": "spiral-browser",
     "repo": "spiral"
   }
   ```
   ※ `owner` と `repo` を実際のGitHubリポジトリに変更してください。

2. **リリース用ビルド**：
   ```bash
   GH_TOKEN=your_github_token npm run pack
   ```
   これにより `release/` に `.dmg` と `.zip` + `latest-mac.yml` が生成されます。

3. **GitHub Release に公開**：
   生成された以下のファイルをGitHub Releaseにアップロード：
   - `Spiral-x.x.x.dmg`
   - `Spiral-x.x.x-mac.zip`
   - `latest-mac.yml`（必須・アップデーターがこれを見る）

4. 次回起動時に自動で新バージョンを検出します。
