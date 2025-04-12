import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

interface ApiRequestData {
  timestamp: string;
  submissionPreview: string;
  apiRequest: {
    systemMessage: string;
    userMessage: string;
    function: string;
    cached: boolean;
    assignmentId: string;
  };
  edgeFunction: {
    description: string;
    details: string;
    benefit: string;
  };
  tokenOptimization: {
    description: string;
    details: string;
    benefit: string;
  };
}

interface GradingApiDebugProps {
  open: boolean;
  onClose: () => void;
}

const GradingApiDebug: React.FC<GradingApiDebugProps> = ({ open, onClose }) => {
  const [apiRequests, setApiRequests] = useState<ApiRequestData[]>([]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [systemMessage, setSystemMessage] = useState('');
  const [fullPrompt, setFullPrompt] = useState('');
  
  useEffect(() => {
    try {
      // Load API requests from localStorage
      const savedRequests = localStorage.getItem('api_requests');
      if (savedRequests) {
        const parsedRequests = JSON.parse(savedRequests);
        setApiRequests(parsedRequests);
        
        if (parsedRequests.length > 0) {
          setCurrentRequestIndex(parsedRequests.length - 1); // Select the most recent request
        }
      }
      
      // Try to get the full system message from gradingCache for debugging
      if (window.gradingCache && window.gradingCache.systemMessage) {
        setSystemMessage(window.gradingCache.systemMessage);
      } else {
        // Look in window global space
        const cachedData = Object.entries(window).find(([key]) => 
          key.includes('grading') && typeof window[key] === 'object'
        );
        
        if (cachedData && cachedData[1] && cachedData[1].systemMessage) {
          setSystemMessage(cachedData[1].systemMessage);
        }
      }
    } catch (error) {
      console.error("Error loading API requests:", error);
    }
  }, [open]);
  
  useEffect(() => {
    // Update the full prompt when the current request changes
    if (apiRequests.length === 0 || currentRequestIndex >= apiRequests.length) return;
    
    const currentRequest = apiRequests[currentRequestIndex];
    let prompt = '';
    
    // Extract full system message
    const fullSystemMessage = systemMessage || "System message not available";
    
    // Build the full prompt
    prompt = `# System Message:\n\n${fullSystemMessage}\n\n`;
    
    // Get user message (submission text) - limit display for very large submissions
    let userMessage = currentRequest.apiRequest?.userMessage 
      ? currentRequest.apiRequest.userMessage.replace('Grade this submission: ', '')
      : 'User message not available';
    
    const isLongSubmission = userMessage.length > 15000;
    
    // For very long submissions, truncate for display but note the full length
    if (isLongSubmission) {
      userMessage = userMessage.substring(0, 15000) + `\n\n[...truncated for display only. Full submission is ${userMessage.length} characters...]`;
    }
    
    prompt += `# User Message:\n\n${userMessage}\n\n`;
    
    // Add function definition if available
    if (window.gradingCache && window.gradingCache.functionDefinition) {
      prompt += `# Function Definition:\n\n\`\`\`json\n${JSON.stringify(window.gradingCache.functionDefinition, null, 2)}\n\`\`\`\n\n`;
    }
    
    setFullPrompt(prompt);
  }, [currentRequestIndex, apiRequests, systemMessage]);

  const downloadPromptAsFile = () => {
    const element = document.createElement('a');
    const file = new Blob([fullPrompt], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `openai-prompt-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  if (apiRequests.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>OpenAI API Debug</DialogTitle>
            <DialogDescription>No API requests found in browser storage</DialogDescription>
          </DialogHeader>
          <div className="p-6 text-center">
            <p>No API requests have been recorded yet. Try grading a submission first.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  const currentRequest = apiRequests[currentRequestIndex];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>OpenAI API Request Debug</span>
            <Badge variant="outline">{currentRequestIndex + 1} of {apiRequests.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            View the exact prompts being sent to OpenAI API for grading
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-2">
          <div className="flex gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentRequestIndex === 0}
              onClick={() => setCurrentRequestIndex(prevIndex => Math.max(0, prevIndex - 1))}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentRequestIndex === apiRequests.length - 1}
              onClick={() => setCurrentRequestIndex(prevIndex => Math.min(apiRequests.length - 1, prevIndex + 1))}
            >
              Next
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPromptAsFile}>
              <Download className="h-4 w-4 mr-2" />
              Download Prompt
            </Button>
          </div>
        
          <Tabs defaultValue="prompt">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prompt">Complete Prompt</TabsTrigger>
              <TabsTrigger value="preview">System Message</TabsTrigger>
              <TabsTrigger value="details">Request Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="prompt" className="border rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Complete OpenAI Prompt</h3>
              <div className="text-xs text-muted-foreground mb-2">
                This is the complete prompt being sent to OpenAI, including system message, user message, and function definition.
              </div>
              
              <ScrollArea className="h-[50vh] rounded border p-4 bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap">{fullPrompt}</pre>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-md p-4">
                <h3 className="text-md font-semibold mb-2">System Message</h3>
                <ScrollArea className="h-[50vh] rounded border p-4 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap">{systemMessage || "System message not available"}</pre>
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-md font-semibold mb-2">Request Information</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-muted-foreground">Timestamp</dt>
                      <dd>{new Date(currentRequest.timestamp).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Assignment ID</dt>
                      <dd>{currentRequest.apiRequest?.assignmentId || "Not available"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Function Name</dt>
                      <dd>{currentRequest.apiRequest?.function || "Not available"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Using Cached Instructions</dt>
                      <dd>{currentRequest.apiRequest?.cached ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Submission Preview</dt>
                      <dd className="whitespace-pre-wrap text-xs border rounded p-2 mt-1 bg-muted/30 max-h-60 overflow-y-auto">
                        {currentRequest.submissionPreview?.length > 1000 
                          ? currentRequest.submissionPreview.substring(0, 1000) + "...\n[truncated for display - see Complete Prompt tab for full submission]" 
                          : currentRequest.submissionPreview}
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-md font-semibold mb-2">API Optimizations</h3>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Edge Function</h4>
                    <p className="text-sm">{currentRequest.edgeFunction?.description || "Not available"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{currentRequest.edgeFunction?.benefit || "Not available"}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Token Optimization</h4>
                    <p className="text-sm">{currentRequest.tokenOptimization?.description || "Not available"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{currentRequest.tokenOptimization?.benefit || "Not available"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradingApiDebug;