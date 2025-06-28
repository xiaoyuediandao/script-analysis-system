import * as fs from 'fs';
import * as path from 'path';

// 定义解析后场景的数据结构
export interface Scene {
  sceneNumber: number | null;
  location: string;
  timeOfDay: string; // INT./EXT.
  characters: string[];
  dialogue: string[];
  action: string[];
}

export class ScriptParser {
  private rawContent: string;

  constructor(filePath: string) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found at: ${absolutePath}`);
    }
    this.rawContent = fs.readFileSync(absolutePath, 'utf-8');
  }

  public parse(): Scene[] {
    console.log("开始解析剧本...");
    const scenes: Scene[] = [];
    // 支持中英文场景分隔符
    const sceneRegex = /((INT\.|EXT\.|内景|外景)[^\n]*)/g;
    const lines = this.rawContent.split(/\r?\n/);
    let currentScene: Scene | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 检查是否为场景分隔符，支持多种格式：
      // 1. "77. EXT." 或 "81. EXT/INT." (标准格式)
      // 2. "## 1. 场景描述 日外" (Markdown格式)
      // 3. "10 INT.日.（场景）描述" (带空格格式)
      const sceneMatch = line.match(/^(\d+)\.?\s*((?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|内景|外景)[^\n]*)/) || 
                         line.match(/^##\s*(\d+)\.\s*(.+?)(?:\s+(日内|日外|夜内|夜外))?$/);
      
      if (sceneMatch) {
        if (currentScene) {
          scenes.push(currentScene);
        }
        
        // 提取实际的章节号
        const extractedSceneNumber = parseInt(sceneMatch[1]);
        
        // 根据不同格式提取地点和时间
        const [location, timeOfDay] = (() => {
          // 原格式：INT./EXT.
          if (line.includes('INT.') || line.includes('EXT.') || line.includes('内景') || line.includes('外景')) {
            // 支持多种格式，包括 "10 INT.日.（一户民居）客厅"
            let match = line.match(/^\d+\.?\s*(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|内景|外景)[\s\-]*(.*?)([\s\-]*(?:白天|夜晚|日|晚|晨|Morning|Day|Night|Evening))?$/i);
            if (!match) {
              // 尝试匹配 "10 INT.日.（一户民居）客厅" 格式
              match = line.match(/^\d+\.?\s*(?:INT\.|EXT\.|内景|外景)(.*?)[\.\s]*(.*)/);
              if (match) {
                // 从匹配的内容中提取时间和地点
                const fullText = match[1] + match[2];
                const timeMatch = fullText.match(/^(日|夜|晨|晚|白天|夜晚|Morning|Day|Night|Evening)[\.\s]*(.*)/i);
                if (timeMatch) {
                  return [timeMatch[2]?.trim() || '', timeMatch[1]?.trim() || ''];
                } else {
                  return [fullText.trim(), ''];
                }
              }
            }
            if (match) {
              return [match[1]?.trim() || '', match[2]?.trim() || ''];
            }
          }
          // 新格式：## 1. 场景名 时间
          else if (line.startsWith('##')) {
            const match = line.match(/^##\s*\d+\.\s*(.+?)(?:\s+(日内|日外|夜内|夜外))?$/);
            if (match) {
              return [match[1]?.trim() || '', match[2]?.trim() || ''];
            }
          }
          return [line, ''];
        })();
        
        currentScene = {
          sceneNumber: extractedSceneNumber,
          location,
          timeOfDay,
          characters: [],
          dialogue: [],
          action: []
        };
        continue;
      }
      // 简单区分角色、对话、动作
      if (currentScene) {
        // 角色名检测：支持多种格式
        // 1. 原格式：全大写或中文后跟冒号
        // 2. 新格式：**角色名**（加粗）
        const boldCharMatch = line.match(/^\*\*(.+?)\*\*/);
        if (boldCharMatch || /^[\u4e00-\u9fa5A-Z0-9_]+[:：]$/.test(line)) {
          const charName = boldCharMatch ? boldCharMatch[1] : line.replace(/[:：]$/, '');
          if (!currentScene.characters.includes(charName)) {
            currentScene.characters.push(charName);
          }
          // 对话可能在同一行（新格式）或下一行（原格式）
          if (boldCharMatch) {
            // 新格式：**角色名**（括号内容）："对话内容"
            // 先提取括号中的描述作为动作
            const descMatch = line.match(/^\*\*.+?\*\*\s*（([^）]+)）/);
            if (descMatch) {
              currentScene.action.push(`${charName}：${descMatch[1]}`);
            }
            
            // 再提取对话
            const dialogueMatch = line.match(/^\*\*.+?\*\*.*?[：:]\s*["""](.+?)["""]/) || 
                                line.match(/^\*\*.+?\*\*.*?[：:](.+)$/);
            if (dialogueMatch) {
              currentScene.dialogue.push(dialogueMatch[1].trim());
            }
            
            // 提取冒号后的动作描述（如果有）
            const actionAfterColon = line.match(/[：:]([^"""]+)$/);
            if (actionAfterColon && !dialogueMatch) {
              currentScene.action.push(actionAfterColon[1].trim());
            }
          } else if (lines[i + 1] && lines[i + 1].trim()) {
            // 原格式：下一行是对话
            currentScene.dialogue.push(lines[i + 1].trim());
            i++;
          }
        } else if (/^[（(【\[].*[)）】\]]$/.test(line) || line.startsWith('*') && line.endsWith('*')) {
          // 括号内内容或斜体内容视为动作或备注
          const actionText = line.replace(/^\*|\*$/g, ''); // 去除斜体标记
          currentScene.action.push(actionText);
        } else {
          // 其他内容视为动作描述
          currentScene.action.push(line);
        }
      }
    }
    if (currentScene) {
      scenes.push(currentScene);
    }
    console.log(`剧本解析完成，共${scenes.length}个场景。`);
    return scenes;
  }
} 