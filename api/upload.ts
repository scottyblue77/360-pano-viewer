/**
 * Upload API Route
 * Handles panorama file uploads and conversion
 * 
 * For large DNG files, we use Vercel Blob Storage
 * Conversion: DNG → WebP (multiple resolutions)
 * 
 * DNG Strategy:
 * 1. Try to extract embedded JPEG preview (most cameras embed one)
 * 2. For Insta360: DNGs often contain full-res JPEG preview
 * 3. Fallback: Use dcraw for RAW decoding (if available)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import sharp from 'sharp';

// Configure body parser for large files
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '200mb',
    },
  },
};

interface UploadResult {
  success: boolean;
  panoramaId?: string;
  images?: {
    high: string;
    medium: string;
    low: string;
  };
  error?: string;
  warning?: string;
}

// Generate unique ID
function generateId(): string {
  return `pano_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Check if Blob storage is configured
function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Extract embedded JPEG from DNG/RAW file
 * Most cameras (including Insta360) embed a full-resolution JPEG preview
 */
function extractEmbeddedJpeg(buffer: Buffer): Buffer | null {
  // JPEG magic bytes: FFD8FF
  const jpegStart = buffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]));
  if (jpegStart === -1) return null;

  // Find JPEG end marker: FFD9
  let jpegEnd = -1;
  for (let i = jpegStart + 3; i < buffer.length - 1; i++) {
    if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
      jpegEnd = i + 2;
      // Don't break - find the LAST FFD9 (the largest embedded JPEG)
    }
  }

  if (jpegEnd === -1) return null;

  // Extract JPEG data
  const jpegBuffer = buffer.slice(jpegStart, jpegEnd);
  
  // Validate minimum size (at least 100KB for a reasonable preview)
  if (jpegBuffer.length < 100 * 1024) {
    // Try to find a larger embedded JPEG (some DNGs have multiple)
    const secondJpegStart = buffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), jpegStart + 1);
    if (secondJpegStart !== -1 && secondJpegStart < buffer.length - 1000) {
      // Find end of this second JPEG
      let secondEnd = -1;
      for (let i = secondJpegStart + 3; i < buffer.length - 1; i++) {
        if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
          secondEnd = i + 2;
        }
      }
      if (secondEnd !== -1) {
        const secondJpeg = buffer.slice(secondJpegStart, secondEnd);
        if (secondJpeg.length > jpegBuffer.length) {
          return secondJpeg;
        }
      }
    }
  }

  return jpegBuffer;
}

/**
 * Find the largest embedded JPEG in a DNG file
 * Insta360 DNGs typically embed a high-resolution equirectangular JPEG
 */
function findLargestEmbeddedJpeg(buffer: Buffer): Buffer | null {
  const jpegs: Buffer[] = [];
  let searchStart = 0;

  // Find all embedded JPEGs
  while (searchStart < buffer.length) {
    const jpegStart = buffer.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), searchStart);
    if (jpegStart === -1) break;

    // Find the end of this JPEG
    let jpegEnd = -1;
    for (let i = jpegStart + 3; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
        jpegEnd = i + 2;
        break;
      }
    }

    if (jpegEnd !== -1 && jpegEnd > jpegStart) {
      const jpeg = buffer.slice(jpegStart, jpegEnd);
      if (jpeg.length > 50 * 1024) { // At least 50KB
        jpegs.push(jpeg);
      }
      searchStart = jpegEnd;
    } else {
      searchStart = jpegStart + 1;
    }
  }

  if (jpegs.length === 0) return null;

  // Return the largest JPEG found
  return jpegs.reduce((largest, current) => 
    current.length > largest.length ? current : largest
  );
}

