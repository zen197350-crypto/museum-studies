
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, NodeData, LinkData } from '../types';
import { getSizeForNode, getEdgeColor, EDGE_LEGEND } from '../utils';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick: (node: NodeData) => void;
  selectedNodeId: string | null;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ data, onNodeClick, selectedNodeId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<NodeData, LinkData> | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Refs for D3 interactions to access latest state without re-binding events
  const selectedNodeIdRef = useRef(selectedNodeId);
  const highlightedNodesRef = useRef<Set<string>>(new Set());

  // Update refs when props change
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Zoom range configuration
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 4;

  // Initialize Graph
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.nodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("cursor", "move");

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
    
    // Define Arrowhead markers for each color
    const defs = svg.append("defs");
    EDGE_LEGEND.forEach(cat => {
        const colorId = cat.color.replace('#', '');
        defs.append("marker")
        .attr("id", `arrowhead-${colorId}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25) // Distance from node center
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", cat.color);
    });

    // Links
    const link = g.append("g")
        .attr("stroke-opacity", 0.7)
      .selectAll("line")
      .data(data.links)
      .join("line")
        .attr("stroke-width", 1.5)
        .attr("stroke", d => getEdgeColor(d.label))
        .attr("marker-end", d => {
            const color = getEdgeColor(d.label);
            return `url(#arrowhead-${color.replace('#', '')})`;
        });

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, NodeData>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Node Circles
    node.append("circle")
      .attr("r", d => getSizeForNode(d))
      .attr("fill", d => d.fillcolor || "#ccc")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("class", "transition-all duration-300");

    // Node Labels
    node.append("text")
      .text(d => d.label.length > 25 ? d.label.substring(0, 25) + "..." : d.label)
      .attr("x", d => getSizeForNode(d) + 5)
      .attr("y", 5)
      .attr("font-size", d => Math.max(10, (d.fontsize || 10) / 4)) 
      .attr("fill", "#333")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff")
      // CHANGE: Default opacity for small nodes is 0.5 (pale) instead of 0 (hidden)
      .style("opacity", d => (d.width && d.width > 2) ? 1 : 0.5); 

    // Simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => getSizeForNode(d) + 15).iterations(2));
    
    simulationRef.current = simulation;

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Interactions
    node.on("click", (event, d) => {
        onNodeClick(d);
        event.stopPropagation();
    });

    node.on("mouseover", function(event, d) {
       // Always show full opacity on hover
       d3.select(this).select("text").transition().duration(200).style("opacity", 1);
       d3.select(this).select("circle").attr("stroke", "#3b82f6").attr("stroke-width", 3);
    });
    
    node.on("mouseout", function(event, d) {
       // If currently selected node is active, don't dim it on mouseout
       if (d.id !== selectedNodeIdRef.current) {
         d3.select(this).select("circle").attr("stroke", "#fff").attr("stroke-width", 1.5);
         
         const text = d3.select(this).select("text");
         
         // Logic to restore correct opacity based on mode
         if (selectedNodeIdRef.current) {
             // In selection mode, we rely on the group opacity for dimming.
             // We keep text opacity at 1 so it's visible within the dimmed group.
             text.transition().duration(200).style("opacity", 1);
         } else {
             // Default mode: revert to size-based opacity
             text.transition().duration(200).style("opacity", (d.width && d.width > 2) ? 1 : 0.5);
         }
       }
    });

    function dragstarted(event: any, d: NodeData) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: NodeData) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: NodeData) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Assign refs for later use (highlighting)
    (window as any).graphNodes = node;
    (window as any).graphLinks = link;

    return () => {
      simulation.stop();
    };
  }, [data]); // Run only when data changes

  // Separate effect for selection logic to avoid re-rendering D3 graph completely
  useEffect(() => {
    if (!(window as any).graphNodes) return;
    
    const node = (window as any).graphNodes;
    const link = (window as any).graphLinks;

    if (selectedNodeId) {
        // Calculate neighbors
        const linkedIds = new Set<string>();
        linkedIds.add(selectedNodeId);
        data.links.forEach(l => {
            const s = typeof l.source === 'object' ? (l.source as NodeData).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as NodeData).id : l.target;
            if (s === selectedNodeId) linkedIds.add(t as string);
            if (t === selectedNodeId) linkedIds.add(s as string);
        });
        
        // Update ref for mouse handlers
        highlightedNodesRef.current = linkedIds;

        // Dim inactive nodes (Group Opacity)
        // CHANGE: Inactive nodes set to 0.35 (visible) instead of 0.1 (hidden)
        node.transition().duration(300).style('opacity', (d: any) => linkedIds.has(d.id) ? 1 : 0.35);
        
        // Highlight connections
        link.transition().duration(300)
            .style('opacity', (d: any) => (d.source.id === selectedNodeId || d.target.id === selectedNodeId) ? 1 : 0.05)
            .attr('stroke', (d: any) => (d.source.id === selectedNodeId || d.target.id === selectedNodeId) ? getEdgeColor(d.label) : "#e5e7eb");

        // Ensure text is visible (inherited from group opacity)
        // CHANGE: Force text opacity to 1 so it shows up even in dimmed groups
        node.select("text").style("opacity", 1);
        
        node.filter((d: any) => d.id === selectedNodeId).select("circle").attr("stroke", "#3b82f6").attr("stroke-width", 4);

    } else {
        highlightedNodesRef.current = new Set();

        // Reset all to full opacity
        node.transition().duration(300).style('opacity', 1);
        link.transition().duration(300).style('opacity', 0.7).attr('stroke', (d: any) => getEdgeColor(d.label));
        
        // Reset text visibility based on size
        // CHANGE: Small nodes text opacity 0.5 instead of 0
        node.select("text").style("opacity", (d: any) => (d.width && d.width > 2) ? 1 : 0.5);
        
        node.select("circle").attr("stroke", "#fff").attr("stroke-width", 1.5);
    }
  }, [selectedNodeId, data]);


  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = parseFloat(e.target.value);
      if (svgRef.current && zoomRef.current) {
          const svg = d3.select(svgRef.current);
          svg.transition().duration(200).call(zoomRef.current.scaleTo, newZoom);
      }
      setZoomLevel(newZoom);
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden group">
      <svg ref={svgRef} className="w-full h-full block" />
      
      {/* Zoom Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-gray-200 flex items-center gap-4 z-20">
          <span className="text-xs text-gray-500 font-medium w-8 text-right">{(zoomLevel * 100).toFixed(0)}%</span>
          <input 
            type="range" 
            min={MIN_ZOOM} 
            max={MAX_ZOOM} 
            step="0.1" 
            value={zoomLevel} 
            onChange={handleZoomChange}
            className="w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-600 transition-all"
          />
          <button 
            onClick={() => {
                if (svgRef.current && zoomRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().duration(500).call(zoomRef.current.scaleTo, 1);
                }
            }}
            className="text-xs text-blue-500 hover:text-blue-700 font-semibold"
          >
            Reset
          </button>
      </div>
    </div>
  );
};

export default GraphCanvas;
