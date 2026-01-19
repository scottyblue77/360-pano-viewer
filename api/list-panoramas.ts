/**
 * List Panoramas API Route
 * Lists all uploaded panoramas from Vercel Blob Storage
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Check if Blob storage is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      res.status(500).json({
        error: 'BLOB_READ_WRITE_TOKEN nicht konfiguriert',
        configured: false,
      });
      return;
    }

    // List all blobs in the panoramas folder
    const { blobs, cursor, hasMore } = await list({
      prefix: 'panoramas/',
      limit: 100,
    });

    // Group blobs by panorama ID
    const panoramas: Record<string, {
      id: string;
      files: Array<{
        resolution: string;
        url: string;
        size: number;
        uploadedAt: string;
      }>;
      totalSize: number;
    }> = {};

    for (const blob of blobs) {
      // Extract panorama ID from path: panoramas/{id}/{resolution}.webp
      const parts = blob.pathname.split('/');
      if (parts.length >= 3) {
        const panoramaId = parts[1];
        const fileName = parts[2];
        const resolution = fileName.replace('.webp', '');

        if (!panoramas[panoramaId]) {
          panoramas[panoramaId] = {
            id: panoramaId,
            files: [],
            totalSize: 0,
          };
        }

        panoramas[panoramaId].files.push({
          resolution,
          url: blob.url,
          size: blob.size,
          uploadedAt: blob.uploadedAt.toISOString(),
        });
        panoramas[panoramaId].totalSize += blob.size;
      }
    }

    // Convert to array and sort by upload date (newest first)
    const panoramaList = Object.values(panoramas).sort((a, b) => {
      const dateA = a.files[0]?.uploadedAt || '';
      const dateB = b.files[0]?.uploadedAt || '';
      return dateB.localeCompare(dateA);
    });

    res.status(200).json({
      success: true,
      count: panoramaList.length,
      totalBlobs: blobs.length,
      hasMore,
      cursor,
      panoramas: panoramaList,
      blobStorageConfigured: true,
    });
  } catch (error) {
    console.error('List panoramas error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
}
