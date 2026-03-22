# 基于多智能体协同的毕业论文深度改进系统

这是一个面向大学生的多智能体论文协同诊断与优化系统。它不仅仅是“多个独立 AI 工具的集合”，而是一个**围绕整篇论文展开的协同研究系统**。

学生只需上传论文，系统内部会自动组织 1个总控协调智能体(Chief Editor Agent) 和 4个核心分析智能体(Structure, Logic, Literature, Writing)，通过**中心编排 + 共享黑板 + 多轮协商**的机制，对论文进行全文拆解、多维分析、交叉验证。

最终为本科/硕博毕业生输出一份 **深度诊断 + 分章节修改建议 + 全局优化路线图**。

## 核心特性
- **全文协同研究**: 自动切分章节，多智能体并行分析并交叉审议。
- **共享黑板机制 (Blackboard)**: 智能体在黑板上交换信息，解决冲突。
- **深度诊断**: 找出根本原因(Root Cause)，而不是单纯改错别字。
- **自定义 LLM 接口**: 允许用户在 `.env` 中为每个智能体独立配置 API Key / URL (支持 OpenAI、以及兼容套壳的本地/开源大模型)。
- **精美前端体验**: 提供工作台式的多智能体协同过程可视化界面。

## 技术栈
- **前端**: Vue 3 + Vite + TailwindCSS + Pinia + Vue Router
- **后端**: Node.js + Express + TypeScript + Prisma + SQLite (零配置运行)
- **文档解析**: pdf-parse, mammoth (DOCX)

## 快速启动指南

### 环境要求
- Node.js (v18+)

### 1. 配置环境变量
如果你还没有 `.env` 文件，请先拷贝一份模板：
```bash
cp .env.example .env
```
然后在 `.env` 中填入你的大模型 API URL 和 API Key：
```env
CHIEF_API_URL=https://api.openai.com/v1
CHIEF_API_KEY=sk-...
```

### 2. 运行脚本 (一键启动)

**对于 macOS / Linux:**
```bash
chmod +x start.sh
./start.sh
```

**对于 Windows:**
双击运行 `start.bat` 或者在终端执行：
```cmd
start.bat
```

### 3. 访问系统
- 前端工作台: `http://localhost:5173`
- 后端API服务: `http://localhost:3000`

## 针对个人或教育用途的非商业开源许可
本项目允许处于学习和个人研究目的的使用和修改。禁止未经授权的商业化包装和出售。详见 LICENSE 文件。
