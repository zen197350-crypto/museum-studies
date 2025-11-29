import React, { useState } from 'react';
import { NODE_LEGEND, EDGE_LEGEND } from '../utils';

const Legend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`absolute bottom-20 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 text-xs z-20 transition-all duration-300 ${isExpanded ? 'w-52 p-3 max-h-[50vh] overflow-y-auto' : 'w-auto p-2 cursor-pointer hover:bg-gray-50'}`}>
      
      <div 
        className="flex justify-between items-center"
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[10px] select-none">Легенда</h3>
        <button 
            onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
            }}
            className="text-gray-400 hover:text-gray-700 focus:outline-none ml-2"
        >
            {isExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 animate-in fade-in duration-200">
          <div className="mb-4">
            <h4 className="font-semibold mb-1 text-gray-500 text-[10px] uppercase">Типы Узлов</h4>
            <div className="space-y-1.5">
              {NODE_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center">
                  <span className="w-3 h-3 rounded-full border border-gray-300 mr-2 shadow-sm" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-1 text-gray-500 text-[10px] uppercase">Типы Связей</h4>
            <div className="space-y-1.5">
              {EDGE_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center">
                   <span className="w-6 h-0.5 mr-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                   <span className="text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Legend;