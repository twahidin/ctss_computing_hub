import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import formidable from 'formidable';
import fs from 'fs';
import { extractTextFromPDF } from '@/lib/pdfService';

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ParsedPdf {
  filename: string;
  extractedText: string;
  numPages: number;
  uploadedAt: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = session.user;

  // Only teachers and admins can upload
  if (!['teacher', 'admin', 'super_admin'].includes(user.profile)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max (will validate individually below)
      filter: ({ mimetype }) => {
        return mimetype === 'application/pdf';
      },
    });

    const [fields, files] = await form.parse(req);
    
    const uploadType = fields.type?.[0]; // 'learningOutcomes' or 'resource'
    const uploadedFiles = files.file || files.files || [];

    if (!uploadType) {
      return res.status(400).json({ message: 'Upload type is required (learningOutcomes or resource)' });
    }

    // Validate based on upload type
    if (uploadType === 'learningOutcomes') {
      if (uploadedFiles.length !== 1) {
        return res.status(400).json({ message: 'Exactly one learning outcomes PDF is required' });
      }
      const file = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;
      if (file.size > 2 * 1024 * 1024) {
        return res.status(400).json({ message: 'Learning outcomes PDF must be under 2MB' });
      }
    } else if (uploadType === 'resource') {
      const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
      if (filesArray.length > 3) {
        return res.status(400).json({ message: 'Maximum 3 resource PDFs allowed' });
      }
      for (const file of filesArray) {
        if (file.size > 5 * 1024 * 1024) {
          return res.status(400).json({ message: 'Each resource PDF must be under 5MB' });
        }
      }
    } else {
      return res.status(400).json({ message: 'Invalid upload type' });
    }

    // Process each PDF file
    const parsedPdfs: ParsedPdf[] = [];
    const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

    for (const file of filesArray) {
      // Read the file
      const fileBuffer = fs.readFileSync(file.filepath);
      
      // Extract text from PDF
      const pdfData = await extractTextFromPDF(fileBuffer);
      
      parsedPdfs.push({
        filename: file.originalFilename || 'unknown.pdf',
        extractedText: pdfData.text,
        numPages: pdfData.numPages,
        uploadedAt: new Date(),
      });

      // Clean up temp file
      fs.unlinkSync(file.filepath);
    }

    // Return the parsed data
    if (uploadType === 'learningOutcomes') {
      return res.status(200).json({
        success: true,
        type: 'learningOutcomes',
        pdf: parsedPdfs[0],
      });
    } else {
      return res.status(200).json({
        success: true,
        type: 'resource',
        pdfs: parsedPdfs,
      });
    }

  } catch (error: any) {
    console.error('PDF upload error:', error);
    
    // Handle specific formidable errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    if (error.message?.includes('not supported')) {
      return res.status(400).json({ message: 'Only PDF files are supported' });
    }
    
    return res.status(500).json({ message: error.message || 'Failed to process PDF' });
  }
}
