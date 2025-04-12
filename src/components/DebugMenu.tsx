import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import GradingApiDebug from './GradingApiDebug';

interface DebugMenuProps {
  open: boolean;
  onClose: () => void;
}

const DebugMenu: React.FC<DebugMenuProps> = ({ open, onClose }) => {
  const [showApiDebug, setShowApiDebug] = useState(false);
  const [fileDebug, setFileDebug] = useState<any>(null);
  const [debugOptions, setDebugOptions] = useState({
    useServerApi: localStorage.getItem("use_server_api_key") === "true",
    enableFileProcessingDebug: localStorage.getItem("enable_file_debug") === "true",
    showApiPromptButton: localStorage.getItem("show_api_prompt_button") === "true",
  });

  useEffect(() => {
    // Load debug data if available
    if (window._fileProcessingDebug) {
      setFileDebug(window._fileProcessingDebug);
    }
  }, [open]);

  const handleToggleServerApi = (checked: boolean) => {
    if (checked) {
      localStorage.setItem("use_server_api_key", "true");
      localStorage.removeItem("openai_api_key");
    } else {
      localStorage.setItem("use_server_api_key", "false");
    }
    setDebugOptions(prev => ({ ...prev, useServerApi: checked }));
  };

  const handleToggleFileDebug = (checked: boolean) => {
    localStorage.setItem("enable_file_debug", checked ? "true" : "false");
    setDebugOptions(prev => ({ ...prev, enableFileProcessingDebug: checked }));
  };

  const handleToggleApiPromptButton = (checked: boolean) => {
    localStorage.setItem("show_api_prompt_button", checked ? "true" : "false");
    setDebugOptions(prev => ({ ...prev, showApiPromptButton: checked }));
    
    // Force reload to update UI components
    if (window.confirm("This change requires a page reload to take effect. Reload now?")) {
      window.location.reload();
    }
  };

  const clearStoredData = () => {
    // Clear debug and cache data but preserve settings
    const settingsToKeep = {
      use_server_api_key: localStorage.getItem("use_server_api_key"),
      enable_file_debug: localStorage.getItem("enable_file_debug"),
      show_api_prompt_button: localStorage.getItem("show_api_prompt_button")
    };
    
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (!(key in settingsToKeep)) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear window debug objects
    if (window._fileProcessingDebug) {
      window._fileProcessingDebug = null;
    }
    
    alert("Debug data cleared successfully");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Debug Menu</span>
              <Badge variant="outline">Developer Options</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="settings">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">Debug Settings</TabsTrigger>
              <TabsTrigger value="fileProcessing">File Processing</TabsTrigger>
              <TabsTrigger value="apiSettings">API Debug</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4 p-2">
              <div className="space-y-6">
                <div className="flex items-center justify-between border rounded p-3">
                  <div>
                    <Label htmlFor="useServerApi" className="font-medium">Use Server API Key</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, uses the server-side API key. When disabled, prompts for a personal API key.
                    </p>
                  </div>
                  <Switch 
                    id="useServerApi" 
                    checked={debugOptions.useServerApi}
                    onCheckedChange={handleToggleServerApi}
                  />
                </div>
                
                <div className="flex items-center justify-between border rounded p-3">
                  <div>
                    <Label htmlFor="enableFileDebug" className="font-medium">Enable File Processing Debug</Label>
                    <p className="text-sm text-muted-foreground">
                      Stores detailed information about file processing decisions in window._fileProcessingDebug
                    </p>
                  </div>
                  <Switch 
                    id="enableFileDebug" 
                    checked={debugOptions.enableFileProcessingDebug}
                    onCheckedChange={handleToggleFileDebug}
                  />
                </div>
                
                <div className="flex items-center justify-between border rounded p-3">
                  <div>
                    <Label htmlFor="showApiButton" className="font-medium">Show API Prompt Button</Label>
                    <p className="text-sm text-muted-foreground">
                      Display the "View API Prompt" button in the grading interface
                    </p>
                  </div>
                  <Switch 
                    id="showApiButton" 
                    checked={debugOptions.showApiPromptButton}
                    onCheckedChange={handleToggleApiPromptButton}
                  />
                </div>
                
                <div className="border rounded p-3">
                  <Label className="font-medium mb-2 block">Clear All Debug Data</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    This will clear all stored debug data including API requests, file processing info, and cached prompts.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={clearStoredData}
                  >
                    Clear Debug Data
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="fileProcessing" className="space-y-4 p-2">
              {fileDebug ? (
                <div className="space-y-4">
                  <div className="border rounded p-3">
                    <h3 className="font-medium mb-2">File Processing Debug Info</h3>
                    <p className="text-sm text-muted-foreground">
                      Timestamp: {fileDebug.timestamp || 'Not available'}
                    </p>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium">Summary</h4>
                      <p className="text-sm">{fileDebug.summary || 'No summary available'}</p>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium">Per-Student Processing</h4>
                      {fileDebug.perStudentFiles && Object.keys(fileDebug.perStudentFiles).length > 0 ? (
                        <ScrollArea className="h-[300px] border rounded mt-2 p-2">
                          {Object.entries(fileDebug.perStudentFiles).map(([student, data]: [string, any], index) => (
                            <div key={index} className="mb-4 border-b pb-2">
                              <h5 className="text-sm font-medium">{student}</h5>
                              <dl className="grid grid-cols-2 gap-2 text-xs mt-1">
                                <dt className="text-muted-foreground">Files Found:</dt>
                                <dd>{data.filesFound || 0}</dd>
                                
                                <dt className="text-muted-foreground">Processing Method:</dt>
                                <dd>{data.processingMethod || 'Standard'}</dd>
                                
                                <dt className="text-muted-foreground">Selected File:</dt>
                                <dd>{data.selectedFile || 'None'}</dd>
                                
                                <dt className="text-muted-foreground">File Size:</dt>
                                <dd>{data.fileSize ? `${Math.round(data.fileSize / 1024)} KB` : 'Unknown'}</dd>
                                
                                <dt className="text-muted-foreground">Is Empty:</dt>
                                <dd>{data.isEmpty ? 'Yes' : 'No'}</dd>
                              </dl>
                            </div>
                          ))}
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">
                          No per-student processing data available
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-muted-foreground">
                    No file processing debug information available.
                    <br />Make sure "Enable File Processing Debug" is turned on and process some files first.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="apiSettings" className="p-2">
              <Button
                onClick={() => setShowApiDebug(true)}
                variant="outline"
                className="mb-4"
              >
                View OpenAI API Requests
              </Button>
              
              <div className="border rounded p-3">
                <h3 className="font-medium mb-2">OpenAI API Settings</h3>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm">Model:</Label>
                      <p className="text-sm text-muted-foreground">gpt-4o-mini</p>
                    </div>
                    <div>
                      <Label className="text-sm">Temperature:</Label>
                      <p className="text-sm text-muted-foreground">0.7</p>
                    </div>
                    <div>
                      <Label className="text-sm">Using Server Key:</Label>
                      <p className="text-sm text-muted-foreground">
                        {debugOptions.useServerApi ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="mt-4">
                      <Label className="text-sm font-medium">Access Mode:</Label>
                      <p className="text-sm text-muted-foreground">
                        {debugOptions.useServerApi 
                          ? 'Server-side proxy via Supabase Edge Function' 
                          : 'Direct API access with personal key'}
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* API Debug Dialog */}
      <GradingApiDebug
        open={showApiDebug}
        onClose={() => setShowApiDebug(false)}
      />
    </>
  );
};

export default DebugMenu;