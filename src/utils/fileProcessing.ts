
import { SlideData } from '@/components/ResultsList';
import { analyzeWithOpenAI } from './openaiService';
import * as pdfjs from 'pdfjs-dist';

// Load the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export async function processFiles(
  files: File[], 
  openaiApiKey: string,
  openaiModel: string,
  onProgressUpdate: (progress: number) => void
): Promise<SlideData[]> {
  const results: SlideData[] = [];
  let processedFileCount = 0;
  let totalPageCount = 0;
  let processedPageCount = 0;
  
  // First, count total pages across all files
  for (const file of files) {
    try {
      const pageCount = await getPageCount(file);
      totalPageCount += pageCount;
    } catch (error) {
      console.error(`Error counting pages in ${file.name}:`, error);
      // Continue with other files even if one fails
    }
  }
  
  // Process each file
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    try {
      const fileContent = await readFileAsArrayBuffer(file);
      
      // Get page count (for accurate progress calculation)
      const totalPages = await getPageCount(file);
      
      // Extract and process each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          // Extract text content from the page
          const pageContent = await extractPageContent(file, pageNum);
          
          // Skip pages with very little content (likely blank or only contains images)
          if (pageContent.trim().length < 20) {
            processedPageCount++;
            // Update progress
            const progress = (processedPageCount / totalPageCount) * 100;
            onProgressUpdate(progress);
            continue;
          }
          
          // Process with OpenAI
          const analysisResult = await analyzeWithOpenAI(
            openaiApiKey,
            openaiModel,
            { content: pageContent }
          );
          
          results.push({
            fileIndex,
            fileName: file.name,
            pageNumber: pageNum,
            title: analysisResult.title,
            summary: analysisResult.summary,
            taxonomy: analysisResult.taxonomy,
            mslUsage: analysisResult.mslUsage
          });
          
          processedPageCount++;
          
          // Update progress
          const progress = (processedPageCount / totalPageCount) * 100;
          onProgressUpdate(progress);
          
        } catch (pageError) {
          console.error(`Error processing page ${pageNum} of ${file.name}:`, pageError);
          
          // Add error entry
          results.push({
            fileIndex,
            fileName: file.name,
            pageNumber: pageNum,
            title: "Error Processing Page",
            summary: `An error occurred: ${pageError instanceof Error ? pageError.message : String(pageError)}`,
            taxonomy: "Error",
            mslUsage: "Unable to process"
          });
          
          processedPageCount++;
          
          // Update progress even when errors occur
          const progress = (processedPageCount / totalPageCount) * 100;
          onProgressUpdate(progress);
        }
      }
      
      processedFileCount++;
      
    } catch (fileError) {
      console.error(`Error processing file ${file.name}:`, fileError);
      
      // Add error entry for the file
      results.push({
        fileIndex,
        fileName: file.name,
        pageNumber: 1,
        title: "Error Processing File",
        summary: `Could not process this file: ${fileError instanceof Error ? fileError.message : String(fileError)}`,
        taxonomy: "Error",
        mslUsage: "Unable to process"
      });
      
      processedFileCount++;
    }
  }
  
  return results;
}

// Helper function to read file as ArrayBuffer
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Function to get page count from a file
async function getPageCount(file: File): Promise<number> {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    return getPdfPageCount(file);
  } else if (file.name.toLowerCase().endsWith('.pptx')) {
    // For PowerPoint files, this would use a PPTX library
    // For now, we'll estimate 10 slides per MB as a rough heuristic
    const fileSizeMB = file.size / (1024 * 1024);
    return Math.max(1, Math.round(fileSizeMB * 10));
  } else {
    throw new Error('Unsupported file type');
  }
}

// Function to extract content from a page
async function extractPageContent(file: File, pageNum: number): Promise<string> {
  if (file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfPageContent(file, pageNum);
  } else if (file.name.toLowerCase().endsWith('.pptx')) {
    // For PowerPoint files, this would use a PPTX library
    // For now, we'll return a placeholder message
    return `[This is placeholder content for slide ${pageNum} of PowerPoint file ${file.name}. In a production environment, we would extract real text content from the PPTX file.]`;
  } else {
    throw new Error('Unsupported file type');
  }
}

// PDF-specific functions
async function getPdfPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw error;
  }
}

async function extractPdfPageContent(file: File, pageNum: number): Promise<string> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Combine all the text items
    return textContent.items
      .map((item: any) => item.str)
      .join(' ');
  } catch (error) {
    console.error(`Error extracting content from PDF page ${pageNum}:`, error);
    throw error;
  }
}
