import React, { useState, useMemo, useEffect } from 'react';
import { NodeData, LinkData } from '../types';

interface SidebarProps {
  nodes: NodeData[];
  links: LinkData[];
  selectedNodeId: string | null;
  onNodeSelect: (node: NodeData | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ nodes, links, selectedNodeId, onNodeSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  // Auto-open sidebar when a node is selected via graph
  useEffect(() => {
    if (selectedNodeId) {
      setIsVisible(true);
    }
  }, [selectedNodeId]);

  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId), 
  [nodes, selectedNodeId]);

  const neighbors = useMemo(() => {
    if (!selectedNodeId) return [];
    return links.filter(link => {
        const s = typeof link.source === 'object' ? (link.source as NodeData).id : link.source;
        const t = typeof link.target === 'object' ? (link.target as NodeData).id : link.target;
        return s === selectedNodeId || t === selectedNodeId;
    }).map(link => {
         const s = typeof link.source === 'object' ? (link.source as NodeData).id : link.source;
         const t = typeof link.target === 'object' ? (link.target as NodeData).id : link.target;
         const isSource = s === selectedNodeId;
         const neighborId = isSource ? t : s;
         const neighborNode = nodes.find(n => n.id === neighborId);
         return {
             relation: link.label,
             node: neighborNode,
             direction: isSource ? 'outgoing' : 'incoming'
         };
    });
  }, [links, nodes, selectedNodeId]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return [];
    return nodes.filter(n => n.label.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
  }, [nodes, searchTerm]);

  // Collapsed State: Show floating open button
  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="absolute top-4 right-4 bg-white p-2 rounded-md shadow-lg border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-all z-20"
        title="Open Sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-xl z-10 flex flex-col border-l border-gray-200 transition-transform duration-300">
      
      {/* Header / Search */}
      <div className="p-4 bg-slate-100 border-b border-gray-200 relative">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-slate-800">Museum Explorer</h1>
            <button 
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-slate-200 transition-colors"
                title="Collapse Sidebar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search exhibits..."
            className="w-full p-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
              <div className="absolute top-full left-0 w-full bg-white shadow-lg border border-gray-200 rounded mt-1 max-h-60 overflow-y-auto z-20">
                  {filteredNodes.map(node => (
                      <div 
                        key={node.id} 
                        className="p-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                        onClick={() => {
                            onNodeSelect(node);
                            setSearchTerm('');
                        }}
                      >
                          {node.label}
                      </div>
                  ))}
                  {filteredNodes.length === 0 && (
                      <div className="p-2 text-gray-500 text-sm">No results found</div>
                  )}
              </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode ? (
          <div className="space-y-6">
            <div className="pb-4 border-b border-gray-100">
                <button 
                    onClick={() => onNodeSelect(null)}
                    className="text-xs text-blue-500 hover:text-blue-700 mb-2 flex items-center"
                >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to full view
                </button>
                <h2 className="text-2xl font-bold text-gray-800 break-words leading-tight">{selectedNode.label}</h2>
                <div className="mt-2 flex gap-2 flex-wrap">
                     {selectedNode.width && selectedNode.width > 3 && (
                         <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-semibold">Tier 1 Exhibit</span>
                     )}
                     <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-mono break-all">ID: {selectedNode.id}</span>
                </div>
            </div>

            {/* Relations */}
            <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Connections ({neighbors.length})</h3>
                <div className="space-y-3">
                    {neighbors.map((rel, idx) => (
                        <div key={idx} className="flex items-start group">
                            <div className="mt-1 mr-2 text-gray-400">
                                {rel.direction === 'outgoing' ? '→' : '←'}
                            </div>
                            <div 
                                className="flex-1 p-2 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                                onClick={() => rel.node && onNodeSelect(rel.node)}
                            >
                                <div className="text-xs text-blue-500 font-medium mb-0.5">{rel.relation || "related to"}</div>
                                <div className="text-sm text-gray-800 font-medium">{rel.node?.label || "Unknown"}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Select a node on the graph or search to view details.</p>
            <div className="mt-8 text-left text-sm text-gray-400 space-y-2">
                <p><strong>Tips:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Scroll to zoom in/out</li>
                    <li>Drag background to pan</li>
                    <li>Drag nodes to rearrange</li>
                    <li>Click a node to focus relations</li>
                </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-gray-200 text-center text-xs text-gray-400 bg-gray-50">
        Total Nodes: {nodes.length} | Links: {links.length}
      </div>
    </div>
  );
};

export default Sidebar;