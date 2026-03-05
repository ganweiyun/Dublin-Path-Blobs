
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Toolbar from './components/Toolbar';
import { Node, Point, Rotation, TangentInfo } from './types';
import { getTangent, getArcSweep, distToSegmentSq } from './utils/geometry';
import { X } from 'lucide-react';

const PADDING = 60;
const GRID_GAP = 50; 

const App: React.FC = () => {
  const [shapes, setShapes] = useState<Node[][]>([]);
  const [activeShapeIndex, setActiveShapeIndex] = useState<number | null>(null);
  
  const [radius, setRadius] = useState(30);
  const [showGrid, setShowGrid] = useState(true);
  const [isSolid, setIsSolid] = useState(true); 
  const [mode, setMode] = useState<'draw' | 'move' | 'delete' | 'select' | 'insert' | 'sharpen'>('draw');
  const [draggedNodeId, setDraggedNodeId] = useState<{shapeIdx: number, nodeId: string} | null>(null);

  const [gridCols, setGridCols] = useState(20);
  const [gridRows, setGridRows] = useState(20);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasWidth = useMemo(() => (gridCols - 1) * GRID_GAP + PADDING * 2, [gridCols]);
  const canvasHeight = useMemo(() => (gridRows - 1) * GRID_GAP + PADDING * 2, [gridRows]);

  const getPos = useCallback((gx: number, gy: number): Point => {
    return {
      x: PADDING + gx * GRID_GAP,
      y: PADDING + gy * GRID_GAP
    };
  }, []);

  const calculatePathForShape = useCallback((shapeNodes: Node[]) => {
    if (shapeNodes.length < 2) return [];
    
    const tangents: (TangentInfo | null)[] = [];
    for (let i = 0; i < shapeNodes.length; i++) {
      const curr = shapeNodes[i];
      const next = shapeNodes[(i + 1) % shapeNodes.length];
      
      const r1 = curr.isSharp ? 0 : radius;
      const r2 = next.isSharp ? 0 : radius;

      const t = getTangent(
        getPos(curr.gridX, curr.gridY),
        getPos(next.gridX, next.gridY),
        r1,
        r2,
        curr.rotation,
        next.rotation
      );
      tangents.push(t);
    }
    return tangents;
  }, [radius, getPos]);

  const getInternalCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getGridIndex = (internalX: number, internalY: number) => {
    const gx = Math.round((internalX - PADDING) / GRID_GAP);
    const gy = Math.round((internalY - PADDING) / GRID_GAP);
    return { gx, gy };
  };

  const findNodeAt = (gx: number, gy: number) => {
    for (let sIdx = 0; sIdx < shapes.length; sIdx++) {
      const nIdx = shapes[sIdx].findIndex(n => n.gridX === gx && n.gridY === gy);
      if (nIdx !== -1) return { shapeIdx: sIdx, nodeIdx: nIdx, nodeId: shapes[sIdx][nIdx].id };
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const coords = getInternalCoords(e);
    if (!coords) return;
    const { gx, gy } = getGridIndex(coords.x, coords.y);

    const nodeHit = findNodeAt(gx, gy);

    if (mode === 'select') {
      if (nodeHit) {
        setActiveShapeIndex(nodeHit.shapeIdx);
      } else {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          let foundIdx = null;
          for (let sIdx = shapes.length - 1; sIdx >= 0; sIdx--) {
            const shapeNodes = shapes[sIdx];
            const tangents = calculatePathForShape(shapeNodes);
            if (tangents.length < 2) continue;

            const path = new Path2D();
            for (let i = 0; i < shapeNodes.length; i++) {
              const node = shapeNodes[i];
              const r = node.isSharp ? 0 : radius;
              const center = getPos(node.gridX, node.gridY);
              const prevT = tangents[(i + tangents.length - 1) % tangents.length];
              const currT = tangents[i];
              const entryAngle = prevT ? prevT.endAngle : 0;
              const exitAngle = currT ? currT.startAngle : Math.PI;

              if (i === 0) {
                if (prevT) path.moveTo(prevT.end.x, prevT.end.y);
                else {
                  const startX = center.x + r * Math.cos(entryAngle);
                  const startY = center.y + r * Math.sin(entryAngle);
                  path.moveTo(startX, startY);
                }
              }
              if (r > 0) {
                path.arc(center.x, center.y, r, entryAngle, exitAngle, node.rotation === Rotation.CCW);
              } else {
                path.lineTo(center.x, center.y);
              }
              if (currT) path.lineTo(currT.end.x, currT.end.y);
            }
            path.closePath();

            if (ctx.isPointInPath(path, coords.x, coords.y)) {
              foundIdx = sIdx;
              break;
            }
          }
          setActiveShapeIndex(foundIdx);
        }
      }
    } else if (mode === 'draw' || mode === 'insert') {
      if (activeShapeIndex === null) {
        if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
          const newNode = { id: crypto.randomUUID(), gridX: gx, gridY: gy, rotation: Rotation.CW };
          setShapes(prev => [...prev, [newNode]]);
          setActiveShapeIndex(shapes.length);
        }
      } else {
        const activeShapeNodes = shapes[activeShapeIndex];
        const nodeIdxInActive = activeShapeNodes.findIndex(n => n.gridX === gx && n.gridY === gy);
        
        if (nodeIdxInActive !== -1) {
          // Toggle rotation if clicking existing node
          const updatedShapes = [...shapes];
          const node = updatedShapes[activeShapeIndex][nodeIdxInActive];
          node.rotation = node.rotation === Rotation.CW ? Rotation.CCW : Rotation.CW;
          setShapes(updatedShapes);
        } else if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
          // Add new node
          const newNode = { id: crypto.randomUUID(), gridX: gx, gridY: gy, rotation: Rotation.CW };
          const updatedShapes = [...shapes];
          const currentNodes = updatedShapes[activeShapeIndex];

          if (mode === 'insert' && currentNodes.length >= 2) {
            // Smart insertion: find closest segment
            let bestIndex = -1;
            let minDistanceSq = Infinity;
            const p = getPos(gx, gy);

            for (let i = 0; i < currentNodes.length; i++) {
              const a = getPos(currentNodes[i].gridX, currentNodes[i].gridY);
              const b = getPos(currentNodes[(i + 1) % currentNodes.length].gridX, currentNodes[(i + 1) % currentNodes.length].gridY);
              const d2 = distToSegmentSq(p, a, b);
              if (d2 < minDistanceSq) {
                minDistanceSq = d2;
                bestIndex = i + 1;
              }
            }
            const newNodes = [...currentNodes];
            newNodes.splice(bestIndex, 0, newNode);
            updatedShapes[activeShapeIndex] = newNodes;
          } else {
            // Default sequential append
            updatedShapes[activeShapeIndex] = [...currentNodes, newNode];
          }
          setShapes(updatedShapes);
        }
      }
    } else if (mode === 'sharpen') {
      if (nodeHit) {
        setShapes(prev => prev.map((shape, sIdx) => 
          sIdx === nodeHit.shapeIdx 
            ? shape.map((n, nIdx) => nIdx === nodeHit.nodeIdx ? { ...n, isSharp: !n.isSharp } : n)
            : shape
        ));
      }
    } else if (mode === 'move') {
      if (nodeHit) {
        setDraggedNodeId({ shapeIdx: nodeHit.shapeIdx, nodeId: nodeHit.nodeId });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    } else if (mode === 'delete') {
      if (nodeHit) {
        setShapes(prev => {
          const updated = prev.map((s, idx) => idx === nodeHit.shapeIdx ? s.filter(n => n.id !== nodeHit.nodeId) : s);
          return updated.filter(s => s.length > 0);
        });
        if (nodeHit.shapeIdx === activeShapeIndex) {
          if (shapes[nodeHit.shapeIdx].length <= 1) setActiveShapeIndex(null);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode === 'move' && draggedNodeId) {
      const coords = getInternalCoords(e);
      if (!coords) return;
      const { gx, gy } = getGridIndex(coords.x, coords.y);

      if (gx >= 0 && gx < gridCols && gy >= 0 && gy < gridRows) {
        const otherNodeAtTarget = findNodeAt(gx, gy);
        if (!otherNodeAtTarget || (otherNodeAtTarget.nodeId === draggedNodeId.nodeId)) {
          setShapes(prev => prev.map((shape, sIdx) => 
            sIdx === draggedNodeId.shapeIdx 
              ? shape.map(n => n.id === draggedNodeId.nodeId ? { ...n, gridX: gx, gridY: gy } : n)
              : shape
          ));
        }
      }
    }
  };

  const handlePointerUp = () => {
    setDraggedNodeId(null);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showGrid) {
      ctx.fillStyle = '#000000';
      for (let i = 0; i < gridCols; i++) {
        for (let j = 0; j < gridRows; j++) {
          const pos = getPos(i, j);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    shapes.forEach((shapeNodes, sIdx) => {
      const tangents = calculatePathForShape(shapeNodes);
      if (tangents.length > 0) {
        ctx.save();
        
        ctx.beginPath();
        for (let i = 0; i < shapeNodes.length; i++) {
          const node = shapeNodes[i];
          const r = node.isSharp ? 0 : radius;
          const center = getPos(node.gridX, node.gridY);
          const prevT = tangents[(i + tangents.length - 1) % tangents.length];
          const currT = tangents[i];
          const entryAngle = prevT ? prevT.endAngle : 0;
          const exitAngle = currT ? currT.startAngle : Math.PI;

          if (i === 0) {
            if (prevT) ctx.moveTo(prevT.end.x, prevT.end.y);
            else {
              const startX = center.x + r * Math.cos(entryAngle);
              const startY = center.y + r * Math.sin(entryAngle);
              ctx.moveTo(startX, startY);
            }
          }
          if (r > 0) {
            ctx.arc(center.x, center.y, r, entryAngle, exitAngle, node.rotation === Rotation.CCW);
          } else {
            ctx.lineTo(center.x, center.y);
          }
          if (currT) ctx.lineTo(currT.end.x, currT.end.y);
        }
        ctx.closePath();

        if (isSolid) {
          ctx.fillStyle = '#000000';
          ctx.fill();
        } else {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.2;
          ctx.lineJoin = 'miter';
          ctx.stroke();
          if (sIdx === activeShapeIndex) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fill();
          }
        }
        ctx.restore();
      }

      shapeNodes.forEach((node) => {
        const pos = getPos(node.gridX, node.gridY);
        
        if (sIdx === activeShapeIndex) {
          ctx.save();
          ctx.translate(pos.x, pos.y);
          if (node.isSharp) {
            ctx.rotate(Math.PI / 4); // Rotate diamond for sharp nodes
          }
          
          ctx.beginPath();
          ctx.rect(-4, -4, 8, 8);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.beginPath();
          ctx.rect(-1.5, -1.5, 3, 3);
          ctx.fillStyle = node.rotation === Rotation.CW ? '#000000' : '#ffffff';
          ctx.fill();
          if (node.rotation === Rotation.CCW) ctx.stroke();
          
          ctx.restore();
        }

        if (draggedNodeId && draggedNodeId.nodeId === node.id) {
           ctx.save();
           ctx.translate(pos.x, pos.y);
           if (node.isSharp) ctx.rotate(Math.PI / 4);
           ctx.beginPath();
           ctx.rect(-8, -8, 16, 16);
           ctx.strokeStyle = '#000000';
           ctx.lineWidth = 1.2;
           ctx.stroke();
           ctx.restore();
        }
      });
    });

  }, [shapes, radius, showGrid, isSolid, getPos, calculatePathForShape, draggedNodeId, activeShapeIndex, gridCols, gridRows]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // Helper to generate formatted filename: YYYY_MM_DD_HHmm_COLxROW
  const getFormattedFilename = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}_${month}_${day}_${hours}${minutes}_${gridCols}x${gridRows}`;
  }, [gridCols, gridRows]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${getFormattedFilename()}.png`;
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.click();
  };

  const handleExportSVG = () => {
    if (shapes.length === 0) return;
    let svgPaths = "";
    shapes.forEach((shapeNodes) => {
      const tangents = calculatePathForShape(shapeNodes);
      if (shapeNodes.length < 2) return;
      let pathData = "";
      for (let i = 0; i < shapeNodes.length; i++) {
        const node = shapeNodes[i];
        const r = node.isSharp ? 0 : radius;
        const center = getPos(node.gridX, node.gridY);
        const prevT = tangents[(i + tangents.length - 1) % tangents.length];
        const currT = tangents[i];
        const startAngle = prevT ? prevT.endAngle : 0;
        const endAngle = currT ? currT.startAngle : Math.PI;
        
        const startX = center.x + r * Math.cos(startAngle);
        const startY = center.y + r * Math.sin(startAngle);
        const endX = center.x + r * Math.cos(endAngle);
        const endY = center.y + r * Math.sin(endAngle);
        
        if (i === 0) pathData += `M ${startX.toFixed(2)} ${startY.toFixed(2)} `;
        
        if (r > 0) {
          const sweep = getArcSweep(startAngle, endAngle, node.rotation);
          const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
          const sweepFlag = node.rotation === Rotation.CW ? 1 : 0;
          pathData += `A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${endX.toFixed(2)} ${endY.toFixed(2)} `;
        } else {
          pathData += `L ${center.x.toFixed(2)} ${center.y.toFixed(2)} `;
        }
        
        if (currT) pathData += `L ${currT.end.x.toFixed(2)} ${currT.end.y.toFixed(2)} `;
      }
      pathData += "Z";
      svgPaths += `<path d="${pathData}" fill="${isSolid ? '#000000' : 'none'}" stroke="black" stroke-width="1.2" stroke-linejoin="miter"/>\n`;
    });

    // Embed state for later import
    const state = JSON.stringify({ shapes, radius, gridCols, gridRows, isSolid });
    const svgString = `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" data-blob-state='${state}' xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/>${svgPaths}</svg>`;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getFormattedFilename()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    if (file.type === 'image/svg+xml') {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      const stateStr = svgEl?.getAttribute('data-blob-state');
      if (stateStr) {
        try {
          const state = JSON.parse(stateStr);
          setShapes(state.shapes);
          setRadius(state.radius || 30);
          setGridCols(state.gridCols || 20);
          setGridRows(state.gridRows || 20);
          setIsSolid(state.isSolid !== undefined ? state.isSolid : true);
          setActiveShapeIndex(null);
          return;
        } catch (e) {
          console.error("Failed to parse SVG state", e);
        }
      }
      alert("SVG does not contain valid Dubins Blob data.");
    } else {
      // Handle JPG/PNG
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const offCanvas = document.createElement('canvas');
        offCanvas.width = canvasWidth;
        offCanvas.height = canvasHeight;
        const octx = offCanvas.getContext('2d');
        if (!octx) return;
        
        // Draw image scaled to fit canvas
        const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvasWidth - w) / 2;
        const y = (canvasHeight - h) / 2;
        octx.fillStyle = 'white';
        octx.fillRect(0, 0, canvasWidth, canvasHeight);
        octx.drawImage(img, x, y, w, h);

        const imageData = octx.getImageData(0, 0, canvasWidth, canvasHeight).data;
        
        // Threshold check function
        const isBlack = (px: number, py: number) => {
          const idx = (Math.floor(py) * canvasWidth + Math.floor(px)) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          return brightness < 128; // Threshold for "black"
        };

        const detectedNodes: {gx: number, gy: number}[] = [];
        for (let gy = 0; gy < gridRows; gy++) {
          for (let gx = 0; gx < gridCols; gx++) {
            const pos = getPos(gx, gy);
            if (isBlack(pos.x, pos.y)) {
              detectedNodes.push({gx, gy});
            }
          }
        }

        if (detectedNodes.length === 0) {
          alert("No dark areas detected on grid points.");
          return;
        }

        // BFS to group connected nodes into shapes
        const visited = new Set<string>();
        const newShapes: Node[][] = [];
        
        const getNeighbors = (node: {gx: number, gy: number}) => {
          const neighbors = [];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const target = detectedNodes.find(n => n.gx === node.gx + dx && n.gy === node.gy + dy);
              if (target) neighbors.push(target);
            }
          }
          return neighbors;
        };

        detectedNodes.forEach(node => {
          const key = `${node.gx},${node.gy}`;
          if (!visited.has(key)) {
            const shapeNodes: {gx: number, gy: number}[] = [];
            const queue = [node];
            visited.add(key);

            while (queue.length > 0) {
              const curr = queue.shift()!;
              shapeNodes.push(curr);
              getNeighbors(curr).forEach(neighbor => {
                const nKey = `${neighbor.gx},${neighbor.gy}`;
                if (!visited.has(nKey)) {
                  visited.add(nKey);
                  queue.push(neighbor);
                }
              });
            }
            
            // Simple sort by proximity to form a rough path
            // Real path ordering from blobs is complex; we'll use a basic spiral/grid order
            const ordered = shapeNodes.sort((a, b) => a.gy - b.gy || a.gx - b.gx);

            newShapes.push(ordered.map(n => ({
              id: crypto.randomUUID(),
              gridX: n.gx,
              gridY: n.gy,
              rotation: Rotation.CW,
              isSharp: false
            })));
          }
        });

        setShapes(newShapes);
        setActiveShapeIndex(null);
      };
      img.src = url;
    }
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      <Toolbar 
        onClear={() => { setShapes([]); setActiveShapeIndex(null); }}
        onDownload={handleDownload}
        onExportSVG={handleExportSVG}
        onImport={handleImport}
        radius={radius}
        setRadius={setRadius}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        nodeCount={shapes.reduce((acc, curr) => acc + curr.length, 0)}
        isSolid={isSolid}
        setIsSolid={setIsSolid}
        mode={mode}
        setMode={setMode}
        activeShapeIndex={activeShapeIndex}
        shapeCount={shapes.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main className="flex-1 relative flex items-center justify-center p-12 bg-white overflow-auto">
        <div 
          className={`bg-white border-[1.2px] border-black relative ${
            mode === 'draw' ? 'cursor-crosshair' : mode === 'insert' ? 'cursor-copy' : mode === 'sharpen' ? 'cursor-help' : mode === 'delete' ? 'cursor-alias' : mode === 'select' ? 'cursor-default' : draggedNodeId ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ 
            width: 'auto', 
            height: 'auto',
            maxWidth: '95%', 
            maxHeight: '95%',
            aspectRatio: `${canvasWidth} / ${canvasHeight}`
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full block"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          
          {shapes.length === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="text-center bg-white border-[1.2px] border-black px-10 py-6 uppercase tracking-tight">
                <p className="text-sm font-semibold">
                  CLICK GRID TO GENERATE SHAPES
                </p>
                <p className="text-[10px] mt-2 opacity-60">OR IMPORT A PNG/SVG FILE</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Grid Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm">
          <div className="bg-white border-[1.2px] border-black w-full max-w-md p-10 relative uppercase tracking-normal shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-6 right-6 p-1 border-[1.2px] border-black hover:bg-black hover:text-white transition-colors"
            >
              <X size={24} strokeWidth={1} />
            </button>
            <h2 className="text-2xl font-extrabold mb-10 tracking-tight">GRID CONFIG</h2>
            
            <div className="space-y-10">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-extrabold tracking-tight">
                  <span>COLUMNS</span>
                  <span className="font-mono text-lg">{gridCols}</span>
                </div>
                <input 
                  type="range" min="4" max="50" step="1"
                  value={gridCols}
                  onChange={(e) => setGridCols(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-extrabold tracking-tight">
                  <span>ROWS</span>
                  <span className="font-mono text-lg">{gridRows}</span>
                </div>
                <input 
                  type="range" min="4" max="50" step="1"
                  value={gridRows}
                  onChange={(e) => setGridRows(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="p-4 border-[1.2px] border-black bg-white">
                <p className="text-[11px] font-semibold leading-tight">
                  NOTICE: GRID SPACING IS FIXED AT 50PX. INCREASING DIMENSIONS WILL EXPAND THE CANVAS WORKSPACE.
                </p>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-5 bg-black text-white font-extrabold text-lg hover:bg-gray-900 transition-colors active:translate-y-1"
              >
                APPLY & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
