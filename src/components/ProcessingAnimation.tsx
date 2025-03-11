
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ProcessingAnimationProps {
  isProcessing: boolean;
  progress: number | null;
}

const ProcessingAnimation: React.FC<ProcessingAnimationProps> = ({ 
  isProcessing, 
  progress 
}) => {
  if (!isProcessing) return null;

  return (
    <div className="w-full py-8 animate-fade-in flex flex-col items-center bg-white rounded-xl shadow-sm border p-6">
      <div className="relative h-2 w-full max-w-md bg-secondary rounded-full overflow-hidden">
        {progress !== null ? (
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        ) : (
          <div className="absolute top-0 left-0 h-full w-1/3 bg-primary animate-pulse-opacity">
            <div className="absolute top-0 left-0 h-full w-full bg-primary translate-x-[-100%] animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
        )}
      </div>
      
      <div className="mt-6 flex flex-col items-center">
        <div className="relative flex items-center justify-center mb-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
        
        <p className="text-lg font-medium">Processing Documents</p>
        <p className="text-sm text-muted-foreground mt-1">
          {progress !== null 
            ? `${Math.round(progress)}% complete` 
            : "This may take a few minutes depending on file size and model used..."}
        </p>
      </div>
    </div>
  );
};

export default ProcessingAnimation;
