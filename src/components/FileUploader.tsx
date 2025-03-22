import React, { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Upload, FileText, FilePlus, FileX, X } from "lucide-react";
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

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  acceptedFileTypes = [".pdf", ".docx", ".doc", ".txt", ".zip", ".html", ".htm"],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 100,
  onFolderStructureDetected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isOnlineText = file.name.includes('onlinetext');
      
      const isValidType = isOnlineText || acceptedFileTypes.some(type => 
        type === fileExtension || type === file.type || type === '*'
      );
      
      if (!isValidType) {
        errors.push(`"${file.name}" has an unsupported file type.`);
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

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    const zipFiles = droppedFiles.filter(file => file.type === 'application/zip' || file.name.endsWith('.zip'));
    const otherFiles = droppedFiles.filter(file => file.type !== 'application/zip' && !file.name.endsWith('.zip'));
    
    const validOtherFiles = validateFiles(otherFiles);
    let extractedFiles: File[] = [];
    
    if (zipFiles.length > 0) {
      toast.info(`Processing ${zipFiles.length} ZIP files...`);
      
      for (const zipFile of zipFiles) {
        try {
          const files = await processZipFile(zipFile);
          toast.success(`Extracted ${files.length} files from ${zipFile.name}`);
          
          const validExtractedFiles = validateFiles(files);
          extractedFiles = [...extractedFiles, ...validExtractedFiles];
        } catch (error) {
          console.error(`Error extracting files from ${zipFile.name}:`, error);
          toast.error(`Failed to extract files from ${zipFile.name}`);
        }
      }
    }
    
    const updatedFiles = [...selectedFiles, ...validOtherFiles, ...extractedFiles];
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  }, [onFilesSelected, selectedFiles, validateFiles]);

  const processFilesByFolder = (files: File[]) => {
    const filesByFolder: {[folder: string]: File[]} = {};
    
    console.log("Processing files by folder, total files:", files.length);
    console.log("First few files:");
    files.slice(0, 5).forEach(file => {
      console.log(`- ${file.webkitRelativePath || file.name}`);
    });
    
    const hasWebkitPath = files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));
    
    for (const file of files) {
      let folderPath = '';
      
      if (hasWebkitPath && file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/');
        
        if (pathParts.length > 1) {
          folderPath = pathParts[0];
          console.log(`From webkitRelativePath: file=${file.name}, folder=${folderPath}`);
        }
      } else if (file.name.includes('_assignsubmission_') || file.name.includes('_onlinetext_')) {
        const submissionParts = file.name.split('_assignsubmission_');
        if (submissionParts.length > 1) {
          folderPath = submissionParts[0];
          console.log(`From _assignsubmission_ pattern: file=${file.name}, folder=${folderPath}`);
        } else {
          const onlineTextParts = file.name.split('_onlinetext_');
          if (onlineTextParts.length > 1) {
            folderPath = onlineTextParts[0];
            console.log(`From _onlinetext_ pattern: file=${file.name}, folder=${folderPath}`);
          }
        }
      } else {
        const pathParts = file.name.split('/');
        if (pathParts.length > 1) {
          folderPath = pathParts[0];
          console.log(`From filename slash: file=${file.name}, folder=${folderPath}`);
        }
      }
      
      const folderKey = folderPath || 'root';
      
      if (!filesByFolder[folderKey]) {
        filesByFolder[folderKey] = [];
      }
      
      filesByFolder[folderKey].push(file);
    }
    
    console.log("Identified folders:", Object.keys(filesByFolder));
    Object.keys(filesByFolder).forEach(folder => {
      console.log(`Folder "${folder}": ${filesByFolder[folder].length} files`);
    });
    
    if (onFolderStructureDetected) {
      onFolderStructureDetected(filesByFolder);
    }
    
    return filesByFolder;
  };

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const inputFiles = Array.from(e.target.files);
      
      const hasDirectoryStructure = inputFiles.some(file => file.webkitRelativePath);
      if (hasDirectoryStructure) {
        toast.info("Processing folder structure...");
        processFilesByFolder(inputFiles);
      }
      
      const zipFiles = inputFiles.filter(file => file.type === 'application/zip' || file.name.endsWith('.zip'));
      const otherFiles = inputFiles.filter(file => file.type !== 'application/zip' && !file.name.endsWith('.zip'));
      
      const validOtherFiles = validateFiles(otherFiles);
      let extractedFiles: File[] = [];
      
      if (zipFiles.length > 0) {
        toast.info(`Processing ${zipFiles.length} ZIP files...`);
        
        for (const zipFile of zipFiles) {
          try {
            const files = await processZipFile(zipFile);
            toast.success(`Extracted ${files.length} files from ${zipFile.name}`);
            
            if (files.length > 0) {
              processFilesByFolder(files);
            }
            
            const validExtractedFiles = validateFiles(files);
            extractedFiles = [...extractedFiles, ...validExtractedFiles];
          } catch (error) {
            console.error(`Error extracting files from ${zipFile.name}:`, error);
            toast.error(`Failed to extract files from ${zipFile.name}`);
          }
        }
      }
      
      const updatedFiles = [...selectedFiles, ...validOtherFiles, ...extractedFiles];
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    }
  }, [onFilesSelected, selectedFiles, validateFiles, onFolderStructureDetected]);

  const handleDirectoryInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log("Directory selected, files count:", e.target.files.length);
      
      const inputFiles = Array.from(e.target.files).map(file => {
        console.log("File from directory:", file.webkitRelativePath || file.name);
        return file;
      });
      
      const filesByFolder = processFilesByFolder(inputFiles);
      console.log(`Detected ${Object.keys(filesByFolder).length} folders from directory upload`);
      
      if (Object.keys(filesByFolder).length <= 1 && inputFiles.length > 1) {
        console.warn("WARNING: Folder structure not properly detected. This could affect student matching.");
        toast.warning("Folder structure might not be properly preserved. This could affect student matching.");
      }
      
      const validFiles = validateFiles(inputFiles);
      const updatedFiles = [...selectedFiles, ...validFiles];
      
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
      
      toast.success(`Added ${validFiles.length} files from directory`);
    }
  }, [onFilesSelected, selectedFiles, validateFiles, onFolderStructureDetected]);

  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleBrowseFolderClick = useCallback(() => {
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

  return (
    <div className="w-full">
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
        onChange={handleDirectoryInputChange}
        className="hidden"
        {...{webkitdirectory: "true", directory: ""} as InputElementAttributes}
      />
      
      <div 
        className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-all duration-300 ease-in-out ${
          isDragging 
            ? 'file-drop-active bg-primary/5' 
            : 'border-muted-foreground/20 hover:border-primary/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </h3>
            <p className="text-sm text-muted-foreground space-x-2">
              <button type="button" onClick={handleBrowseClick} className="text-primary hover:underline">browse files</button>
              <span>or</span>
              <button type="button" onClick={handleBrowseFolderClick} className="text-primary hover:underline font-medium">upload folder</button>
            </p>
            <p className="text-xs text-muted-foreground">
              Accepted files: PDF, DOCX, DOC, TXT, HTML or ZIP
            </p>
          </div>
        </div>
      </div>
      
      {selectedFiles.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-medium">Selected Files</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={removeAllFiles}
                className="h-8 px-2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                <span>Clear all</span>
              </Button>
            </div>
          </div>
          
          <div className="max-h-72 overflow-y-auto">
            <ul className="divide-y">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${index}`} className="animate-fade-in flex items-center justify-between p-3 hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
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
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};

export default FileUploader;
