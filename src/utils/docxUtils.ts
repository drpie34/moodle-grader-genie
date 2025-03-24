
/**
 * Utilities for handling DOCX files and extracting formatted content
 */
import mammoth from 'mammoth';

/**
 * Extract HTML content from a DOCX file
 * Preserves formatting like paragraphs, bold, italics, etc.
 */
export async function extractHTMLFromDOCX(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error("Failed to read DOCX file");
        }
        
        const arrayBuffer = e.target.result as ArrayBuffer;
        
        // Configure mammoth to preserve as much formatting as possible
        const options = {
          convertImage: mammoth.images.imgElement(async (image) => {
            const imageBuffer = await image.read();
            const base64Data = Buffer.from(imageBuffer).toString('base64');
            const src = `data:${image.contentType};base64,${base64Data}`;
            return { src }; // Return a plain object with a string src property
          }),
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p => p:fresh",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em",
            "u => u",
            "strike => strike",
            "i => i",
            "b => b",
            "br => br",
            "table => table.table",
            "tr => tr",
            "td => td",
            "th => th",
            "pre => pre"
          ]
        };
        
        const result = await mammoth.convertToHtml({ arrayBuffer }, options);
        let html = result.value;
        
        // Enhance whitespace preservation
        html = html.replace(/\n/g, '<br>');
        
        // Add CSS for better formatting
        html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            ${html}
          </div>
        `;
        
        resolve(html);
      } catch (error) {
        console.error("Error extracting HTML from DOCX:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(new Error("Failed to read DOCX file"));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
