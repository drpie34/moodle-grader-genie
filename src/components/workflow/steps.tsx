
import React from "react";
import { Upload, Pencil, ClipboardCheck, Download } from "lucide-react";

export const WORKFLOW_STEPS = [
  { id: 1, title: "Upload Files", icon: <Upload className="h-5 w-5" /> },
  { id: 2, title: "Assignment Details", icon: <Pencil className="h-5 w-5" /> },
  { id: 3, title: "Review Grades", icon: <ClipboardCheck className="h-5 w-5" /> },
  { id: 4, title: "Process & Download", icon: <Download className="h-5 w-5" /> }
];
