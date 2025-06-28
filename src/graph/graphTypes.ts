// 知识图谱数据结构定义

// 节点类型枚举
export enum NodeType {
  CHARACTER = 'character',      // 角色
  SCENE = 'scene',             // 场景
  CLOTHING = 'clothing',       // 服装
  PROP = 'prop',              // 道具
  LOCATION = 'location',       // 地点
  TIME = 'time',              // 时间
  STATE = 'state'             // 状态
}

// 关系类型枚举
export enum RelationType {
  APPEARS_IN = 'appears_in',           // 出现在（角色-场景）
  WEARS = 'wears',                     // 穿着（角色-服装）
  USES = 'uses',                       // 使用（角色-道具）
  LOCATED_AT = 'located_at',           // 位于（场景-地点）
  OCCURS_AT = 'occurs_at',             // 发生在（场景-时间）
  HAS_STATE = 'has_state',             // 具有状态（服装/道具-状态）
  INTERACTS_WITH = 'interacts_with',   // 互动（角色-角色）
  CONTAINS = 'contains',               // 包含（场景-道具）
  TRANSITIONS_TO = 'transitions_to'    // 转换到（场景-场景）
}

// 图谱节点接口
export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, any>;
  color?: string;
  size?: number;
  shape?: string;
  image?: string;
}

// 图谱边接口
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  label?: string;
  properties: Record<string, any>;
  color?: string;
  width?: number;
  style?: string;
}

// 完整的图谱数据
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: Record<NodeType, number>;
    relationTypes: Record<RelationType, number>;
  };
}

// 角色节点特定属性
export interface CharacterNodeProperties {
  sceneCount: number;           // 出现场景数
  clothingItems: string[];      // 服装列表
  props: string[];             // 道具列表
  interactions: string[];       // 互动角色列表
}

// 场景节点特定属性
export interface SceneNodeProperties {
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  characters: string[];
  duration?: number;
  description?: string;
}

// 服装节点特定属性
export interface ClothingNodeProperties {
  category: string;            // 服装类别
  state: string;              // 状态（干净、脏污等）
  color?: string;             // 颜色
  material?: string;          // 材质
  scenes: number[];           // 出现场景
}

// 道具节点特定属性
export interface PropNodeProperties {
  category: string;           // 道具类别
  state: string;             // 状态
  owner?: string;            // 所有者
  scenes: number[];          // 出现场景
}

// 图谱配置选项
export interface GraphConfig {
  layout: {
    algorithm: 'force' | 'hierarchical' | 'circular' | 'random';
    physics: boolean;
    stabilization: boolean;
  };
  nodes: {
    scaling: {
      min: number;
      max: number;
    };
    font: {
      size: number;
      color: string;
    };
  };
  edges: {
    arrows: {
      to: boolean;
    };
    smooth: boolean;
  };
  interaction: {
    hover: boolean;
    selectConnectedEdges: boolean;
    tooltipDelay: number;
  };
}

// 图谱过滤器
export interface GraphFilter {
  nodeTypes: NodeType[];
  relationTypes: RelationType[];
  sceneRange?: [number, number];
  characterFilter?: string[];
  searchQuery?: string;
}

// 图谱统计信息
export interface GraphStats {
  centralCharacters: Array<{
    name: string;
    connections: number;
    scenes: number;
  }>;
  mostUsedProps: Array<{
    name: string;
    usage: number;
  }>;
  clothingChanges: Array<{
    character: string;
    changes: number;
  }>;
  sceneConnectivity: number;
}
