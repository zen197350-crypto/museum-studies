import { DOT_DATA } from './constants';
import { GraphData, NodeData, LinkData } from './types';

// Regex Helpers
const NODE_ATTR_REGEX = /node\s*\[(.*?)\];/;
const EDGE_REGEX = /"(.+?)"\s*->\s*"(.+?)"\s*(?:\[(.*?)\])?;/;
const NODE_DEF_REGEX = /"(.+?)"\s*(?:\[(.*?)\])?;/; // Matches "Node"; or "Node" [...];
const ATTR_SPLIT_REGEX = /,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/; // Split by comma not in quotes

// Legend Definitions
export const NODE_LEGEND = [
  { color: "#B0C4DE", label: "Сверхгиганты (Tier 1)" },
  { color: "#E6E6FA", label: "Гиганты (Tier 2)" },
  { color: "#F0F8FF", label: "Крупные хабы (Tier 3)" },
  { color: "lightgreen", label: "Сопроводительный текст" },
  { color: "yellow", label: "Объект-схема" },
  { color: "#FFE4E1", label: "Косметический объект" },
  { color: "white", label: "Стандартный узел" },
];

export const EDGE_LEGEND = [
  { color: "#3b82f6", label: "Взаимодействие" },     // Blue
  { color: "#a855f7", label: "Восприятие" },         // Purple
  { color: "#f97316", label: "Структура/Наличие" },  // Orange
  { color: "#10b981", label: "Характеристика/Логика" }, // Emerald
  { color: "#ef4444", label: "Создание/Процесс" },   // Red
  { color: "#64748b", label: "Другое" },             // Slate
];

export const getEdgeColor = (label: any): string => {
  if (!label) return "#64748b";
  const l = String(label).toLowerCase();
  
  if (["взаимодействие", "нажатие", "использование", "вращение", "тяга", "толчок", "управление", "действие", "включение", "запускание", "дуть", "надавливание", "надувание", "сидение", "вставание", "пробование", "общение"].some(k => l.includes(k))) return "#3b82f6";
  
  if (["наблюдение", "слышание", "ощущение", "видение", "внимание", "восприятие", "чувствование", "рассматривание"].some(k => l.includes(k))) return "#a855f7";
  
  if (["часть", "наличие", "составленность", "расположение", "принадлежность", "содержание", "обладание", "вхождение", "близость"].some(k => l.includes(k))) return "#f97316";
  
  if (["характеристика", "тождество", "пример", "причина", "результат", "свойство", "функция", "значение", "условие", "возможность", "способность", "рост", "отсутствие", "потеря"].some(k => l.includes(k))) return "#10b981";
  
  if (["создание", "возникновение", "образование", "формирование", "появление", "разработка", "открытие", "рождение", "превращение"].some(k => l.includes(k))) return "#ef4444";
  
  return "#64748b";
};

// Helper to parse key-value string like 'label="foo", weight=5'
const parseAttributes = (attrString: string): Record<string, any> => {
  const attrs: Record<string, any> = {};
  if (!attrString) return attrs;

  const parts = attrString.split(ATTR_SPLIT_REGEX);
  parts.forEach((part) => {
    const [key, value] = part.split('=').map((s) => s.trim());
    if (key && value) {
      // Remove quotes if present
      const cleanValue = value.replace(/^"(.*)"$/, '$1');
      // Try parsing number
      const numValue = parseFloat(cleanValue);
      // Use number if it's a valid number and the string wasn't empty or purely whitespace which shouldn't happen with regex
      // Note: isNaN check handles strings that don't look like numbers.
      // However, for labels like "0.1 sec" parseFloat returns 0.1. We generally want to keep strings for labels unless purely numeric.
      // A simple check is to see if String(numValue) === cleanValue.
      
      if (!isNaN(numValue) && String(numValue) === cleanValue) {
          attrs[key] = numValue;
      } else {
          attrs[key] = cleanValue;
      }
    }
  });
  return attrs;
};

export const parseDotData = (): GraphData => {
  const lines = DOT_DATA.split('\n');
  const nodes = new Map<string, NodeData>();
  const links: LinkData[] = [];

  let currentNodeStyle: Record<string, any> = {
    fontname: "Arial",
    shape: "ellipse",
    style: "filled",
    color: "gray70",
    fillcolor: "white",
    fontsize: 60,
    width: 1,
    height: 0.7
  };

  lines.forEach((line) => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('//') || cleanLine.startsWith('digraph') || cleanLine === '}') return;

    // 1. Check for global node style update: node [...]
    const nodeAttrMatch = cleanLine.match(NODE_ATTR_REGEX);
    if (nodeAttrMatch) {
      const newAttrs = parseAttributes(nodeAttrMatch[1]);
      currentNodeStyle = { ...currentNodeStyle, ...newAttrs };
      return;
    }

    // 2. Check for Edge: "A" -> "B" [attrs]
    const edgeMatch = cleanLine.match(EDGE_REGEX);
    if (edgeMatch) {
      const source = edgeMatch[1];
      const target = edgeMatch[2];
      const attrs = edgeMatch[3] ? parseAttributes(edgeMatch[3]) : {};
      
      // Ensure nodes exist even if implicitly defined by edge
      if (!nodes.has(source)) {
        nodes.set(source, { id: source, label: source, ...currentNodeStyle });
      }
      if (!nodes.has(target)) {
         // Important: Implicit nodes often get default style, but we'll assign currentStyle for consistency
        nodes.set(target, { id: target, label: target, ...currentNodeStyle });
      }

      links.push({
        source,
        target,
        label: attrs.label !== undefined ? String(attrs.label) : '',
      });
      return;
    }

    // 3. Check for Explicit Node Definition: "Node"; or "Node" [attrs];
    const nodeDefMatch = cleanLine.match(NODE_DEF_REGEX);
    if (nodeDefMatch) {
        // Make sure it's not an edge (regex overlap possibility if not careful, but -> handles distinct)
        if (cleanLine.includes('->')) return; 

        const id = nodeDefMatch[1];
        const localAttrs = nodeDefMatch[2] ? parseAttributes(nodeDefMatch[2]) : {};
        
        // Merge global current style with local attributes
        nodes.set(id, {
            id,
            label: id.replace(/\\"/g, '"'), // Unescape quotes if needed
            ...currentNodeStyle,
            ...localAttrs
        });
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    links
  };
};

export const getColorForNode = (node: NodeData): string => {
    return node.fillcolor || '#ffffff';
};

export const getSizeForNode = (node: NodeData): number => {
    // Width is often small in DOT (e.g. 4), we need to scale it for D3
    const baseWidth = node.width || 1;
    // Special handling: Tier 1 nodes are huge in DOT semantics (width=4 vs width=1)
    return baseWidth * 10 + 5; 
};