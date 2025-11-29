import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, NodeData, LinkData } from '../types';
import { getSizeForNode, getEdgeColor, EDGE_LEGEND } from '../utils';
import { LayoutType } from '../App';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick: (node: NodeData) => void;
  selectedNodeId: string | null;
  highlightedLinkType: string | null;
  layout: LayoutType;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ 
    data, 
    onNodeClick, 
    selectedNodeId, 
    highlightedLinkType,
    layout 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<NodeData, LinkData> | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Refs for D3 interactions to access latest state without re-binding events
  const selectedNodeIdRef = useRef(selectedNodeId);
  const highlightedLinkTypeRef = useRef(highlightedLinkType);
  const highlightedNodesRef = useRef<Set<string>>(new Set());

  // Update refs when props change
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
      highlightedLinkTypeRef.current = highlightedLinkType;
  }, [highlightedLinkType]);

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
      // CONTRAST FIX: If node is white, give it a darker stroke. Otherwise white stroke.
      .attr("stroke", d => (d.fillcolor === 'white' || d.fillcolor === '#ffffff') ? "#94a3b8" : "#fff")
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
      .style("opacity", d => (d.width && d.width > 2) ? 1 : 0.5); 

    // --- Simulation Setup ---
    const simulation = d3.forceSimulation(data.nodes);
    simulationRef.current = simulation;
    
    // Apply layout-specific forces
    applyLayoutForces(simulation, layout, width, height, data);

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
       d3.select(this).select("text").transition().duration(200).style("opacity", 1);
       d3.select(this).select("circle").attr("stroke", "#3b82f6").attr("stroke-width", 3);
    });
    
    node.on("mouseout", function(event, d) {
       // Only reset if NOT the specifically selected node
       if (d.id !== selectedNodeIdRef.current) {
         const isWhite = d.fillcolor === 'white' || d.fillcolor === '#ffffff';
         
         d3.select(this).select("circle")
            .attr("stroke", isWhite ? "#94a3b8" : "#fff")
            .attr("stroke-width", 1.5);
         
         const text = d3.select(this).select("text");
         
         // Keep opacity up if selected or if high tier, else fade
         const isNodeHighlightedInLinkMode = highlightedLinkTypeRef.current && highlightedNodesRef.current.has(d.id);
         
         if (selectedNodeIdRef.current || isNodeHighlightedInLinkMode) {
             text.transition().duration(200).style("opacity", 1);
         } else {
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

    (window as any).graphNodes = node;
    (window as any).graphLinks = link;

    return () => {
      simulation.stop();
    };
  }, [data]); // Only recreate everything if DATA changes

  // --- Auto-Center on Selection ---
  useEffect(() => {
    if (selectedNodeId && svgRef.current && zoomRef.current && containerRef.current) {
        const node = data.nodes.find(n => n.id === selectedNodeId);
        // Ensure node has coordinates (might be 0,0 initially but usually updated by sim tick)
        if (node && typeof node.x === 'number' && typeof node.y === 'number') {
            const svg = d3.select(svgRef.current);
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            
            // Calculate transform to center the node
            // translate(center) scale(k) translate(-node)
            const targetScale = 1.3; // Zoom in slightly for focus
            const transform = d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(targetScale)
                .translate(-node.x, -node.y);

            svg.transition()
                .duration(750) // Smooth animation
                .call(zoomRef.current.transform, transform);
            
            setZoomLevel(targetScale);
        }
    }
  }, [selectedNodeId, data]);

  // Handle Layout Changes dynamically without destroying SVG
  useEffect(() => {
    if (simulationRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const simulation = simulationRef.current;
        
        // Remove old forces
        simulation.force("link", null);
        simulation.force("charge", null);
        simulation.force("center", null);
        simulation.force("collide", null);
        simulation.force("radial", null);
        simulation.force("x", null);
        simulation.force("y", null);

        // Apply new forces
        applyLayoutForces(simulation, layout, width, height, data);
        
        // Re-heat simulation
        simulation.alpha(1).restart();
    }
  }, [layout, data]); // Trigger on layout change

  // --- Layout Logic ---
  const applyLayoutForces = (simulation: d3.Simulation<NodeData, LinkData>, mode: LayoutType, w: number, h: number, graphData: GraphData) => {
    // Common forces
    const linkForce = d3.forceLink<NodeData, LinkData>(graphData.links).id((d: any) => d.id);
    simulation.force("link", linkForce);
    simulation.force("collide", d3.forceCollide().radius((d: any) => getSizeForNode(d) + 5).iterations(2));

    if (mode === 'force') {
        // STANDARD FORCE LAYOUT
        linkForce.distance(100);
        simulation.force("charge", d3.forceManyBody().strength(-300));
        simulation.force("center", d3.forceCenter(w / 2, h / 2));
    
    } else if (mode === 'radial') {
        // RADIAL / TIERED LAYOUT
        simulation.force("charge", d3.forceManyBody().strength(-100));
        linkForce.strength(0.1); 
        
        simulation.force("radial", d3.forceRadial((d: any) => {
            const size = getSizeForNode(d);
            if (size > 40) return 0;       // Center
            if (size > 30) return 250;     // Inner Ring
            if (size > 20) return 500;     // Middle Ring
            return 800;                    // Outer Ring
        }, w / 2, h / 2).strength(0.8));

    } else if (mode === 'circuit') {
        // CIRCUIT LAYOUT (Simulated as high-repulsion schematic view)
        // High repulsion to spread nodes apart like a diagram
        simulation.force("charge", d3.forceManyBody().strength(-1200));
        simulation.force("center", d3.forceCenter(w / 2, h / 2).strength(0.05));
        // Stiff, longer links
        linkForce.distance(150).strength(0.8);
        simulation.force("collide", d3.forceCollide().radius((d: any) => getSizeForNode(d) * 1.5));

    } else if (mode === 'subset') {
        // SUBSET LAYOUT (Clustered by Color/Category)
        simulation.force("charge", d3.forceManyBody().strength(-100));
        linkForce.strength(0.05); // Weak links to allow grouping

        // Identify Groups
        const groups = Array.from(new Set(graphData.nodes.map(d => d.fillcolor || '#ccc')));
        const groupCount = groups.length;
        const radius = Math.min(w, h) * 0.35;
        
        // Calculate Center for each Group in a circle
        const groupCenters: Record<string, {x: number, y: number}> = {};
        groups.forEach((color, i) => {
            const angle = (i / groupCount) * 2 * Math.PI;
            groupCenters[color] = {
                x: w/2 + radius * Math.cos(angle),
                y: h/2 + radius * Math.sin(angle)
            };
        });

        // Pull nodes to their group center
        simulation.force("x", d3.forceX((d: any) => {
            const color = d.fillcolor || '#ccc';
            return groupCenters[color]?.x || w/2;
        }).strength(0.5));

        simulation.force("y", d3.forceY((d: any) => {
            const color = d.fillcolor || '#ccc';
            return groupCenters[color]?.y || h/2;
        }).strength(0.5));

    } else if (mode === 'grid') {
        // GRID LAYOUT
        const n = graphData.nodes.length;
        const cols = Math.ceil(Math.sqrt(n * 1.5));
        const scale = 120;
        
        simulation.force("charge", d3.forceManyBody().strength(-50));
        linkForce.strength(0.01);
        
        simulation.force("x", d3.forceX((d: any, i: number) => {
            const col = i % cols;
            return (w / 2) - ((cols * scale) / 2) + (col * scale);
        }).strength(1));
        
        simulation.force("y", d3.forceY((d: any, i: number) => {
            const row = Math.floor(i / cols);
            return (h / 2) - ((n / cols * scale) / 2) + (row * scale);
        }).strength(1));
    }
  };

  // --- Visual Highlighting Logic ---
  useEffect(() => {
    if (!(window as any).graphNodes) return;
    
    const node = (window as any).graphNodes;
    const link = (window as any).graphLinks;

    if (selectedNodeId) {
        // 1. NODE SELECTION MODE
        // Calculate neighbors
        const linkedIds = new Set<string>();
        linkedIds.add(selectedNodeId);
        data.links.forEach(l => {
            const s = typeof l.source === 'object' ? (l.source as NodeData).id : l.source;
            const t = typeof l.target === 'object' ? (l.target as NodeData).id : l.target;
            if (s === selectedNodeId) linkedIds.add(t as string);
            if (t === selectedNodeId) linkedIds.add(s as string);
        });
        
        highlightedNodesRef.current = linkedIds;

        node.transition().duration(300).style('opacity', (d: any) => linkedIds.has(d.id) ? 1 : 0.15);
        
        link.transition().duration(300)
            .style('opacity', (d: any) => (d.source.id === selectedNodeId || d.target.id === selectedNodeId) ? 1 : 0.05)
            .attr('stroke', (d: any) => (d.source.id === selectedNodeId || d.target.id === selectedNodeId) ? getEdgeColor(d.label) : "#e5e7eb");

        node.select("text").style("opacity", (d: any) => linkedIds.has(d.id) ? 1 : 0);
        node.filter((d: any) => d.id === selectedNodeId).select("circle").attr("stroke", "#3b82f6").attr("stroke-width", 4);

    } else if (highlightedLinkType) {
        // 2. LINK TYPE HIGHLIGHT MODE
        const relevantNodeIds = new Set<string>();
        
        data.links.forEach(l => {
            if (l.label === highlightedLinkType) {
                const s = typeof l.source === 'object' ? (l.source as NodeData).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as NodeData).id : l.target;
                relevantNodeIds.add(s as string);
                relevantNodeIds.add(t as string);
            }
        });

        highlightedNodesRef.current = relevantNodeIds;

        // Dim unconnected nodes significantly
        node.transition().duration(300).style('opacity', (d: any) => relevantNodeIds.has(d.id) ? 1 : 0.15);
        
        // Highlight only matching links
        link.transition().duration(300)
            .style('opacity', (d: any) => d.label === highlightedLinkType ? 1 : 0.05)
            .attr('stroke', (d: any) => d.label === highlightedLinkType ? getEdgeColor(d.label) : "#e5e7eb");

        // Show labels for relevant nodes
        node.select("text").style("opacity", (d: any) => relevantNodeIds.has(d.id) ? 1 : 0);
        
        // CONTRAST FIX for Highlight Mode: reset unconnected nodes to correct border
        node.select("circle")
            .attr("stroke", (d: any) => (d.fillcolor === 'white' || d.fillcolor === '#ffffff') ? "#94a3b8" : "#fff")
            .attr("stroke-width", 1.5); 

    } else {
        // 3. DEFAULT MODE
        highlightedNodesRef.current = new Set();
        node.transition().duration(300).style('opacity', 1);
        link.transition().duration(300).style('opacity', 0.7).attr('stroke', (d: any) => getEdgeColor(d.label));
        node.select("text").style("opacity", (d: any) => (d.width && d.width > 2) ? 1 : 0.5);
        
        // CONTRAST FIX for Default Mode reset
        node.select("circle")
            .attr("stroke", (d: any) => (d.fillcolor === 'white' || d.fillcolor === '#ffffff') ? "#94a3b8" : "#fff")
            .attr("stroke-width", 1.5);
    }
  }, [selectedNodeId, highlightedLinkType, data]);


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