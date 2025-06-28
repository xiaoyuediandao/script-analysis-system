import { ScriptParser } from './parser/scriptParser';
import { TimelineSorter } from './timeline/timelineSorter';
import { EntityExtractor } from './extractor/entityExtractor';
import { ReportGenerator } from './reporting/reportGenerator';
import * as fs from 'fs';
import path from 'path';

async function main() {
  console.log("项目启动！");

  try {
    const scriptPath = path.join(process.cwd(), '__tests__', 'mock-script.txt');
    const parser = new ScriptParser(scriptPath);

    // 1. 解析剧本
    console.log("开始解析剧本...");
    const scenes = await parser.parse();
    console.log(`剧本解析完成，共${scenes.length}个场景。`);
    if (scenes.length === 0) {
      console.log("未解析出任何场景，程序退出。");
      return;
    }
    console.log(`成功解析出 ${scenes.length} 个场景。`);

    // 2. 提取实体
    const extractor = new EntityExtractor(scenes);
    const analysisResults = await extractor.extract();
    console.log(`成功完成分析，共 ${analysisResults.length} 条记录。`);
    
    // 3. (暂时移除) 连续性分析
    // console.log("开始进行连续性分析...");
    // const analyzer = new ContinuityAnalyzer(entities, scenes);
    // const issues = analyzer.analyze();
    // console.log("连续性分析完成。");
    // console.log(`连续性分析完成，发现 ${issues.length} 个问题。`);

    // 4. 生成报告
    const report = ReportGenerator.generate(analysisResults);
    
    // 5. 输出并保存报告
    console.log("\n--- 剧本接戏分析报告 ---\n");
    console.log(report);
    console.log("\n---------------------\n");

    const reportPath = path.join(__dirname, '..', '..', 'analysis-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`报告已保存至 ${path.basename(reportPath)} 文件。`);

  } catch (error) {
    console.error("处理剧本时发生错误:", error);
  }
}

main(); 