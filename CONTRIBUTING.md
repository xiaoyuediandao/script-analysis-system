# 贡献指南 (Contributing Guide)

感谢您对剧本分析系统的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题 (Reporting Issues)

如果您发现了bug或有功能建议：

1. 检查是否已有相关的Issue
2. 创建新的Issue，包含：
   - 清晰的标题和描述
   - 重现步骤（对于bug）
   - 期望的行为
   - 实际的行为
   - 环境信息（操作系统、Node.js版本等）

### 提交代码 (Submitting Code)

1. **Fork** 项目到您的GitHub账户
2. **Clone** 您的fork到本地
3. 创建新的分支：`git checkout -b feature/your-feature-name`
4. 进行您的更改
5. 运行测试：`npm test`
6. 提交更改：`git commit -m "Add your feature"`
7. 推送到您的fork：`git push origin feature/your-feature-name`
8. 创建Pull Request

## 开发环境设置

```bash
# 克隆项目
git clone https://github.com/your-username/script-analysis-system.git
cd script-analysis-system

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 构建项目
npm run build

# 运行测试
npm test

# 启动开发服务器
npm run web-dev
```

## 代码规范

- 使用TypeScript编写代码
- 遵循现有的代码风格
- 为新功能添加测试
- 更新相关文档

## 提交信息规范

使用清晰的提交信息：

- `feat: 添加新功能`
- `fix: 修复bug`
- `docs: 更新文档`
- `style: 代码格式调整`
- `refactor: 重构代码`
- `test: 添加或修改测试`
- `chore: 构建过程或辅助工具的变动`

## Pull Request 指南

- 确保所有测试通过
- 更新相关文档
- 保持PR的范围小而专注
- 提供清晰的PR描述

## 许可证

通过贡献代码，您同意您的贡献将在MIT许可证下发布。
