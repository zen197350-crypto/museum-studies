import React, { useMemo, useState } from 'react';
import { parseDotData } from './utils';
import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import Legend from './components/Legend';
import { NodeData } from './types';

export type LayoutType = 'force' | 'radial' | 'grid' | 'circuit' | 'subset';

function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutType>('force');
  const [highlightedLinkType, setHighlightedLinkType] = useState<string | null>(null);

  // Parse data once on mount (technically on every render here but efficient enough for this scale)
  const graphData = useMemo(() => parseDotData(), []);

  const handleNodeSelect = (node: NodeData | null) => {
    setSelectedNodeId(node ? node.id : null);
    // Optional: Clear link highlight when selecting a specific node to avoid visual clutter
    // setHighlightedLinkType(null); 
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">
      <div className="flex-1 relative">
        <GraphCanvas 
          data={graphData} 
          onNodeClick={handleNodeSelect}
          selectedNodeId={selectedNodeId}
          highlightedLinkType={highlightedLinkType}
          layout={layoutMode}
        />
        
        <Legend />

        {/* Sidebar Overlay */}
        <Sidebar 
            nodes={graphData.nodes} 
            links={graphData.links}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
            currentLayout={layoutMode}
            onLayoutChange={setLayoutMode}
            highlightedLinkType={highlightedLinkType}
            onHighlightLinkType={setHighlightedLinkType}
        />
      </div>
    </div>
  );
}

export default App;