import { AnalysisResultLine } from '../extractor/entityExtractor';

export class ReportGenerator {
  /**
   * 将AI分析生成的、已格式化的结果行拼接成最终报告。
   * @param results - 从AI获取的分析结果行数组。
   * @returns {string} - 格式化后的完整报告字符串。
   */
  public static generate(results: AnalysisResultLine[]): string {
    console.log("开始生成分析报告...");
    const report = results.join('\n');
    console.log("报告生成完成。");
    return report;
  }
} 