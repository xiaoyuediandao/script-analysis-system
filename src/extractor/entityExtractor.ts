import { Scene } from '../parser/scriptParser';
import { volcanoClient, VOLCANO_CHAT_MODEL_ID } from '../services/volcanoClient';

/**
 * AI分析后返回的、符合特定格式的单行报告。
 * e.g., "77. <extract>图恒宇：地球便服：整洁</extract>"
 */
export type AnalysisResultLine = string;

// 角色状态追踪
interface CharacterState {
  name: string;
  persistentFeatures: string[]; // 持续性特征（如伤疤）
  currentClothing: string | null; // 当前服装
  currentEquipment: Map<string, string>; // 当前装备及状态
}

export class EntityExtractor {
  private scenes: Scene[];
  private characterStates: Map<string, CharacterState> = new Map();

  constructor(scenes: Scene[]) {
    this.scenes = scenes;
  }

  /**
   * 更新角色状态追踪
   */
  private updateCharacterState(characterName: string, features: string[], clothing: string | null, equipment: Map<string, string>) {
    let state = this.characterStates.get(characterName);
    if (!state) {
      state = {
        name: characterName,
        persistentFeatures: [],
        currentClothing: null,
        currentEquipment: new Map()
      };
      this.characterStates.set(characterName, state);
    }

    // 更新持续性特征（只添加，不删除）
    features.forEach(f => {
      if (!state!.persistentFeatures.includes(f)) {
        state!.persistentFeatures.push(f);
      }
    });

    // 更新服装（如果有新的）
    if (clothing) {
      state.currentClothing = clothing;
    }

    // 更新装备状态
    equipment.forEach((status, item) => {
      state!.currentEquipment.set(item, status);
    });
  }

  /**
   * 获取角色的持续状态描述
   */
  private getCharacterPersistentState(characterName: string): string {
    const state = this.characterStates.get(characterName);
    if (!state || state.persistentFeatures.length === 0) {
      return '';
    }
    return state.persistentFeatures.join('；');
  }

