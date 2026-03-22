# 多智能体论文改进系统

一个面向论文诊断、结构优化、逻辑审查、文献对照与写作润色的透明化多智能体协同系统。

本项目不仅输出最终建议，还会把任务分发、章节切分、智能体回执、冲突关系和总控汇总过程对用户透明展示，适合用于论文深度修改、教学演示和研究验证。

## 项目定位

- 面向论文改进，而不是泛化聊天问答
- 强调透明过程，而不是黑箱式“一次性答案”
- 支持章节级问题定位、冲突图谱和最终修订路线
- 提供前后端完整产品化界面，适合作为开源项目继续迭代

## 核心能力

- 多智能体协同审查：结构、逻辑、文献、写作 4 个专家智能体 + 1 个总控编辑
- 透明化工作流：事件流、Prompt Trace、Agent Findings、Chief Decision
- 章节级洞察：自动切分章节、查看每章命中问题与建议
- 冲突图谱：展示不同智能体在同一章节或同一问题链上的关联与冲突
- 导出能力：支持 Markdown、Word 友好文本、DOCX 报告导出
- 运行时并发控制：可设置真实评审并发数，适配不同模型平台限流策略

## 系统页面

- `/` 项目总览 / 产品首页
- `/upload` 新建分析任务
- `/project/:id/progress` 透明进度页
- `/project/:id/chapter/:chapterNo` 章节详情页
- `/project/:id/report` 最终诊断报告页
- `/help` 帮助文档中心
- `/system-check` 系统检查与模型配置页

## 技术栈

### 前端
- Vue 3
- Vite
- Tailwind CSS
- Pinia
- Vue Router

### 后端
- Node.js
- Express
- TypeScript
- Prisma
- SQLite

### 文档解析
- `pdf-parse`
- `mammoth`

## 目录结构

```text
.
├── backend/                  # 后端服务
│   ├── prisma/               # Prisma schema 与数据库
│   └── src/
│       ├── agents/           # 专家智能体与总控逻辑
│       ├── engine/           # 工作流、黑板、活动追踪
│       ├── modules/          # upload / project / system 等路由模块
│       ├── parser/           # PDF / DOCX / chapter splitter
│       └── llm/              # OpenAI 兼容 LLM 调用封装
├── frontend/                 # 前端界面
│   └── src/
│       ├── pages/            # 首页、上传、进度、报告、帮助等页面
│       ├── lib/              # API 与前端格式化逻辑
│       └── store/            # Pinia 状态管理
├── docs/                     # 示例论文、补充文档
├── start.sh                  # macOS / Linux 一键启动
└── start.bat                 # Windows 一键启动
```

## 快速启动

### 1. 环境要求

- Node.js 18+
- npm 9+

### 2. 配置环境变量

复制模板：

```bash
cp .env.example .env
```

在根目录 `.env` 中填写 OpenAI 兼容模型配置：

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"

CHIEF_API_URL=https://your-openai-compatible-endpoint/v1
CHIEF_API_KEY=sk-xxxx
CHIEF_MODEL=qwen3-max

STRUCTURE_API_URL=https://your-openai-compatible-endpoint/v1
STRUCTURE_API_KEY=sk-xxxx
STRUCTURE_MODEL=qwen3-max

LOGIC_API_URL=https://your-openai-compatible-endpoint/v1
LOGIC_API_KEY=sk-xxxx
LOGIC_MODEL=qwen3-max

LITERATURE_API_URL=https://your-openai-compatible-endpoint/v1
LITERATURE_API_KEY=sk-xxxx
LITERATURE_MODEL=qwen3-max

WRITING_API_URL=https://your-openai-compatible-endpoint/v1
WRITING_API_KEY=sk-xxxx
WRITING_MODEL=qwen3-max
```

可选：

```env
REVIEW_MAX_CONCURRENCY=1
```

说明：
- 推荐默认 `1`，更适合限流友好模式
- 如果你的模型平台额度充足，可以尝试调到 `2-4`

### 3. 安装依赖

前端：

```bash
cd frontend
npm install
```

后端：

```bash
cd backend
npm install
```

### 4. 初始化数据库

```bash
cd backend
npx prisma db push
npx prisma generate
```

### 5. 启动项目

macOS / Linux：

```bash
chmod +x start.sh
./start.sh
```

Windows：

```bat
start.bat
```

### 6. 访问地址

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`
- 系统检查页：`http://localhost:5173/system-check`

## 使用方式

### 正常使用路径

1. 打开首页，查看项目总览或产品介绍
2. 进入系统检查页，确认 API Key、模型地址和并发设置正常
3. 在上传页选择论文，并设置评审并发数
4. 进入透明进度页，查看解析状态、章节切分、日志和冲突图谱
5. 必要时进入章节详情页逐章查看问题
6. 完成后进入诊断报告页导出报告

### 一键 Demo

首页和帮助中心提供 Demo 入口，可直接生成一份可浏览的示例项目。

## 系统检查与调优

系统检查页可查看：

- 当前环境
- 数据库是否已配置
- 每个智能体的 API URL、模型、密钥是否加载
- 当前评审并发数

你也可以直接在系统检查页修改并发数，适配不同平台的限流策略。

## 导出能力

报告页当前支持导出：

- Markdown
- Word 友好文本（TXT）
- DOCX

适合做项目留档、论文指导记录、课程展示和修改报告归档。

## 开源与许可说明

本项目是开源项目，但**不可商用**。

你可以：
- 学习、研究、教学演示
- 个人非商业修改与二次开发
- 在非商业场景中引用或展示本项目

你不可以：
- 将本项目整体或改造后版本用于商业销售
- 作为收费 SaaS、闭源咨询产品、商业服务的一部分直接分发
- 移除原许可并进行未经授权的商业包装

详细条款请查看：

- `LICENSE`
- `NOTICE`

## 维护建议

- 如果模型平台频繁限流，优先把并发数设置为 `1`
- 如果输出中仍存在较多英文，可以继续增强术语白名单与字段级中文化规则
- 如果需要更稳定的大文件解析，建议后续引入更强的 PDF 结构化解析器

## 已知边界

- PDF 提取质量受源文件质量影响
- 开创性英文论文在审查结果中可能保留极少数算法名和论文标题原文
- 极端限流情况下，即使有重试和限流友好模式，也可能出现上游失败

## 贡献

欢迎通过 Issue / PR 的方式继续完善：

- 可访问性与对比度优化
- 更强的章节定位
- 更稳定的字段级中文化
- 更丰富的导出格式
- 多轮审查策略与更智能的冲突协调
