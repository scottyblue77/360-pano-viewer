/**
 * UploadPanel - Drag & Drop Upload UI for DNG files
 * Handles large file uploads with progress indication
 */

export interface UploadResult {
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

export interface UploadPanelOptions {
  container: HTMLElement | string;
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export class UploadPanel {
  private container: HTMLElement;
  private options: UploadPanelOptions;
  private dropZone: HTMLElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private progressBar: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;
  private isUploading = false;

  constructor(options: UploadPanelOptions) {
    this.options = options;

    if (typeof options.container === 'string') {
      const el = document.querySelector(options.container);
      if (!el) throw new Error(`Container "${options.container}" not found`);
      this.container = el as HTMLElement;
    } else {
      this.container = options.container;
    }

    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="upload-panel">
        <div class="upload-header">
          <h2>Panorama hochladen</h2>
          <p class="upload-subtitle">DNG, JPEG oder WebP (max. 200MB)</p>
        </div>
        
        <div class="upload-dropzone" id="dropzone">
          <div class="dropzone-content">
            <div class="dropzone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p class="dropzone-text">Datei hierher ziehen</p>
            <p class="dropzone-or">oder</p>
            <button class="upload-btn" id="selectFileBtn">Datei auswählen</button>
          </div>
          <input type="file" id="fileInput" accept=".dng,.DNG,.jpg,.jpeg,.webp,.png" hidden />
        </div>

        <div class="upload-progress hidden" id="uploadProgress">
          <div class="progress-info">
            <span class="file-name" id="fileName">-</span>
            <span class="file-size" id="fileSize">-</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progressBar"></div>
          </div>
          <div class="progress-status">
            <span id="statusText">Wird hochgeladen...</span>
            <span id="progressPercent">0%</span>
          </div>
        </div>

        <div class="upload-result hidden" id="uploadResult">
          <div class="result-success hidden" id="resultSuccess">
            <div class="result-icon success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p>Panorama erfolgreich konvertiert!</p>
            <div class="result-previews" id="resultPreviews"></div>
            <button class="btn-primary" id="viewPanoramaBtn">Panorama ansehen</button>
          </div>
          <div class="result-error hidden" id="resultError">
            <div class="result-icon error">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p id="errorMessage">Fehler beim Upload</p>
            <button class="btn-secondary" id="retryBtn">Erneut versuchen</button>
          </div>
        </div>
      </div>
    `;

    // Get references
    this.dropZone = this.container.querySelector('#dropzone');
    this.fileInput = this.container.querySelector('#fileInput');
    this.progressBar = this.container.querySelector('#progressBar');
    this.statusText = this.container.querySelector('#statusText');
  }

  private setupEventListeners(): void {
    const selectBtn = this.container.querySelector('#selectFileBtn');
    const retryBtn = this.container.querySelector('#retryBtn');
    const viewBtn = this.container.querySelector('#viewPanoramaBtn');

    // Click to select file
    selectBtn?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    // File input change
    this.fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleFile(file);
    });

    // Drag & Drop
    this.dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone?.classList.add('dragover');
    });

    this.dropZone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone?.classList.remove('dragover');
    });

    this.dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone?.classList.remove('dragover');
      
      const file = e.dataTransfer?.files?.[0];
      if (file) this.handleFile(file);
    });

    // Retry button
    retryBtn?.addEventListener('click', () => {
      this.reset();
    });

    // View panorama button
    viewBtn?.addEventListener('click', () => {
      // Will be connected to viewer
      window.location.reload();
    });
  }

  private async handleFile(file: File): Promise<void> {
    // Validate file
    const validExtensions = ['.dng', '.jpg', '.jpeg', '.webp', '.png'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      this.showError('Ungültiges Dateiformat. Bitte DNG, JPEG oder WebP verwenden.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) { // 200MB limit
      this.showError('Datei zu groß. Maximum ist 200MB.');
      return;
    }

    this.isUploading = true;
    this.showProgress(file);
    this.options.onUploadStart?.(file);

    try {
      const result = await this.uploadFile(file);
      
      if (result.success) {
        this.showSuccess(result);
        this.options.onUploadComplete?.(result);
      } else {
        this.showError(result.error || 'Upload fehlgeschlagen');
        this.options.onError?.(result.error || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.showError(message);
      this.options.onError?.(message);
    }

    this.isUploading = false;
  }

  private async uploadFile(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          this.updateProgress(progress, e.loaded, e.total);
          this.options.onUploadProgress?.(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            resolve({ success: false, error: 'Ungültige Server-Antwort' });
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            resolve({ success: false, error: error.message || `HTTP ${xhr.status}` });
          } catch {
            resolve({ success: false, error: `HTTP ${xhr.status}` });
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Netzwerkfehler beim Upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload abgebrochen'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);

      // Update status text for processing phase
      xhr.upload.addEventListener('loadend', () => {
        this.showConversionStatus();
      });
    });
  }

  private conversionInterval: number | null = null;

  private showConversionStatus(): void {
    const statusText = this.container.querySelector('#statusText');
    const progressPercent = this.container.querySelector('#progressPercent');
    const progressBar = this.container.querySelector('#progressBar') as HTMLElement;
    
    if (progressPercent) progressPercent.textContent = '';
    if (progressBar) progressBar.style.width = '100%';
    
    // Animated status messages
    const stages = [
      { text: '⏳ Server verarbeitet Datei...', delay: 0 },
      { text: '🔍 Analysiere Bildformat...', delay: 2000 },
      { text: '📷 Extrahiere Bilddaten...', delay: 4000 },
      { text: '🖼️ Erstelle 4K Version...', delay: 6000 },
      { text: '🖼️ Erstelle 2K Version...', delay: 9000 },
      { text: '🖼️ Erstelle Preview...', delay: 11000 },
      { text: '💾 Speichere Dateien...', delay: 13000 },
    ];

    let currentStage = 0;
    
    if (statusText) {
      statusText.textContent = stages[0].text;
      
      this.conversionInterval = window.setInterval(() => {
        currentStage++;
        if (currentStage < stages.length && statusText) {
          statusText.textContent = stages[currentStage].text;
        }
      }, 2500);
    }
  }

  private clearConversionStatus(): void {
    if (this.conversionInterval) {
      clearInterval(this.conversionInterval);
      this.conversionInterval = null;
    }
  }

  private showProgress(file: File): void {
    const dropzone = this.container.querySelector('#dropzone');
    const progress = this.container.querySelector('#uploadProgress');
    const result = this.container.querySelector('#uploadResult');
    const fileName = this.container.querySelector('#fileName');
    const fileSize = this.container.querySelector('#fileSize');

    dropzone?.classList.add('hidden');
    progress?.classList.remove('hidden');
    result?.classList.add('hidden');

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = this.formatFileSize(file.size);

    this.updateProgress(0, 0, file.size);
  }

  private updateProgress(percent: number, loaded: number, total: number): void {
    const progressBar = this.container.querySelector('#progressBar') as HTMLElement;
    const progressPercent = this.container.querySelector('#progressPercent');

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
    if (progressPercent) {
      progressPercent.textContent = `${percent}%`;
    }
  }

  private showSuccess(result: UploadResult): void {
    this.clearConversionStatus();
    
    const progress = this.container.querySelector('#uploadProgress');
    const resultEl = this.container.querySelector('#uploadResult');
    const successEl = this.container.querySelector('#resultSuccess');
    const errorEl = this.container.querySelector('#resultError');
    const previews = this.container.querySelector('#resultPreviews');

    progress?.classList.add('hidden');
    resultEl?.classList.remove('hidden');
    successEl?.classList.remove('hidden');
    errorEl?.classList.add('hidden');

    // Show preview images and optional warning
    if (previews && result.images) {
      let warningHtml = '';
      if (result.warning) {
        warningHtml = `
          <div class="upload-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>${result.warning}</span>
          </div>
        `;
      }
      
      previews.innerHTML = `
        ${warningHtml}
        <div class="preview-grid">
          <div class="preview-item">
            <img src="${result.images.low}" alt="Preview" />
            <span>Preview</span>
          </div>
        </div>
      `;
    }
  }

  private showError(message: string): void {
    this.clearConversionStatus();
    
    const dropzone = this.container.querySelector('#dropzone');
    const progress = this.container.querySelector('#uploadProgress');
    const resultEl = this.container.querySelector('#uploadResult');
    const successEl = this.container.querySelector('#resultSuccess');
    const errorEl = this.container.querySelector('#resultError');
    const errorMessage = this.container.querySelector('#errorMessage');

    dropzone?.classList.add('hidden');
    progress?.classList.add('hidden');
    resultEl?.classList.remove('hidden');
    successEl?.classList.add('hidden');
    errorEl?.classList.remove('hidden');

    if (errorMessage) errorMessage.textContent = message;
  }

  private reset(): void {
    const dropzone = this.container.querySelector('#dropzone');
    const progress = this.container.querySelector('#uploadProgress');
    const resultEl = this.container.querySelector('#uploadResult');

    dropzone?.classList.remove('hidden');
    progress?.classList.add('hidden');
    resultEl?.classList.add('hidden');

    if (this.fileInput) this.fileInput.value = '';
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}
