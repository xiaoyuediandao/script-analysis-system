import { Scene } from '../parser/scriptParser';

/**
 * 代表时间线上的一个事件，包含原始场景数据和排序依据。
 */
export interface TimelineEvent {
  scene: Scene;
  chronologicalOrder: number; // 用于排序的时间顺序
}

export class TimelineSorter {
  private scenes: Scene[];

  constructor(scenes: Scene[]) {
    this.scenes = scenes;
  }

  /**
   * 将场景按时间顺序排序。
   * 目前的实现是基于场景编号的基础排序，未来可以扩展。
   * @returns {TimelineEvent[]} 排序后的时间线事件数组。
   */
  public sort(): TimelineEvent[] {
    console.log("开始对场景进行时间线排序...");

    // 基础实现：直接使用场景编号作为排序依据
    const timelineEvents: TimelineEvent[] = this.scenes
      .map((scene, index) => ({
        scene,
        // 如果 scene.sceneNumber 为 null，则使用其在数组中的索引
        chronologicalOrder: scene.sceneNumber ?? index,
      }))
      .sort((a, b) => a.chronologicalOrder - b.chronologicalOrder);
    
    console.log("时间线排序完成。");
    return timelineEvents;
  }
} 