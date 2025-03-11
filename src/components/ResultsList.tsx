import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download, FileText, Tag, FileSliders, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlideData {
  fileIndex: number;
  fileName: string;
  pageNumber: number;
  title: string;
  summary: string;
  content_taxonomy: string[];
  msl_communication: string;
  payer_communication: string;
}

interface ResultsListProps {
  results: SlideData[];
  onDownloadCSV: () => void;
}

const ResultsList: React.FC<ResultsListProps> = ({ results, onDownloadCSV }) => {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  const groupedByFile = results.reduce((acc, slide) => {
    const fileKey = `${slide.fileIndex}-${slide.fileName}`;
    if (!acc[fileKey]) {
      acc[fileKey] = [];
    }
    acc[fileKey].push(slide);
    return acc;
  }, {} as Record<string, SlideData[]>);

  if (results.length === 0) return null;

  return (
    <div className="w-full animate-fade-in space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Analysis Results</h2>
        <button
          onClick={onDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download CSV</span>
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={`${result.fileName}-${result.pageNumber}-${index}`} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-lg">{result.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {result.fileName} - Page {result.pageNumber}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Summary</h4>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium">Content Taxonomy</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.content_taxonomy.map((term, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Tag className="w-3 h-3 mr-1" />
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium">MSL Communication</h4>
                <div className="mt-1 p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-start">
                    <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-primary" />
                    {result.msl_communication}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium">Payer Communication</h4>
                <div className="mt-1 p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-start">
                    <Users className="w-4 h-4 mr-2 mt-0.5 text-primary" />
                    {result.payer_communication}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsList;
