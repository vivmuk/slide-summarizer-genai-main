import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, File, X, FileSliders } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidFileType = (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    return validTypes.includes(file.type);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !isProcessing) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => isValidFileType(file));
    const invalidFiles = files.filter(file => !isValidFileType(file));

    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} file(s) were rejected. Only PDF and PPTX files are supported.`);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      onFilesSelected(validFiles);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative w-full h-40 rounded-xl border-2 border-dashed transition-all duration-200 ease-in-out flex flex-col items-center justify-center cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-secondary/50",
          "animate-fade-in"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          multiple
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          disabled={isProcessing}
        />
        {isDragging ? (
          <FileSliders className="h-12 w-12 mb-2 text-primary animate-pulse" />
        ) : (
          <Upload className={cn(
            "h-10 w-10 mb-2 transition-transform",
            isProcessing ? "text-muted-foreground" : "text-primary",
          )} />
        )}
        <p className="text-sm font-medium text-center">
          {isDragging ? (
            <span className="text-primary">Drop files here</span>
          ) : (
            <span>
              <span className="text-primary font-semibold">Click to upload</span> or drag and drop
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, PPTX files only</p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="w-full space-y-2 animate-slide-up">
          <p className="text-sm font-medium">Selected Files ({selectedFiles.length})</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 border rounded-lg p-2">
            {selectedFiles.map((file, index) => (
              <li 
                key={`${file.name}-${index}`} 
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 animate-scale-in"
              >
                <div className="flex items-center space-x-2">
                  <File className="h-5 w-5 text-primary" />
                  <span className="text-sm truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                    {file.name}
                  </span>
                </div>
                {!isProcessing && (
                  <button 
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
