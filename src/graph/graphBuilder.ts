import { Scene } from '../parser/scriptParser';
import { 
  GraphData, 
  GraphNode, 
  GraphEdge, 
  NodeType, 
  RelationType,
  CharacterNodeProperties,
  SceneNodeProperties,
  ClothingNodeProperties,
  PropNodeProperties
} from './graphTypes';

export class GraphBuilder {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private nodeColors = {
    [NodeType.CHARACTER]: '#FF6B6B',
    [NodeType.SCENE]: '#4ECDC4',
    [NodeType.CLOTHING]: '#45B7D1',
    [NodeType.PROP]: '#96CEB4',
    [NodeType.LOCATION]: '#FFEAA7',
    [NodeType.TIME]: '#DDA0DD',
    [NodeType.STATE]: '#FFB347'
  };

  constructor(private scenes: Scene[], private analysisResults: string[]) {}

  public buildGraph(): GraphData {
    this.extractEntitiesFromScenes();
    this.extractEntitiesFromAnalysis();
    this.createRelationships();
    
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      metadata: this.generateMetadata()
    };
  }

  private extractEntitiesFromScenes(): void {
    this.scenes.forEach(scene => {
      // 创建场景节点
      const sceneId = `scene_${scene.sceneNumber}`;
      const sceneNode: GraphNode = {
        id: sceneId,
        type: NodeType.SCENE,
        label: `场景 ${scene.sceneNumber}`,
        properties: {
          sceneNumber: scene.sceneNumber,
          location: scene.location,
          timeOfDay: scene.timeOfDay,
          characters: scene.characters,
          description: scene.action.join(' ').substring(0, 100) + '...'
        } as SceneNodeProperties,
        color: this.nodeColors[NodeType.SCENE],
        size: 20,
        shape: 'box'
      };
      this.nodes.set(sceneId, sceneNode);

      // 创建地点节点
      if (scene.location) {
        const locationId = `location_${this.sanitizeId(scene.location)}`;
        if (!this.nodes.has(locationId)) {
          const locationNode: GraphNode = {
            id: locationId,
            type: NodeType.LOCATION,
            label: scene.location,
            properties: { scenes: [scene.sceneNumber] },
            color: this.nodeColors[NodeType.LOCATION],
            size: 15,
            shape: 'triangle'
          };
          this.nodes.set(locationId, locationNode);
        } else {
          // 更新现有地点节点
          const existingNode = this.nodes.get(locationId)!;
          (existingNode.properties.scenes as number[]).push(scene.sceneNumber!);
        }

        // 创建场景-地点关系
        this.addEdge(sceneId, locationId, RelationType.LOCATED_AT);
      }

      // 创建时间节点
      if (scene.timeOfDay) {
        const timeId = `time_${this.sanitizeId(scene.timeOfDay)}`;
        if (!this.nodes.has(timeId)) {
          const timeNode: GraphNode = {
            id: timeId,
            type: NodeType.TIME,
            label: scene.timeOfDay,
            properties: { scenes: [scene.sceneNumber] },
            color: this.nodeColors[NodeType.TIME],
            size: 12,
            shape: 'diamond'
          };
          this.nodes.set(timeId, timeNode);
        } else {
          const existingNode = this.nodes.get(timeId)!;
          (existingNode.properties.scenes as number[]).push(scene.sceneNumber!);
        }

        // 创建场景-时间关系
        this.addEdge(sceneId, timeId, RelationType.OCCURS_AT);
      }

      // 创建角色节点和关系
      scene.characters.forEach(character => {
        const characterId = `character_${this.sanitizeId(character)}`;
        
        if (!this.nodes.has(characterId)) {
          const characterNode: GraphNode = {
            id: characterId,
            type: NodeType.CHARACTER,
            label: character,
            properties: {
              sceneCount: 1,
              clothingItems: [],
              props: [],
              interactions: []
            } as CharacterNodeProperties,
            color: this.nodeColors[NodeType.CHARACTER],
            size: 25,
            shape: 'circle'
          };
          this.nodes.set(characterId, characterNode);
        } else {
          // 更新角色出现次数
          const existingNode = this.nodes.get(characterId)!;
          (existingNode.properties as CharacterNodeProperties).sceneCount++;
          existingNode.size = Math.min(40, 25 + (existingNode.properties as CharacterNodeProperties).sceneCount * 2);
        }

        // 创建角色-场景关系
        this.addEdge(characterId, sceneId, RelationType.APPEARS_IN);
      });

      // 创建角色间互动关系
      for (let i = 0; i < scene.characters.length; i++) {
        for (let j = i + 1; j < scene.characters.length; j++) {
          const char1Id = `character_${this.sanitizeId(scene.characters[i])}`;
          const char2Id = `character_${this.sanitizeId(scene.characters[j])}`;
          this.addEdge(char1Id, char2Id, RelationType.INTERACTS_WITH);
        }
      }
    });
  }

  private extractEntitiesFromAnalysis(): void {
    this.analysisResults.forEach(result => {
      const match = result.match(/^(\d+)[\.,]\s*<extract>(.+?)<\/extract>/);
      if (!match) return;

      const sceneNumber = parseInt(match[1]);
      const content = match[2];

      // 解析角色:服装:状态格式
      const entityMatch = content.match(/([^：]+)：([^：]+)：(.+)/);
      if (!entityMatch) return;

      const characterName = entityMatch[1].trim();
      const itemType = entityMatch[2].trim();
      const state = entityMatch[3].trim();

      const characterId = `character_${this.sanitizeId(characterName)}`;
      const sceneId = `scene_${sceneNumber}`;

      // 确定是服装还是道具
      const isClothing = this.isClothingItem(itemType);
      const nodeType = isClothing ? NodeType.CLOTHING : NodeType.PROP;
      const itemId = `${nodeType}_${this.sanitizeId(itemType)}`;

      // 创建服装/道具节点
      if (!this.nodes.has(itemId)) {
        const itemNode: GraphNode = {
          id: itemId,
          type: nodeType,
          label: itemType,
          properties: isClothing ? {
            category: itemType,
            state: state,
            scenes: [sceneNumber]
          } as ClothingNodeProperties : {
            category: itemType,
            state: state,
            scenes: [sceneNumber]
          } as PropNodeProperties,
          color: this.nodeColors[nodeType],
          size: 15,
          shape: isClothing ? 'ellipse' : 'square'
        };
        this.nodes.set(itemId, itemNode);
      } else {
        // 更新现有节点
        const existingNode = this.nodes.get(itemId)!;
        const scenes = existingNode.properties.scenes as number[];
        if (!scenes.includes(sceneNumber)) {
          scenes.push(sceneNumber);
        }
      }

      // 创建状态节点
      const stateId = `state_${this.sanitizeId(state)}`;
      if (!this.nodes.has(stateId)) {
        const stateNode: GraphNode = {
          id: stateId,
          type: NodeType.STATE,
          label: state,
          properties: { items: [itemId] },
          color: this.nodeColors[NodeType.STATE],
          size: 10,
          shape: 'dot'
        };
        this.nodes.set(stateId, stateNode);
      }

      // 创建关系
      if (this.nodes.has(characterId)) {
        const relationType = isClothing ? RelationType.WEARS : RelationType.USES;
        this.addEdge(characterId, itemId, relationType);
        this.addEdge(itemId, stateId, RelationType.HAS_STATE);
      }
    });
  }

  private createRelationships(): void {
    // 创建场景间的时间顺序关系
    const sortedScenes = this.scenes.sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0));
    for (let i = 0; i < sortedScenes.length - 1; i++) {
      const currentSceneId = `scene_${sortedScenes[i].sceneNumber}`;
      const nextSceneId = `scene_${sortedScenes[i + 1].sceneNumber}`;
      this.addEdge(currentSceneId, nextSceneId, RelationType.TRANSITIONS_TO);
    }
  }

  private addEdge(fromId: string, toId: string, type: RelationType): void {
    const edgeId = `${fromId}_${type}_${toId}`;
    if (!this.edges.has(edgeId)) {
      const edge: GraphEdge = {
        id: edgeId,
        from: fromId,
        to: toId,
        type: type,
        label: this.getRelationLabel(type),
        properties: {},
        color: this.getEdgeColor(type),
        width: this.getEdgeWidth(type)
      };
      this.edges.set(edgeId, edge);
    }
  }

  private isClothingItem(item: string): boolean {
    const clothingKeywords = ['服装', '衣服', '外套', '裤子', '鞋子', '帽子', '便服', '制服', '裙子'];
    return clothingKeywords.some(keyword => item.includes(keyword));
  }

  private getRelationLabel(type: RelationType): string {
    const labels = {
      [RelationType.APPEARS_IN]: '出现在',
      [RelationType.WEARS]: '穿着',
      [RelationType.USES]: '使用',
      [RelationType.LOCATED_AT]: '位于',
      [RelationType.OCCURS_AT]: '发生在',
      [RelationType.HAS_STATE]: '状态',
      [RelationType.INTERACTS_WITH]: '互动',
      [RelationType.CONTAINS]: '包含',
      [RelationType.TRANSITIONS_TO]: '接下来'
    };
    return labels[type] || '';
  }

  private getEdgeColor(type: RelationType): string {
    const colors = {
      [RelationType.APPEARS_IN]: '#95A5A6',
      [RelationType.WEARS]: '#3498DB',
      [RelationType.USES]: '#2ECC71',
      [RelationType.LOCATED_AT]: '#F39C12',
      [RelationType.OCCURS_AT]: '#9B59B6',
      [RelationType.HAS_STATE]: '#E74C3C',
      [RelationType.INTERACTS_WITH]: '#E67E22',
      [RelationType.CONTAINS]: '#1ABC9C',
      [RelationType.TRANSITIONS_TO]: '#34495E'
    };
    return colors[type] || '#BDC3C7';
  }

  private getEdgeWidth(type: RelationType): number {
    const widths = {
      [RelationType.APPEARS_IN]: 2,
      [RelationType.WEARS]: 3,
      [RelationType.USES]: 3,
      [RelationType.LOCATED_AT]: 2,
      [RelationType.OCCURS_AT]: 2,
      [RelationType.HAS_STATE]: 1,
      [RelationType.INTERACTS_WITH]: 4,
      [RelationType.CONTAINS]: 2,
      [RelationType.TRANSITIONS_TO]: 2
    };
    return widths[type] || 1;
  }

  private sanitizeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
  }

  private generateMetadata() {
    const nodeTypeCounts: Record<NodeType, number> = {
      [NodeType.CHARACTER]: 0,
      [NodeType.SCENE]: 0,
      [NodeType.CLOTHING]: 0,
      [NodeType.PROP]: 0,
      [NodeType.LOCATION]: 0,
      [NodeType.TIME]: 0,
      [NodeType.STATE]: 0
    };

    const relationTypeCounts: Record<RelationType, number> = {
      [RelationType.APPEARS_IN]: 0,
      [RelationType.WEARS]: 0,
      [RelationType.USES]: 0,
      [RelationType.LOCATED_AT]: 0,
      [RelationType.OCCURS_AT]: 0,
      [RelationType.HAS_STATE]: 0,
      [RelationType.INTERACTS_WITH]: 0,
      [RelationType.CONTAINS]: 0,
      [RelationType.TRANSITIONS_TO]: 0
    };

    this.nodes.forEach(node => {
      nodeTypeCounts[node.type]++;
    });

    this.edges.forEach(edge => {
      relationTypeCounts[edge.type]++;
    });

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodeTypes: nodeTypeCounts,
      relationTypes: relationTypeCounts
    };
  }
}
