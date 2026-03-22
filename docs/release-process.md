# Release Process

本项目以 Git tag 作为项目级版本基准，前后端 `package.json` 版本号与 tag 保持一致。

## 推荐步骤

1. 确认 `main` 分支内容已经可以发版，并完成必要的构建验证。
2. 更新 `CHANGELOG.md`，把待发布内容从 `Unreleased` 挪到正式版本段落。
3. 同步修改：
   - `backend/package.json`
   - `backend/package-lock.json`
   - `frontend/package.json`
   - `frontend/package-lock.json`
4. 在 `docs/releases/` 下新增对应版本说明，例如 `docs/releases/v0.2.0.md`。
5. 提交 release commit，例如：

```bash
git add CHANGELOG.md README.md backend/package*.json frontend/package*.json docs/releases .github/workflows/release.yml
git commit -m "chore(release): prepare v0.2.0"
```

6. 创建并推送 tag：

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin main
git push origin v0.2.0
```

## 自动发布

- `.github/workflows/release.yml` 会在推送 `v*` tag 时自动创建 GitHub Release。
- 若存在 `docs/releases/<tag>.md`，工作流会优先使用该文件作为 release body。
- 若不存在对应说明文件，工作流会退回到 GitHub 自动生成的 release notes。