// Process and convert image to multiple resolutions
async function processImage(
  buffer: Buffer,
  panoramaId: string,
  originalName: string
): Promise<{ high: string; medium: string; low: string; warning?: string }> {
  const isDng = originalName.toLowerCase().endsWith('.dng');
  
  let imageBuffer = buffer;
  let warning: string | undefined;
  
  // For DNG files, extract the embedded JPEG
  if (isDng) {
    console.log(`Processing DNG file: ${originalName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
    const embeddedJpeg = findLargestEmbeddedJpeg(buffer);
    
    if (embeddedJpeg && embeddedJpeg.length > 500 * 1024) {
      // Found a substantial embedded JPEG (>500KB)
      console.log(`Found embedded JPEG: ${(embeddedJpeg.length / 1024 / 1024).toFixed(2)} MB`);
      imageBuffer = embeddedJpeg;
      warning = 'DNG wurde über eingebettetes JPEG-Preview verarbeitet. Für volle RAW-Qualität bitte das exportierte JPEG/TIFF hochladen.';
    } else {
      throw new Error(
        'Kein eingebettetes JPEG im DNG gefunden. ' +
        'Bitte exportiere das Panorama aus der Insta360-App als JPEG oder TIFF und lade diese Datei hoch.'
      );
    }
  }

  // Load image with sharp
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Ungültiges Bildformat');
  }

  console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);

  // Calculate aspect ratio (should be 2:1 for equirectangular)
  const aspectRatio = metadata.width / metadata.height;
  if (aspectRatio < 1.8 || aspectRatio > 2.2) {
    console.warn(`Warning: Aspect ratio ${aspectRatio.toFixed(2)} is not 2:1. Image may not display correctly as 360° panorama.`);
    if (!warning) {
      warning = `Seitenverhältnis ist ${aspectRatio.toFixed(2)}:1 statt 2:1. Das Bild wird möglicherweise nicht korrekt als 360°-Panorama angezeigt.`;
    }
  }

  // Generate multiple resolutions
  // Adjust based on source resolution
  const maxWidth = Math.min(metadata.width, 4096);
  const maxHeight = Math.min(metadata.height, 2048);
  
  const resolutions = {
    high: { width: maxWidth, height: maxHeight },
    medium: { width: Math.min(2048, maxWidth), height: Math.min(1024, maxHeight) },
    low: { width: 512, height: 256 },
  };

  const urls: { high: string; medium: string; low: string } = {
    high: '',
    medium: '',
    low: '',
  };

  // Check if Blob storage is available
  const useBlob = isBlobConfigured();
  console.log(`Using Blob storage: ${useBlob}`);

  for (const [key, size] of Object.entries(resolutions)) {
    const resizedBuffer = await sharp(imageBuffer)
      .resize(size.width, size.height, {
        fit: 'inside', // Maintain aspect ratio
        withoutEnlargement: true,
      })
      .webp({ quality: key === 'low' ? 60 : 85 })
      .toBuffer();

    console.log(`Generated ${key}: ${size.width}x${size.height} (${(resizedBuffer.length / 1024).toFixed(0)} KB)`);

    if (useBlob) {
      // Upload to Vercel Blob
      const blob = await put(
        `panoramas/${panoramaId}/${key}.webp`,
        resizedBuffer,
        {
          access: 'public',
          contentType: 'image/webp',
        }
      );
      urls[key as keyof typeof urls] = blob.url;
    } else {
      // Return as base64 data URL (for testing without Blob)
      const base64 = resizedBuffer.toString('base64');
      urls[key as keyof typeof urls] = `data:image/webp;base64,${base64}`;
    }
  }

  return { ...urls, warning };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Note: If BLOB_READ_WRITE_TOKEN is not set, we'll use base64 data URLs as fallback
    // This is fine for testing but not recommended for production with large files
    
    // Parse multipart form data
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      res.status(400).json({
        success: false,
        error: 'Content-Type muss multipart/form-data sein',
      });
      return;
    }

    // Get the raw body as buffer
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    console.log(`Received upload: ${(body.length / 1024 / 1024).toFixed(2)} MB`);

    // Extract file from multipart (simplified parsing)
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      res.status(400).json({ success: false, error: 'Invalid multipart boundary' });
      return;
    }

    // Find file data in multipart body
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = splitBuffer(body, boundaryBuffer);
    
    let fileBuffer: Buffer | null = null;
    let fileName = 'upload.jpg';

    for (const part of parts) {
      const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd === -1) continue;
      
      const headerStr = part.slice(0, headerEnd).toString();
      
      if (headerStr.includes('Content-Disposition') && headerStr.includes('filename=')) {
        // Extract filename
        const fileNameMatch = headerStr.match(/filename="([^"]+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
        
        // Get file content (skip headers and trailing CRLF)
        fileBuffer = part.slice(headerEnd + 4);
        // Remove trailing \r\n--
        if (fileBuffer.length > 2 && fileBuffer[fileBuffer.length - 2] === 13 && fileBuffer[fileBuffer.length - 1] === 10) {
          fileBuffer = fileBuffer.slice(0, -2);
        }
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({ success: false, error: 'Keine Datei gefunden' });
      return;
    }

    console.log(`Processing file: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // Generate panorama ID
    const panoramaId = generateId();

    // Process and upload images
    const result = await processImage(fileBuffer, panoramaId, fileName);

    const response: UploadResult = {
      success: true,
      panoramaId,
      images: {
        high: result.high,
        medium: result.medium,
        low: result.low,
      },
      warning: result.warning,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
}

// Helper: Split buffer by delimiter
function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);
  
  while (index !== -1) {
    if (index > start) {
      parts.push(buffer.slice(start, index));
    }
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }
  
  if (start < buffer.length) {
    parts.push(buffer.slice(start));
  }
  
  return parts;
}
