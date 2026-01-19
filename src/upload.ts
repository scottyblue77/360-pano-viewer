/**
 * Upload Page Entry Point
 */

import { UploadPanel } from './components/UploadPanel';
import './styles/main.css';
import './styles/upload.css';

// Additional upload page styles
const style = document.createElement('style');
style.textContent = `
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--color-surface);
    border-bottom: var(--glass-border);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--color-text);
    text-decoration: none;
    font-weight: 600;
    font-size: 1.125rem;
  }

  .logo svg {
    color: var(--color-accent);
  }

  nav {
    display: flex;
    gap: var(--spacing-md);
  }

  .nav-link {
    padding: var(--spacing-xs) var(--spacing-md);
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: 6px;
    transition: all var(--transition-fast);
  }

  .nav-link:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.05);
  }

  .nav-link.active {
    color: var(--color-accent);
    background: rgba(99, 102, 241, 0.1);
  }

  .upload-page {
    min-height: calc(100vh - 60px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    background: 
      radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
      var(--color-bg);
  }

  #upload-container {
    width: 100%;
    max-width: 600px;
  }
`;
document.head.appendChild(style);

// Initialize upload panel
const uploadPanel = new UploadPanel({
  container: '#upload-container',
  onUploadStart: (file) => {
    console.log('📤 Upload started:', file.name, formatFileSize(file.size));
  },
  onUploadProgress: (progress) => {
    console.log(`📊 Progress: ${progress}%`);
  },
  onUploadComplete: (result) => {
    console.log('✅ Upload complete:', result);
    if (result.success && result.images) {
      // Store in localStorage for the viewer
      const panoramaConfig = {
        id: result.panoramaId,
        name: 'Hochgeladenes Panorama',
        images: result.images,
        initialView: { yaw: 0, pitch: 0, fov: 70 },
        hotspots: [],
      };
      localStorage.setItem('uploadedPanorama', JSON.stringify(panoramaConfig));
    }
  },
  onError: (error) => {
    console.error('❌ Upload error:', error);
  },
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  uploadPanel.destroy();
});
