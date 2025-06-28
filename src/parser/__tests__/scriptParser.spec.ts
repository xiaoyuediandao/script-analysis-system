import { ScriptParser } from '../scriptParser';
import * as path from 'path';

describe('ScriptParser', () => {
  it('should parse a simple script correctly', () => {
    const filePath = path.resolve(__dirname, '../../../../__tests__/mock-script.txt');
    const parser = new ScriptParser(filePath);
    const scenes = parser.parse();

    expect(scenes).toHaveLength(2);

    // 检查第一个场景
    expect(scenes[0].location).toBe('办公室');
    expect(scenes[0].timeOfDay).toBe('白天');
    expect(scenes[0].characters).toEqual(['张三', '李四']);
    expect(scenes[0].dialogue).toEqual(['你好，李四。', '你好啊，张三。']);
    expect(scenes[0].action).toContain('一个简单的场景。');
    expect(scenes[0].action).toContain('(笑着)');

    // 检查第二个场景
    expect(scenes[1].location).toBe('公园');
    expect(scenes[1].timeOfDay).toBe('夜晚');
    expect(scenes[1].action).toEqual(['另一个场景。']);
  });
}); 