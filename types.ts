export interface NodeData {
  id: string;
  label: string;
  width?: number;
  height?: number;
  fontsize?: number;
  fillcolor?: string;
  group?: string; // Derived from logic (Tier 1, 2, etc.)
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
  label: string;
}

export interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
}
