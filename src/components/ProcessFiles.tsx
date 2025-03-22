
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, Download, File, FileText, FilesIcon } from "lucide-react";
import { AssignmentFormData } from "./assignment/AssignmentFormTypes";

interface ProcessFilesProps {
  files: File[];
  assignmentData: AssignmentFormData;
  moodleFormatHeaders?: string[];
  assignmentColumn?: string;
  feedbackColumn?: string;
  onDownload: () => void;
  onReset: () => void;
}

const ProcessFiles: React.FC<ProcessFilesProps> = ({ 
  files, 
  assignmentData, 
  moodleFormatHeaders,
  assignmentColumn,
  feedbackColumn,
  onDownload,
  onReset
}) => {
  const getFileIcon = (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    switch(fileExt) {
      case 'pdf':
        return <File className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-5 w-5 text-blue-500" />;
      case 'txt':
        return <FileText className="h-5 w-5 text-gray-500" />;
      case 'zip':
        return <FilesIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get total size of all files
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">Ready for Download</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <h3 className="mb-2 font-medium">Assignment Information</h3>
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Assignment:</span>
                <p className="font-medium">{assignmentData.assignmentName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Course:</span>
                <p className="font-medium">{assignmentData.courseName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Academic Level:</span>
                <p className="font-medium capitalize">{assignmentData.academicLevel}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Grading Scale:</span>
                <p className="font-medium">{assignmentData.gradingScale} points</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-medium">Files Processed</h3>
            <Card>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {files.map((file, index) => (
                      <tr key={index} className="animate-fade-in text-sm">
                        <td className="flex items-center gap-2 px-4 py-2">
                          {getFileIcon(file)}
                          <span className="truncate max-w-[200px]">{file.name}</span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {file.type || `.${file.name.split('.').pop()}`}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {formatFileSize(file.size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t p-3 text-right text-sm text-muted-foreground">
                {files.length} files · {formatFileSize(totalSize)}
              </div>
            </Card>
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-4">
          <h3 className="mb-2 flex items-center font-medium">
            <Check className="mr-2 h-4 w-4 text-green-500" />
            Ready for Moodle
          </h3>
          <p className="text-sm text-muted-foreground">
            All student submissions have been graded and the feedback has been prepared in a Moodle-compatible format.
            {moodleFormatHeaders && (
              <>
                <br/>
                <span className="font-medium mt-2 block">Format Preservation</span>
                The CSV file will use the exact same column structure as your uploaded gradebook.
                <br/>
                {assignmentColumn && <span>• Grades will be in the "{assignmentColumn}" column</span>}
                <br/>
                {feedbackColumn && <span>• Feedback will be in the "{feedbackColumn}" column</span>}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button 
            onClick={onDownload}
            className="flex-1 space-x-2 transition-all duration-300 hover:shadow-md"
          >
            <Download className="h-4 w-4" />
            <span>Download Moodle-Compatible CSV</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={onReset}
            className="flex-1 transition-all duration-300 hover:bg-muted"
          >
            Start Over
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessFiles;
