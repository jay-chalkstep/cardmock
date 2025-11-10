/**
 * Watermark Utilities
 * Adds watermarks to Word documents to mark previous versions
 */

import JSZip from 'jszip';
import { logger } from './logger';

/**
 * Add watermark to a Word document
 * Downloads the document, adds a "PREVIOUS VERSION" watermark, and returns the watermarked buffer
 */
export async function addWatermarkToDocument(fileUrl: string): Promise<Buffer> {
  try {
    // Fetch the document
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if it's a .docx file (we'll handle .doc files differently)
    if (fileUrl.toLowerCase().endsWith('.docx')) {
      return await addWatermarkToDocx(buffer);
    } else if (fileUrl.toLowerCase().endsWith('.doc')) {
      // For .doc files, we'll need to convert or use a different approach
      // For now, return the original buffer and log a warning
      logger.warn('Watermarking .doc files is not yet supported. Only .docx files can be watermarked.');
      return buffer;
    }

    return buffer;
  } catch (error) {
    logger.error('Error adding watermark to document:', {
      error: error instanceof Error ? error.message : String(error),
      fileUrl,
    });
    throw new Error(`Failed to add watermark: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add watermark to a .docx file
 * Uses JSZip to modify the document XML and add a watermark shape
 */
async function addWatermarkToDocx(buffer: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    // Get the main document XML
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Could not find word/document.xml in document');
    }

    // Create a watermark paragraph with "PREVIOUS VERSION" text
    // This adds a text box that appears behind the document content
    // Using a simple approach with a paragraph containing a text box
    const watermarkParagraph = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <w:r>
          <w:drawing>
            <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">
              <wp:simplePos x="0" y="0"/>
              <wp:positionH relativeFrom="page">
                <wp:posOffset>0</wp:posOffset>
              </wp:positionH>
              <wp:positionV relativeFrom="page">
                <wp:posOffset>0</wp:posOffset>
              </wp:positionV>
              <wp:extent cx="9144000" cy="9144000"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:wrapNone/>
              <wp:docPr id="999999" name="Previous Version Watermark"/>
              <wp:cNvGraphicFramePr/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                  <wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                    <wps:cNvPr id="999999" name="Previous Version Watermark"/>
                    <wps:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="9144000" cy="9144000"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect">
                        <a:avLst/>
                      </a:prstGeom>
                      <a:noFill/>
                      <a:ln w="0">
                        <a:noFill/>
                      </a:ln>
                    </wps:spPr>
                    <wps:txbx>
                      <w:txbxContent xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                        <w:p>
                          <w:r>
                            <w:rPr>
                              <w:color w:val="FF0000"/>
                              <w:sz w:val="72"/>
                              <w:szCs w:val="72"/>
                            </w:rPr>
                            <w:t>PREVIOUS VERSION</w:t>
                          </w:r>
                        </w:p>
                      </w:txbxContent>
                    </wps:txbx>
                  </wps:wsp>
                </a:graphicData>
              </a:graphic>
            </wp:anchor>
          </w:drawing>
        </w:r>
      </w:p>
    `;

    // Insert watermark at the beginning of the document body
    // Find the opening <w:body> tag and insert watermark right after it
    const bodyStartIndex = documentXml.indexOf('<w:body>');
    if (bodyStartIndex === -1) {
      throw new Error('Could not find <w:body> tag in document');
    }

    const bodyTagEnd = documentXml.indexOf('>', bodyStartIndex) + 1;
    const modifiedXml = 
      documentXml.substring(0, bodyTagEnd) + 
      watermarkParagraph + 
      documentXml.substring(bodyTagEnd);

    // Update the document.xml in the zip
    zip.file('word/document.xml', modifiedXml);

    // Generate the new buffer
    const watermarkedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return Buffer.from(watermarkedBuffer);
  } catch (error) {
    logger.error('Error adding watermark to .docx:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

