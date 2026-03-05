
import React, { useRef } from 'react';
import { Trash2, Download, FileJson, Pencil, Move, Eraser, MousePointer2, Settings, PlusSquare, Zap, Upload } from 'lucide-react';

interface ToolbarProps {
  onClear: () => void;
  onDownload: () => void;
  onExportSVG: () => void;
  onImport: (file: File) => void;
  radius: number;
  setRadius: (r: number) => void;
  showGrid: boolean;
  setShowGrid: (s: boolean) => void;
  nodeCount: number;
  isSolid: boolean;
  setIsSolid: (s: boolean) => void;
  mode: 'draw' | 'move' | 'delete' | 'select' | 'insert' | 'sharpen';
  setMode: (m: 'draw' | 'move' | 'delete' | 'select' | 'insert' | 'sharpen') => void;
  activeShapeIndex: number | null;
  shapeCount: number;
  onOpenSettings: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onClear,
  onDownload,
  onExportSVG,
  onImport,
  radius,
  setRadius,
  showGrid,
  setShowGrid,
  isSolid,
  setIsSolid,
  mode,
  setMode,
  onOpenSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-[272px] bg-white border-r-[1.2px] border-black flex flex-col h-full overflow-hidden uppercase tracking-normal">
      {/* Header */}
      <div className="px-5 py-6 flex justify-between items-center border-b-[1.2px] border-black">
        <h1 className="text-xl font-extrabold tracking-tight leading-tight">
          TESTING
        </h1>
        <button 
          onClick={onOpenSettings}
          className="p-1 hover:bg-gray-100 transition-colors"
        >
          <Settings size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Mode Section */}
        <section>
          <div className="px-5 py-3 border-b-[1.2px] border-black">
            <label className="text-sm font-extrabold tracking-tight">MODE</label>
          </div>
          <div className="grid grid-cols-2">
            <button
              onClick={() => setMode('select')}
              className={`flex items-center justify-center gap-2 py-5 border-r-[1.2px] border-b-[1.2px] border-black transition-all ${
                mode === 'select' ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <MousePointer2 size={16} strokeWidth={2} className="-rotate-12" />
              <span className="text-xs font-extrabold">SELECT</span>
            </button>
            <button
              onClick={() => setMode('draw')}
              className={`flex items-center justify-center gap-2 py-5 border-b-[1.2px] border-black transition-all ${
                mode === 'draw' ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <Pencil size={16} strokeWidth={2} />
              <span className="text-xs font-extrabold">EDIT</span>
            </button>
            <button
              onClick={() => setMode('insert')}
              className={`flex items-center justify-center gap-2 py-5 border-r-[1.2px] border-b-[1.2px] border-black transition-all ${
                mode === 'insert' ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <PlusSquare size={16} strokeWidth={2} />
              <span className="text-xs font-extrabold">INSERT</span>
            </button>
            <button
              onClick={() => setMode('sharpen')}
              className={`flex items-center justify-center gap-2 py-5 border-b-[1.2px] border-black transition-all ${
                mode === 'sharpen' ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <Zap size={16} strokeWidth={2} />
              <span className="text-xs font-extrabold">SHARP</span>
            </button>
            <button
              onClick={() => setMode('move')}
              className={`flex items-center justify-center gap-2 py-5 border-r-[1.2px] border-b-[1.2px] border-black transition-all ${
                mode === 'move' ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <Move size={16} strokeWidth={2} />
              <span className="text-xs font-extrabold">MOVE</span>
            </button>
            <button
              onClick={() => setMode('delete')}
              className={`flex items-center justify-center gap-2 py-5 border-b-[1.2px] border-black transition-all ${
                mode === 'delete' ? 'bg-black text-white' : 'hover:bg-gray-50'
              }`}
            >
              <Eraser size={16} strokeWidth={2} />
              <span className="text-xs font-extrabold">DEL</span>
            </button>
          </div>
        </section>

        {/* Radius Section */}
        <section className="px-5 py-6 border-b-[1.2px] border-black space-y-5">
          <div className="flex justify-between items-center text-xs font-extrabold tracking-tight">
            <span>RADIUS</span>
            <span>{radius} PX</span>
          </div>
          <div className="pt-1">
             <input 
              type="range" 
              min="5" 
              max="100" 
              value={radius} 
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </section>

        {/* Toggles */}
        <section className="border-b-[1.2px] border-black">
          <button 
            onClick={() => setIsSolid(!isSolid)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 border-b-[1.2px] border-black transition-colors"
          >
            <span className="text-xs font-extrabold tracking-tight">SOLID FILL</span>
            <div className="w-5 h-5 rounded-full border-[1.2px] border-black flex items-center justify-center">
              {isSolid && <div className="w-3 h-3 bg-black rounded-full"></div>}
            </div>
          </button>
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs font-extrabold tracking-tight">SHOW GRID</span>
            <div className="w-5 h-5 rounded-full border-[1.2px] border-black flex items-center justify-center">
              {showGrid && <div className="w-3 h-3 bg-black rounded-full"></div>}
            </div>
          </button>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="border-t-[1.2px] border-black">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".png,.jpg,.jpeg,.svg" 
          className="hidden" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-5 py-4 text-left text-xs font-extrabold tracking-tight border-b-[1.2px] border-black hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Upload size={14} strokeWidth={2} />
          IMPORT FILE
        </button>
        <button 
          onClick={onDownload}
          className="w-full px-5 py-4 text-left text-xs font-extrabold tracking-tight border-b-[1.2px] border-black hover:bg-gray-50 transition-colors"
        >
          EXPORT PNG
        </button>
        <button 
          onClick={onExportSVG}
          className="w-full px-5 py-4 text-left text-xs font-extrabold tracking-tight border-b-[1.2px] border-black hover:bg-gray-50 transition-colors"
        >
          EXPORT SVG
        </button>
        <button 
          onClick={onClear}
          className="w-full px-5 py-4 text-left text-xs font-extrabold tracking-tight hover:bg-gray-50 transition-colors"
        >
          CLEAR ALL
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
