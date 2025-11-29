import React, { useMemo, useState } from 'react';
import { parseDotData } from './utils';
import GraphCanvas from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import Legend from './components/Legend';
import { NodeData } from './types';

function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Parse data once on mount (technically on every render here but efficient enough for this scale)
  const graphData = useMemo(() => parseDotData(), []);

  const handleNodeSelect = (node: NodeData | null) => {
    setSelectedNodeId(node ? node.id : null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">
      <div className="flex-1 relative">
        <GraphCanvas 
          data={graphData} 
          onNodeClick={handleNodeSelect}
          selectedNodeId={selectedNodeId}
        />
        
        <Legend />

        {/* Sidebar Overlay */}
        <Sidebar 
            nodes={graphData.nodes} 
            links={graphData.links}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
        />
      </div>
    </div>
  );
}

export default App;