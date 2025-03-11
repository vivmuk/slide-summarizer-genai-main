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
  medical_affairs_taxonomy: {
    ContentType: string[];
    ClinicalTrialRelevance: string[];
    DiseaseAndTherapeuticArea: string[];
    IntendedAudience: string[];
    KeyScientificMessaging: string[];
    DistributionAndAccessControl: string[];
    ComplianceAndRegulatoryConsiderations: string[];
  };
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

            <div className="space-y-2">
              <div>
                <h4 className="text-sm font-medium">Summary</h4>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium">Content Taxonomy</h4>
                <p className="text-sm text-muted-foreground">{result.content_taxonomy.join(", ")}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium">Medical Affairs Taxonomy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">Content Type:</p>
                    <p className="text-muted-foreground">{result.medical_affairs_taxonomy.ContentType.join(", ")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Clinical Trial Relevance:</p>
                    <p className="text-muted-foreground">{result.medical_affairs_taxonomy.ClinicalTrialRelevance.join(", ")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Disease & Therapeutic Area:</p>
                    <p className="text-muted-foreground">{result.medical_affairs_taxonomy.DiseaseAndTherapeuticArea.join(", ")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Intended Audience:</p>
                    <p className="text-muted-foreground">{result.medical_affairs_taxonomy.IntendedAudience.join(", ")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Key Scientific Messaging:</p>
                    <p className="text-muted-foreground">{result.medical_affairs_taxonomy.KeyScientificMessaging.join(", ")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Distribution & Access Control:</p>
                    <p className="text-muted-foreground">{result.medical_affairs_taxonomy.DistributionAndAccessControl.join(", ")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Compliance & Regulatory:</p>
                    <p className="text-muted-foreground">{result.medical_affairs_taxonomy.ComplianceAndRegulatoryConsiderations.join(", ")}</p>
                  </div>
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
