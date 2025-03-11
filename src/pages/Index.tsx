import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import UploadZone from '@/components/UploadZone';
import ProcessingAnimation from '@/components/ProcessingAnimation';
import ResultsList, { SlideData } from '@/components/ResultsList';
import { processFiles } from '@/utils/fileProcessing';
import { exportToCSV } from '@/utils/csvExport';
import { getAvailableModels, OpenAIModel } from '@/utils/openaiService';
import { ChevronDown, KeyRound, FileSliders, Database, Download, ExternalLink } from 'lucide-react';

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<SlideData[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<OpenAIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const fetchAvailableModels = async (key: string) => {
    if (!key) return;
    
    try {
      setIsLoadingModels(true);
      const models = await getAvailableModels(key);
      setAvailableModels(models);
      
      if (models.length > 0 && !models.some(m => m.id === selectedModel)) {
        setSelectedModel(models[0].id);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Could not fetch available models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      fetchAvailableModels(savedApiKey);
    }
  }, []);

  const handleProcess = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to process');
      return;
    }

    if (!apiKey.trim()) {
      setIsApiKeyModalOpen(true);
      return;
    }

    if (!selectedModel) {
      toast.error('Please select an OpenAI model');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setResults([]); // Clear previous results
      
      localStorage.setItem('openai-api-key', apiKey);
      
      const processedResults = await processFiles(
        files, 
        apiKey,
        selectedModel,
        (progressValue) => setProgress(progressValue)
      );
      
      if (processedResults && processedResults.length > 0) {
        setResults(processedResults);
        toast.success(`Successfully processed ${files.length} file(s)`);
      } else {
        toast.error('No results were generated from the files');
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error(`An error occurred while processing files: ${error instanceof Error ? error.message : String(error)}`);
      setResults([]); // Clear results on error
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleDownloadCSV = () => {
    if (!results || results.length === 0) {
      toast.error('No results available to download');
      return;
    }
    
    try {
      exportToCSV(results);
      toast.success('CSV file downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast.error('Failed to download CSV file');
    }
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsApiKeyModalOpen(false);
    
    if (apiKey.trim()) {
      fetchAvailableModels(apiKey);
      handleProcess();
    }
  };

  const selectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
  };

  const getModelName = () => {
    const model = availableModels.find(m => m.id === selectedModel);
    return model ? model.name : selectedModel;
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-white to-gray-50">
      <header className="w-full py-6 flex justify-center border-b bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container max-w-4xl px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSliders className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-medium tracking-tight">Medical Slide Analyzer</h1>
              <p className="text-sm text-muted-foreground">
                Extract insights from medical presentations with AI
              </p>
            </div>
          </div>
          
          <a 
            href="https://github.com/your-username/slide-analyzer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>GitHub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      <main className="w-full flex-1 py-8">
        <div className="container max-w-4xl px-4 space-y-8">
          <div className="w-full space-y-6 bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <KeyRound className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium">API Configuration</h2>
            </div>
            
            <div className="w-full">
              <div className="flex flex-col space-y-2">
                <label htmlFor="api-key" className="text-sm font-medium">
                  OpenAI API Key
                </label>
                <div className="flex">
                  <input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      setApiKey(newKey);
                      if (newKey.startsWith('sk-') && newKey.length > 40) {
                        fetchAvailableModels(newKey);
                      }
                    }}
                    placeholder="Enter your OpenAI API key"
                    className="flex-1 rounded-lg px-3 py-2 border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    disabled={isProcessing}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally in your browser and only used to process your files.
                </p>
              </div>
            </div>

            <div className="w-full">
              <div className="flex flex-col space-y-2">
                <label htmlFor="model-select" className="text-sm font-medium">
                  OpenAI Model
                </label>
                <div className="relative">
                  <button
                    id="model-select"
                    onClick={() => !isProcessing && setIsModelDropdownOpen(!isModelDropdownOpen)}
                    disabled={isProcessing || isLoadingModels}
                    className="w-full rounded-lg px-3 py-2 border flex justify-between items-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50"
                  >
                    <span>{isLoadingModels ? "Loading models..." : getModelName()}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                  
                  {isModelDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg overflow-hidden z-10 max-h-60 overflow-y-auto">
                      {availableModels.length > 0 ? (
                        availableModels.map(model => (
                          <button
                            key={model.id}
                            onClick={() => selectModel(model.id)}
                            className={`w-full px-3 py-2 text-left hover:bg-secondary transition-colors ${
                              selectedModel === model.id ? 'bg-secondary font-medium' : ''
                            }`}
                          >
                            {model.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-muted-foreground">No models available</div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the OpenAI model to use for analysis. GPT-4 and newer models provide better results.
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-full space-y-6 bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium">Upload & Process</h2>
            </div>

            <UploadZone 
              onFilesSelected={handleFilesSelected}
              isProcessing={isProcessing}
            />

            <button
              onClick={handleProcess}
              disabled={isProcessing || files.length === 0 || !selectedModel}
              className="rounded-lg px-4 py-2 bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none w-full mt-4"
            >
              Process Files
            </button>
          </div>

          <ProcessingAnimation 
            isProcessing={isProcessing}
            progress={progress}
          />

          {results.length > 0 && !isProcessing && (
            <div className="w-full space-y-6 bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <FileSliders className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-medium">Results</h2>
                </div>
                
                <button
                  onClick={handleDownloadCSV}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              </div>
              
              <ResultsList 
                results={results}
                onDownloadCSV={handleDownloadCSV}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="w-full py-6 border-t bg-white">
        <div className="container max-w-4xl px-4">
          <p className="text-sm text-center text-muted-foreground">
            Medical Slide Analyzer uses OpenAI to extract and analyze content from presentations. 
            Content is processed locally in your browser and not stored on our servers.
          </p>
        </div>
      </footer>

      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card border rounded-xl shadow-lg p-6 w-full max-w-md mx-4 animate-scale-in">
            <h3 className="text-xl font-medium mb-4">Enter OpenAI API Key</h3>
            <form onSubmit={handleApiKeySubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="modal-api-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <input
                    id="modal-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-lg px-3 py-2 border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is required to analyze slides using OpenAI's services.
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