  /**
   * 使用火山引擎大模型，根据指定提示词分析每个场景的服装/装备状态。
   * @returns {Promise<AnalysisResultLine[]>} 包含每个场景分析结果的字符串数组。
   */
  public async extract(): Promise<AnalysisResultLine[]> {
    console.log("开始使用新的提示词进行服装/装备状态分析...");
    let analysisResults: AnalysisResultLine[] = [];

    const promptTemplate = `
请严格根据以下【剧本】内容，识别角色的服装、穿戴装备及其状态变化。

**重点关注以下内容：**
1. 角色的服装描述（如：地球便服、航天服、港式打扮、制服等）
2. 装备的使用状态（如：备份卡的摘下、插入、拔出、挂回等动作）
3. 身体特征或装饰（如：伤疤、纹身、LED表情等）
4. 服装的状态描述（如：衣服敞着怀、头盔被阳光勾勒、低领等）
5. 装备的携带或操作状态（如：手里拿着、胳膊肘夹着、脖子挂着等）
6. **特别注意**：角色名后括号中的描述通常包含重要的服装/外貌信息

**已知角色持续状态：**
{{已知状态}}

**剧本**
{{剧本}}

## 输出格式规则 (必须严格遵守):
- 如果有多个角色或装备状态，用分号分隔，格式为：<extract>角色1:装备1：状态1；角色2:装备2：状态2</extract>
- 如果剧本内容明确描述了服装、装备或其状态变化，请详细描述
- 如果某角色有已知的持续状态（如伤疤、纹身），即使本场景未明确提及，也需要包含在输出中
- 如果剧本内容没有明确描述任何角色的服装或装备，且没有已知持续状态，请输出 <extract>无</extract>
- 括号中的描述（如"港式打扮"、"手里拎着喷漆"）应被视为重要信息
- 最终输出必须只有一行，且只包含 <extract> 标签和其内容

***以下为示例仅供参考***
**示例1**
<extract>莫西干头:拳击手套：脖子挂着；莫西干头:纹身：有</extract>

**示例2**
<extract>谢小盟:太阳帽：戴着；谢小盟:饮料：手中拿着</extract>

**示例3**
<extract>包世宏:画册：胳膊肘夹着；包世宏:试管：手里拿着</extract>

**示例4**
<extract>无</extract>
`;

    for (const scene of this.scenes) {
      if (!scene.sceneNumber) continue;

      // 构建已知状态信息
      let knownStates = '';
      const mentionedCharacters = new Set<string>();
      
      // 从动作描述中提取可能的角色名
      const actionText = scene.action.join(' ');
      // 通用的角色名匹配模式：
      // 匹配中文姓名格式（2-4个字符的中文名）
      const characterMatches = actionText.match(/([一-龯]{2,4})/g) || [];
      const quotedMatches = actionText.match(/["""]([一-龯]{2,4})["""]?/g) || [];
      
      // 也从场景的characters列表中获取角色
      scene.characters.forEach(char => mentionedCharacters.add(char));
      
      const allMatches = [...characterMatches, ...quotedMatches];
      
      if (allMatches.length > 0) {
        allMatches.forEach(name => {
          // 清理引号
          const cleanName = name.replace(/["""]/g, '');
          mentionedCharacters.add(cleanName);
        });
      }

      // 为提到的角色添加已知持续状态
      mentionedCharacters.forEach(character => {
        const persistentState = this.getCharacterPersistentState(character);
        if (persistentState) {
          knownStates += `${character}：${persistentState}\n`;
        }
      });

      // 提供场景信息和已知状态
      const sceneText = `场景${scene.sceneNumber}: ${scene.location}\n动作描述: ${scene.action.join(' ')}\n对话: ${scene.dialogue.join(' ')}`;
      const prompt = promptTemplate.replace('{{剧本}}', sceneText).replace('{{已知状态}}', knownStates || '无');

      try {
        if (!volcanoClient) {
          // 如果没有API客户端，返回模拟数据
          const mockResult = `${scene.sceneNumber}. <extract>模拟分析结果：场景${scene.sceneNumber}的角色状态分析</extract>`;
          analysisResults.push(mockResult);
          continue;
        }

        const completion = await volcanoClient.chat.completions.create({
          model: VOLCANO_CHAT_MODEL_ID,
          messages: [
            { role: "user", content: prompt },
          ],
          temperature: 0.0, // 使用低温以获得更确定性的、格式一致的输出
        });

        const content = completion.choices[0].message.content;
        let finalLine = '';
        if (content) {
          // 后处理：确保结果以<extract>开头
          const extractResult = content.match(/<extract>.*<\/extract>/)?.[0] || '<extract>无</extract>';
          
          // 解析AI返回的内容以更新状态追踪
          const extractContent = extractResult.replace(/<\/?extract>/g, '');
          if (extractContent !== '无') {
            // 简单解析：分号分隔多个条目，冒号分隔角色、装备和状态
            const entries = extractContent.split('；');
            entries.forEach(entry => {
              const parts = entry.split(/[:：]/);
              if (parts.length >= 3) {
                const characterName = parts[0].trim();
                const item = parts[1].trim();
                const status = parts[2].trim();
                
                // 判断是否是持续特征（如伤疤）
                if (item.includes('伤疤') || item.includes('伤痕')) {
                  this.updateCharacterState(characterName, [`${item}：${status}`], null, new Map());
                } else if (item.includes('服') || item.includes('装')) {
                  this.updateCharacterState(characterName, [], `${item}：${status}`, new Map());
                } else {
                  this.updateCharacterState(characterName, [], null, new Map([[item, status]]));
                }
              }
            });
          }
          
          finalLine = `${scene.sceneNumber}. ${extractResult}`;
        } else {
          finalLine = `${scene.sceneNumber}. <extract>无</extract>`;
        }
        analysisResults.push(finalLine);
      } catch (error) {
        console.error(`在场景 ${scene.sceneNumber} 的分析过程中发生错误:`, error);
        analysisResults.push(`${scene.sceneNumber}. <extract>分析失败</extract>`);
      }
    }
    
    console.log("服装/装备状态分析完成。");
    return analysisResults;
  }
} 