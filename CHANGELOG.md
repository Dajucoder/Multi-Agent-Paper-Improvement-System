# Changelog

## Unreleased

### Internationalization (i18n)

- 添加前端完整中英文国际化支持（200+ 翻译键）
- 添加后端活动消息国际化支持（`backend/src/lib/activity-i18n.ts`）
- 后端 API 返回双语内容，支持按需切换语言

### Project Management APIs

- 新增项目删除 API（级联清理所有相关数据）
- 新增项目重新分析 API（`POST /api/projects/:projectId/re-run`）

### System Configuration

- 新增代理配置持久化功能（在线修改 API URL/Key/Model 并保存到 `.env`）
- 新增连通性测试 API（`POST /api/system/diagnostics/connectivity`）
- 新增代理配置更新 API（`POST /api/system/diagnostics/agents/:agentName`）
- 连通性测试返回详细状态码、耗时与错误摘要

### Bug Fixes & Improvements

- 修复重新分析时章节结构可能退化为 `Full Document (Unstructured)` 的问题，并为新项目持久化原始解析文本
- 改进章节切分启发式，降低英文论文在重新分析时把小节编号误识别为主章节的概率
- 更新 README 启动、关闭、重启、单独启动与常见问题说明
- 重构首页为"产品首页 + 项目工作台"双态首页
- 新增帮助中心、系统检查页、章节详情页
- 新增透明化活动追踪、SSE 实时流、章节切分详情与冲突图谱
- 新增 Demo 项目一键体验
- 修复 `.env` 根目录读取问题
- 新增限流友好模式、重试机制与可配置评审并发数
- 新增 Markdown / TXT / DOCX 报告导出
- 增强前端可读性与对比度，修复多处文字与背景融合问题
- 增强中文输出策略，并对前端 judgement / severity / issue type 做中文映射

## 0.1.0

- Initial MVP for Multi-Agent Paper Improvement System
