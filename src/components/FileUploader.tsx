import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Upload, FileText, FolderUp, FileArchive, X, FileUp, CheckCircle2, AlertCircle, CloudUpload } from "lucide-react";
import { processZipFile } from '@/utils/zipUtils';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  onFolderStructureDetected?: (folderStructure: {[folder: string]: File[]}) => void;
}

interface InputElementAttributes extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string;
  directory?: string;
}

// Premium FileUploader component
const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  acceptedFileTypes = [".zip", ".csv"],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 100,
  onFolderStructureDetected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    status: '', 
    percentage: 0,
    type: 'normal' as 'normal' | 'success' | 'error'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFiles = (files: File[], isExtractedFromZip: boolean = false): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isOnlineText = file.name.includes('onlinetext');
      
      // Skip file type validation for files extracted from ZIP
      const isValidType = isExtractedFromZip || isOnlineText || acceptedFileTypes.some(type => 
        type === fileExtension || type === file.type || type === '*'
      );
      
      if (!isValidType) {
        errors.push(`"${file.name}" has an unsupported file type. Please upload only Moodle ZIP files and gradebook CSV files.`);
        return;
      }

      if (file.size > maxFileSize) {
        const sizeMB = Math.round(maxFileSize / (1024 * 1024));
        errors.push(`"${file.name}" exceeds the ${sizeMB}MB file size limit.`);
        return;
      }

      validFiles.push(file);
    });

    if (selectedFiles.length + validFiles.length > maxFiles) {
      toast.error(`You can only upload a maximum of ${maxFiles} files.`);
      return validFiles.slice(0, maxFiles - selectedFiles.length);
    }

    if (errors.length) {
      errors.forEach(error => toast.error(error));
    }

    return validFiles;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    setIsProcessing(true);
    setProgress({ status: 'Analyzing dropped files...', percentage: 10, type: 'normal' });

    try {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      const zipFiles = droppedFiles.filter(file => file.type === 'application/zip' || file.name.endsWith('.zip'));
      const otherFiles = droppedFiles.filter(file => file.type !== 'application/zip' && !file.name.endsWith('.zip'));
      
      setProgress({ status: 'Validating files...', percentage: 25, type: 'normal' });
      const validOtherFiles = validateFiles(otherFiles);
      let extractedFiles: File[] = [];
      
      if (zipFiles.length > 0) {
        toast.info(`Processing ${zipFiles.length} ZIP files...`);
        
        for (let i = 0; i < zipFiles.length; i++) {
          const zipFile = zipFiles[i];
          try {
            setProgress({ 
              status: `Extracting ${zipFile.name} (${i+1}/${zipFiles.length})...`, 
              percentage: 30 + Math.floor((i / zipFiles.length) * 50), 
              type: 'normal' 
            });
            
            const files = await processZipFile(zipFile);
            toast.success(`Extracted ${files.length} files from ${zipFile.name}`);
            
            const validExtractedFiles = validateFiles(files, true);
            extractedFiles = [...extractedFiles, ...validExtractedFiles];
          } catch (error) {
            console.error(`Error extracting files from ${zipFile.name}:`, error);
            toast.error(`Failed to extract files from ${zipFile.name}`);
            setProgress({ 
              status: `Error extracting ${zipFile.name}`, 
              percentage: 30 + Math.floor((i / zipFiles.length) * 50), 
              type: 'error' 
            });
          }
        }
      }
      
      setProgress({ status: 'Finalizing...', percentage: 90, type: 'normal' });
      
      const updatedFiles = [...selectedFiles, ...validOtherFiles, ...extractedFiles];
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
      
      // Successfully processed files
      setProgress({ status: 'Done! Files processed successfully', percentage: 100, type: 'success' });
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    } catch (error) {
      console.error("Error processing dropped files:", error);
      setProgress({ status: `Error: ${error}`, percentage: 100, type: 'error' });
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
    }
  }, [onFilesSelected, selectedFiles, validateFiles]);

  const processFilesByFolder = (files: File[]) => {
    const filesByFolder: {[folder: string]: File[]} = {};
    
    // Simplified folder processing - just focus on Moodle structure
    for (const file of files) {
      let folderPath = '';
      
      if (file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          folderPath = pathParts[0];
        }
      } else if (file.name.includes('_assignsubmission_') || file.name.includes('_onlinetext_')) {
        // Typical Moodle file naming pattern
        const submissionParts = file.name.split('_assignsubmission_');
        if (submissionParts.length > 1) {
          folderPath = submissionParts[0];
        } else {
          const onlineTextParts = file.name.split('_onlinetext_');
          if (onlineTextParts.length > 1) {
            folderPath = onlineTextParts[0];
          }
        }
      }
      
      const folderKey = folderPath || 'root';
      
      if (!filesByFolder[folderKey]) {
        filesByFolder[folderKey] = [];
      }
      
      filesByFolder[folderKey].push(file);
    }
    
    if (onFolderStructureDetected) {
      onFolderStructureDetected(filesByFolder);
    }
    
    return filesByFolder;
  };

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      setProgress({ status: 'Analyzing selected files...', percentage: 10, type: 'normal' });
      
      try {
        const inputFiles = Array.from(e.target.files);
        
        const hasDirectoryStructure = inputFiles.some(file => file.webkitRelativePath);
        if (hasDirectoryStructure) {
          setProgress({ status: 'Processing folder structure...', percentage: 20, type: 'normal' });
          toast.info("Processing Moodle file structure...");
          processFilesByFolder(inputFiles);
        }
        
        const zipFiles = inputFiles.filter(file => file.type === 'application/zip' || file.name.endsWith('.zip'));
        const otherFiles = inputFiles.filter(file => file.type !== 'application/zip' && !file.name.endsWith('.zip'));
        
        setProgress({ status: 'Validating files...', percentage: 30, type: 'normal' });
        const validOtherFiles = validateFiles(otherFiles);
        let extractedFiles: File[] = [];
        
        if (zipFiles.length > 0) {
          toast.info(`Processing ${zipFiles.length} Moodle ZIP ${zipFiles.length === 1 ? 'file' : 'files'}...`);
          
          for (let i = 0; i < zipFiles.length; i++) {
            const zipFile = zipFiles[i];
            try {
              setProgress({ 
                status: `Extracting ${zipFile.name} (${i+1}/${zipFiles.length})...`, 
                percentage: 40 + Math.floor((i / zipFiles.length) * 50), 
                type: 'normal' 
              });
              
              const files = await processZipFile(zipFile);
              toast.success(`Extracted ${files.length} student submission files`);
              
              if (files.length > 0) {
                processFilesByFolder(files);
              }
              
              const validExtractedFiles = validateFiles(files, true); // true = from ZIP
              extractedFiles = [...extractedFiles, ...validExtractedFiles];
            } catch (error) {
              console.error(`Error extracting Moodle submissions:`, error);
              toast.error(`Failed to extract Moodle submission files. Please ensure this is a valid Moodle ZIP export.`);
              setProgress({ 
                status: 'Error extracting files', 
                percentage: 40 + Math.floor((i / zipFiles.length) * 50), 
                type: 'error' 
              });
            }
          }
        }
        
        setProgress({ status: 'Finalizing...', percentage: 95, type: 'normal' });
        
        const updatedFiles = [...selectedFiles, ...validOtherFiles, ...extractedFiles];
        setSelectedFiles(updatedFiles);
        onFilesSelected(updatedFiles);
        
        // Successfully processed files
        setProgress({ status: 'Done! Files processed successfully', percentage: 100, type: 'success' });
        setTimeout(() => {
          setIsProcessing(false);
        }, 1000);
      } catch (error) {
        console.error("Error processing file input:", error);
        setProgress({ status: `Error: ${error}`, percentage: 100, type: 'error' });
        setTimeout(() => {
          setIsProcessing(false);
        }, 2000);
      }
    }
  }, [onFilesSelected, selectedFiles, validateFiles, onFolderStructureDetected]);

  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFolderUploadClick = useCallback(() => {
    if (directoryInputRef.current) {
      directoryInputRef.current.click();
    }
  }, []);

  const handleRemoveFile = useCallback((indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
    toast.success('File removed');
  }, [selectedFiles, onFilesSelected]);

  const removeAllFiles = useCallback(() => {
    setSelectedFiles([]);
    onFilesSelected([]);
    toast.success('All files cleared');
  }, [onFilesSelected]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderUploadIndicator = () => {
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Background circle */}
            <div 
              className={`h-20 w-20 rounded-full 
                ${progress.type === 'success' ? 'bg-green-100 text-green-600' : 
                 progress.type === 'error' ? 'bg-red-100 text-red-600' : 
                 'bg-primary/10 text-primary'}`}
            >
              {/* Icon based on state */}
              {progress.type === 'success' ? (
                <CheckCircle2 className="h-10 w-10" />
              ) : progress.type === 'error' ? (
                <AlertCircle className="h-10 w-10" />
              ) : (
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              )}
              
              {/* Progress circle */}
              <svg 
                className="absolute inset-0" 
                viewBox="0 0 100 100" 
                width="100%" 
                height="100%"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  strokeWidth="6"
                  className={`
                    ${progress.type === 'success' ? 'stroke-green-500' : 
                     progress.type === 'error' ? 'stroke-red-500' : 
                     'stroke-primary'}`}
                  strokeLinecap="round"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 * (1 - progress.percentage / 100)}
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <p className={`font-medium text-base
              ${progress.type === 'success' ? 'text-green-600' : 
               progress.type === 'error' ? 'text-red-600' : 
               'text-primary'}`}>
              {progress.status}
            </p>
            <p className="text-sm text-muted-foreground">
              {progress.type === 'error' ? 'Try again with a different file' : 
               progress.type === 'success' ? 'Files are ready' : 
               'Please wait...'}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-primary/10 p-5 animate-float">
          <CloudUpload className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">
            {isDragging ? 'Drop Your Files' : 'Drag & Drop Files'}
          </h3>
          <p className="text-muted-foreground">
            Upload Moodle submission ZIP file and gradebook CSV file
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
        accept={acceptedFileTypes.join(',')}
      />
      
      <input
        type="file"
        ref={directoryInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
        accept={acceptedFileTypes.join(',')}
        {...{ webkitdirectory: "true", directory: "true" } as InputElementAttributes}
      />
      
      {/* Premium gradient border uploader */}
      <div className="gradient-border transition-all duration-300">
        <div 
          className={`gradient-border-content p-8 transition-all duration-300 ${
            isDragging ? 'bg-primary/5 animate-gradient-shift' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {renderUploadIndicator()}
          
          {!isProcessing && (
            <div className="flex flex-col items-center mt-6 space-y-4">
              <div className="flex flex-wrap justify-center gap-4 w-full max-w-md">
                <Button
                  className="premium-button flex-1 min-w-[120px] gap-2"
                  onClick={handleBrowseClick}
                >
                  <FileUp className="h-4 w-4" />
                  <span>Upload Files</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex-1 min-w-[120px] gap-2 hover:border-primary/30 hover:bg-primary/5"
                  onClick={handleFolderUploadClick}
                >
                  <FolderUp className="h-4 w-4" />
                  <span>Upload Folder</span>
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Supported files: ZIP exports, CSVs, PDFs, DOCXs, and other text files
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* File list with premium styling */}
      {selectedFiles.length > 0 && (
        <div className="premium-card overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center">
              <FileArchive className="h-5 w-5 text-primary mr-2" />
              <h3 className="font-semibold">Files Ready for Processing</h3>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={removeAllFiles}
                className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4 mr-1" />
                <span>Clear all</span>
              </Button>
            </div>
          </div>
          
          <div className="max-h-72 overflow-y-auto">
            <ul className="divide-y">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${index}`} className="animate-fade-in flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {file.webkitRelativePath ? file.webkitRelativePath : file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Quick stats about uploaded files */}
          <div className="border-t p-4 bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <div className="flex space-x-4">
                <div>
                  <span className="text-xs text-muted-foreground">Total files:</span>
                  <span className="ml-1 font-medium">{selectedFiles.length}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total size:</span>
                  <span className="ml-1 font-medium">
                    {formatFileSize(selectedFiles.reduce((acc, file) => acc + file.size, 0))}
                  </span>
                </div>
              </div>
              <div className="text-xs text-primary">
                <Check className="inline-block h-3 w-3 mr-1" />
                Ready to process
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
