
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CircleHelp, Upload, FileText, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { extractTextFromFile } from "@/utils/fileUtils";

interface FileUploadFieldProps {
  id: string;
  label: string;
  tooltip: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  id,
  label,
  tooltip,
  value,
  onChange,
  placeholder,
  required = false
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (!['pdf', 'docx', 'doc', 'txt'].includes(fileExt || '')) {
      alert('Please upload a PDF, DOCX, DOC, or TXT file');
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Processing uploaded ${fileExt} file: ${file.name}`);
      
      const extractedText = await extractTextFromFile(file);
      console.log(`Successfully extracted ${extractedText.length} characters from ${file.name}`);
      
      setFile(file);
      onChange(extractedText);
    } catch (error) {
      console.error(`Error extracting text from file:`, error);
      alert(`Error extracting text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleHelp className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center">
          <input
            type="file"
            id={`${id}File`}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            disabled={isLoading}
          />
          <label 
            htmlFor={`${id}File`} 
            className={`inline-flex items-center rounded-md border px-3 py-1 text-xs ${
              isLoading ? 'bg-muted cursor-not-allowed' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer'
            }`}
          >
            {isLoading ? (
              <>
                <span className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                Loading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1" />
                Upload File
              </>
            )}
          </label>
        </div>
      </div>
      
      {file && (
        <div className="flex items-center justify-between rounded border p-2 mb-2 bg-muted/20">
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm truncate max-w-[150px] md:max-w-xs">{file.name}</span>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={removeFile}
            className="h-6 w-6 p-0"
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="min-h-32 resize-y transition-all duration-200"
      />
    </div>
  );
};

export default FileUploadField;
