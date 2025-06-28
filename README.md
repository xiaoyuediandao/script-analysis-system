# 剧本分析系统 (Script Analysis System)

一个基于AI的剧本分析工具，专门用于影视制作中的接戏问题分析。系统能够解析剧本文件，提取角色服装、道具状态等信息，并生成详细的分析报告和知识图谱可视化。

## 功能特性

- 📄 **剧本解析**: 自动识别场景、角色、对话和动作描述
- 🤖 **AI分析**: 使用火山引擎大模型分析角色服装和道具状态
- 🕸️ **知识图谱**: 可视化展示实体关系，支持交互式图谱浏览
- ⏰ **时间线排序**: 按时间顺序整理场景序列
- 📊 **可视化展示**: 现代化的Web界面展示分析结果
- � **智能过滤**: 支持按实体类型过滤图谱显示
- �📋 **报告生成**: 生成详细的接戏分析报告
- 💾 **数据导出**: 支持导出分析报告和图谱数据

## 快速开始

### 1. 环境配置

```bash
# 克隆项目
git clone <repository-url>
cd WE3

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的火山引擎API密钥和模型ID
```

### 2. 启动应用

```bash
# 构建项目
npm run build

# 启动Web服务器
npm run web

# 或者使用开发模式（自动重启）
npm run web-dev
```

### 3. 环境变量配置

在 `.env` 文件中配置以下变量：

```bash
# 火山引擎方舟API配置（必需）
ARK_API_KEY=your_api_key_here
ARK_MODEL_ID=your_model_id_here

# Web服务器端口（可选，默认3000）
PORT=3000
```

**获取火山引擎API配置：**
1. 访问 [火山引擎方舟平台](https://ark.cn-beijing.volces.com/)
2. 创建API密钥并获取 `ARK_API_KEY`
3. 创建推理接入点并获取 `ARK_MODEL_ID`

### 4. 使用Web界面

1. 打开浏览器访问 `http://localhost:3000`
2. 在"上传剧本"页面选择或拖拽 `.txt` 格式的剧本文件
3. 等待系统自动分析（包括解析、AI分析、时间线排序等步骤）
4. 在不同页面查看分析结果：
   - **场景解析**: 查看识别出的所有场景信息
   - **实体分析**: 查看AI分析的角色服装、道具状态
   - **知识图谱**: 交互式查看实体关系图谱
   - **时间线**: 查看按时间排序的场景序列
   - **分析报告**: 查看完整的分析报告并支持导出

## 命令行使用

如果您更喜欢命令行方式：

```bash
# 运行原始的命令行版本
npm start
```

## 项目结构

```
WE3/
├── src/                    # 源代码
│   ├── parser/            # 剧本解析模块
│   ├── extractor/         # 实体提取模块
│   ├── timeline/          # 时间线排序模块
│   ├── reporting/         # 报告生成模块
│   ├── services/          # 外部服务（火山引擎API）
│   └── web/               # Web服务器
├── web/public/            # 前端静态文件
├── __tests__/             # 测试文件和示例数据
└── dist/                  # 编译输出
```

## API接口

Web服务器提供以下REST API接口：

- `POST /api/upload` - 上传剧本文件
- `GET /api/status/:sessionId` - 获取分析状态
- `GET /api/scenes/:sessionId` - 获取场景列表
- `GET /api/analysis/:sessionId` - 获取分析结果
- `GET /api/timeline/:sessionId` - 获取时间线数据
- `GET /api/report/:sessionId` - 获取分析报告

## 技术栈

- **后端**: Node.js + TypeScript + Express.js
- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **AI服务**: 火山引擎方舟大模型
- **文件处理**: Multer
- **构建工具**: TypeScript Compiler

## 开发

```bash
# 安装开发依赖
npm install

# 运行测试
npm test

# 开发模式（自动重新编译）
npm run dev        # 命令行版本
npm run web-dev    # Web版本
```

## 配置说明

### 环境变量

- `ARK_API_KEY`: 火山引擎方舟API密钥（必需）
- `PORT`: Web服务器端口（可选，默认3000）

### 支持的剧本格式

系统支持标准的剧本文本格式，能够识别：
- 场景标识符（如 "1. EXT." 或 "## 1. 办公室 日内"）
- 角色对话
- 动作描述
- 场景信息（内景/外景、时间等）

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

ISC License
