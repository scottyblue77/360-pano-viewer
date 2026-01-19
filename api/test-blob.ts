/**
 * Test Blob Storage API
 * Verifies that Blob storage is working correctly
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const results: {
    step: string;
    status: 'success' | 'error' | 'skipped';
    details?: string;
    data?: unknown;
  }[] = [];

  try {
    // Step 1: Check if token exists
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    results.push({
      step: '1. BLOB_READ_WRITE_TOKEN vorhanden',
      status: hasToken ? 'success' : 'error',
      details: hasToken ? 'Token gefunden' : 'Token fehlt!',
    });

    if (!hasToken) {
      res.status(500).json({ success: false, results });
      return;
    }

    // Step 2: Try to list existing blobs
    try {
      const { blobs } = await list({ prefix: 'panoramas/', limit: 5 });
      results.push({
        step: '2. Blob Storage erreichbar',
        status: 'success',
        details: `${blobs.length} Dateien gefunden`,
        data: blobs.map(b => ({
          pathname: b.pathname,
          size: `${(b.size / 1024).toFixed(1)} KB`,
          url: b.url,
        })),
      });
    } catch (error) {
      results.push({
        step: '2. Blob Storage erreichbar',
        status: 'error',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    }

    // Step 3: Try to upload a test file
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testPath = `test/verification-${Date.now()}.txt`;
    
    try {
      const blob = await put(testPath, testContent, {
        access: 'public',
        contentType: 'text/plain',
      });
      results.push({
        step: '3. Test-Upload',
        status: 'success',
        details: 'Test-Datei erfolgreich hochgeladen',
        data: {
          url: blob.url,
          pathname: blob.pathname,
        },
      });

      // Step 4: Verify the upload by fetching the file
      try {
        const response = await fetch(blob.url);
        const content = await response.text();
        const matches = content === testContent;
        results.push({
          step: '4. Upload-Verifikation',
          status: matches ? 'success' : 'error',
          details: matches ? 'Inhalt stimmt überein' : 'Inhalt stimmt NICHT überein!',
          data: {
            expected: testContent,
            received: content,
          },
        });
      } catch (error) {
        results.push({
          step: '4. Upload-Verifikation',
          status: 'error',
          details: error instanceof Error ? error.message : 'Fetch fehlgeschlagen',
        });
      }

      // Step 5: Delete test file
      try {
        await del(blob.url);
        results.push({
          step: '5. Test-Datei gelöscht',
          status: 'success',
          details: 'Cleanup erfolgreich',
        });
      } catch (error) {
        results.push({
          step: '5. Test-Datei gelöscht',
          status: 'error',
          details: error instanceof Error ? error.message : 'Löschen fehlgeschlagen',
        });
      }
    } catch (error) {
      results.push({
        step: '3. Test-Upload',
        status: 'error',
        details: error instanceof Error ? error.message : 'Upload fehlgeschlagen',
      });
    }

    // Summary
    const allSuccess = results.every(r => r.status === 'success');
    
    res.status(200).json({
      success: allSuccess,
      summary: allSuccess 
        ? '✅ Blob Storage funktioniert einwandfrei!' 
        : '⚠️ Es gibt Probleme mit dem Blob Storage',
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      results,
    });
  }
}
