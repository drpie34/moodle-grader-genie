// Global type definitions

interface Window {
  // Add debugging and cache objects
  gradingCache?: {
    systemMessage: string;
    functionDefinition: any;
    [key: string]: any;
  };
  
  _fileProcessingDebug?: {
    timestamp: string;
    summary: string;
    perStudentFiles: Record<string, {
      filesFound: number;
      selectedFile: string;
      fileSize: number;
      processingMethod: string;
      isEmpty: boolean;
      emptyReason?: string;
    }>;
    [key: string]: any;
  };
}