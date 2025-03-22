
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Check, X, Info, AlertCircle, FileText, FolderSymlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface FolderFile {
  file: File;
  isOnlineText: boolean;
}

interface SubmissionPreviewProps {
  files: File[];
  folderStructure: {[folder: string]: File[]};
  gradebookStudents: string[];
  onContinue: () => void;
}

const SubmissionPreview: React.FC<SubmissionPreviewProps> = ({
  files,
  folderStructure,
  gradebookStudents,
  onContinue
}) => {
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [matchedStudents, setMatchedStudents] = useState<{[folderName: string]: string}>({});
  const [previewContent, setPreviewContent] = useState<{[folderName: string]: string}>({});
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  
  const folderCount = Object.keys(folderStructure).length;
  const foldersToShow = showAllFolders ? Object.keys(folderStructure) : Object.keys(folderStructure).slice(0, 5);
  
  useEffect(() => {
    // Simple matching algorithm for preview
    const matches: {[folderName: string]: string} = {};
    
    Object.keys(folderStructure).forEach(folderName => {
      if (folderName === 'root') return;
      
      // Clean up folder name
      let cleanFolderName = folderName
        .replace(/_assignsubmission_.*$/, '')
        .replace(/_onlinetext_.*$/, '')
        .replace(/_\d+$/, '')
        .replace(/[_-]/g, ' ')
        .trim();
      
      // Look for exact matches first
      const exactMatch = gradebookStudents.find(
        student => student.toLowerCase() === cleanFolderName.toLowerCase()
      );
      
      if (exactMatch) {
        matches[folderName] = exactMatch;
        return;
      }
      
      // Look for partial matches (student name is contained in folder name or vice versa)
      const partialMatch = gradebookStudents.find(student => 
        student.toLowerCase().includes(cleanFolderName.toLowerCase()) || 
        cleanFolderName.toLowerCase().includes(student.toLowerCase())
      );
      
      if (partialMatch) {
        matches[folderName] = partialMatch;
      }
    });
    
    setMatchedStudents(matches);
  }, [folderStructure, gradebookStudents]);
  
  const previewFile = async (folderName: string) => {
    if (previewContent[folderName]) {
      // Already loaded
      return;
    }
    
    if (!folderStructure[folderName]) {
      return;
    }
    
    // Find the first non-HTML file, or use the first HTML file if that's all we have
    const folderFiles = folderStructure[folderName];
    const nonHtmlFiles = folderFiles.filter(file => 
      !file.name.toLowerCase().includes('onlinetext') && 
      !file.type.includes('html')
    );
    
    const htmlFiles = folderFiles.filter(file => 
      file.name.toLowerCase().includes('onlinetext') || 
      file.type.includes('html')
    );
    
    const fileToPreview = nonHtmlFiles.length > 0 ? nonHtmlFiles[0] : (htmlFiles.length > 0 ? htmlFiles[0] : null);
    
    if (!fileToPreview) {
      setPreviewContent(prev => ({ ...prev, [folderName]: "No previewable content found" }));
      return;
    }
    
    try {
      // For simplicity, just read as text. In a full implementation, this would use proper extractors
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // For HTML files, extract just the text content
        let displayContent = content;
        if (fileToPreview.type.includes('html') || fileToPreview.name.toLowerCase().includes('html')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          displayContent = doc.body.textContent || content;
        }
        
        // Limit preview length
        const previewText = displayContent.length > 300 
          ? displayContent.substring(0, 300) + "..." 
          : displayContent;
          
        setPreviewContent(prev => ({ ...prev, [folderName]: previewText }));
      };
      reader.onerror = () => {
        setPreviewContent(prev => ({ ...prev, [folderName]: "Error reading file" }));
      };
      reader.readAsText(fileToPreview);
    } catch (error) {
      setPreviewContent(prev => ({ ...prev, [folderName]: "Error reading file" }));
    }
  };
  
  const toggleFolder = (folderName: string) => {
    if (expandedFolders.includes(folderName)) {
      setExpandedFolders(expandedFolders.filter(f => f !== folderName));
    } else {
      setExpandedFolders([...expandedFolders, folderName]);
      previewFile(folderName);
    }
  };
  
  const hasRootFilesOnly = folderCount === 1 && folderStructure['root'];
  const matchRate = Object.keys(matchedStudents).length / 
    (Object.keys(folderStructure).length - (folderStructure['root'] ? 1 : 0)) * 100;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">
          Submission Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">Your Submission</h3>
            <p className="text-sm text-muted-foreground">
              {files.length} files in {folderCount} folder{folderCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-x-2">
            <Badge variant={matchRate >= 80 ? "success" : matchRate >= 50 ? "outline" : "destructive"}>
              {Math.round(matchRate)}% Student Match Rate
            </Badge>
          </div>
        </div>
        
        {hasRootFilesOnly && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No folder structure detected</AlertTitle>
            <AlertDescription>
              Your files don't appear to be organized into student folders. This may cause problems with 
              matching student submissions to gradebook entries. For best results, upload a folder containing 
              student submission folders or a ZIP file with preserved folder structure.
            </AlertDescription>
          </Alert>
        )}
        
        {!hasRootFilesOnly && matchRate < 50 && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Low student matching rate</AlertTitle>
            <AlertDescription>
              Less than 50% of your submission folders could be matched to student names in the gradebook.
              This may result in some submissions not being graded correctly.
            </AlertDescription>
          </Alert>
        )}
        
        {folderCount > 0 && (
          <div className="border rounded-md">
            <div className="bg-muted px-4 py-2 border-b">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium">
                <div className="col-span-4">Folder Name</div>
                <div className="col-span-3">Matched Student</div>
                <div className="col-span-3">Files</div>
                <div className="col-span-2 text-right">Status</div>
              </div>
            </div>
            
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {foldersToShow.map((folderName) => {
                const folderFiles = folderStructure[folderName];
                const matchedStudent = matchedStudents[folderName] || "No match";
                const isExpanded = expandedFolders.includes(folderName);
                const hasNonHtmlFiles = folderFiles.some(file => 
                  !file.name.toLowerCase().includes('onlinetext') && 
                  !file.type.includes('html')
                );
                
                return (
                  <div key={folderName} className="animate-fade-in">
                    <div 
                      className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => toggleFolder(folderName)}
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4 font-medium text-sm truncate">
                          {folderName === 'root' ? 'Files without folders' : folderName}
                        </div>
                        <div className="col-span-3 text-sm">
                          {matchedStudent === "No match" ? (
                            <span className="text-destructive flex items-center">
                              <X className="h-3 w-3 mr-1" />
                              No match
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center">
                              <Check className="h-3 w-3 mr-1" />
                              {matchedStudent}
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 text-sm">
                          <span className="text-muted-foreground">
                            {folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''}
                            {hasNonHtmlFiles && (
                              <Badge variant="outline" className="ml-2">
                                Has Submission
                              </Badge>
                            )}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0"
                          >
                            {isExpanded ? (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-4 py-3 bg-muted/30 text-sm space-y-2">
                        <div className="flex space-x-2 text-xs text-muted-foreground">
                          <span className="font-medium">Files in this folder:</span>
                        </div>
                        <ul className="space-y-1 pl-4">
                          {folderFiles.map((file, idx) => (
                            <li key={idx} className="flex items-center text-xs gap-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">
                                {file.name}
                                {file.name.toLowerCase().includes('onlinetext') && (
                                  <Badge variant="outline" className="ml-1 text-[10px] py-0">online text</Badge>
                                )}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                ({Math.round(file.size / 1024)} KB)
                              </span>
                            </li>
                          ))}
                        </ul>
                        
                        <Separator className="my-2" />
                        
                        <div>
                          <div className="flex items-center text-xs font-medium mb-1">
                            <FileText className="h-3 w-3 mr-1" />
                            Content Preview:
                          </div>
                          <div className="bg-muted rounded p-2 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {previewContent[folderName] || "Loading preview..."}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {Object.keys(folderStructure).length > 5 && !showAllFolders && (
                <div className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllFolders(true)}
                  >
                    Show all {Object.keys(folderStructure).length} folders
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {matchRate >= 80 ? (
              <span className="flex items-center text-green-600">
                <Check className="h-4 w-4 mr-1" />
                Your submission is ready to proceed
              </span>
            ) : (
              <span className="flex items-center text-amber-600">
                <Info className="h-4 w-4 mr-1" />
                Some submissions may not be matched correctly
              </span>
            )}
          </div>
          <Button onClick={onContinue}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmissionPreview;
