/**
 * 360° Panorama Viewer - Main Entry Point
 */

import { TourViewer } from './viewer/TourViewer';
import { HotspotEditor } from './editor/HotspotEditor';
import type { Tour } from './types';
import './styles/main.css';
import './styles/editor.css';

// Demo tour configuration with a sample panorama
// In production, this would be loaded from the API
const demoTour: Tour = {
  id: 'demo-tour',
  name: 'Demo Tour',
  description: 'Eine Beispiel-Tour zum Testen des Viewers',
  panoramas: [
    {
      id: 'pano-1',
      name: 'Hauptansicht',
      description: 'Die erste Panorama-Ansicht',
      images: {
        // Using a sample equirectangular panorama from Wikimedia Commons
        high: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Villa_Medicis%2C_Rome_-_360%C2%B0_panorama.jpg/4096px-Villa_Medicis%2C_Rome_-_360%C2%B0_panorama.jpg',
        medium: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Villa_Medicis%2C_Rome_-_360%C2%B0_panorama.jpg/2048px-Villa_Medicis%2C_Rome_-_360%C2%B0_panorama.jpg',
        low: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Villa_Medicis%2C_Rome_-_360%C2%B0_panorama.jpg/512px-Villa_Medicis%2C_Rome_-_360%C2%B0_panorama.jpg',
      },
      initialView: {
        yaw: 0,
        pitch: 0,
        fov: 70,
      },
      hotspots: [
        {
          id: 'info-1',
          type: 'info',
          position: { yaw: 45, pitch: 0 },
          tooltip: 'Mehr Informationen',
          content: {
            title: 'Villa Medici',
            description: 'Die Villa Medici in Rom ist ein historisches Gebäude auf dem Pincio-Hügel. Sie beherbergt heute die Académie de France à Rome.',
            link: {
              url: 'https://de.wikipedia.org/wiki/Villa_Medici_(Rom)',
              label: 'Wikipedia öffnen',
            },
          },
        },
        {
          id: 'info-2',
          type: 'info',
          position: { yaw: -90, pitch: 10 },
          tooltip: 'Garten',
          content: {
            title: 'Historischer Garten',
            description: 'Der Garten der Villa Medici ist ein Meisterwerk der Renaissance-Gartenkunst mit geometrischen Beeten und antiken Skulpturen.',
          },
        },
      ],
    },
    {
      id: 'pano-2',
      name: 'Zweite Ansicht',
      description: 'Eine weitere Panorama-Ansicht',
      images: {
        // Another sample panorama
        high: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mercator_projection_SW.jpg/4096px-Mercator_projection_SW.jpg',
        medium: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mercator_projection_SW.jpg/2048px-Mercator_projection_SW.jpg',
        low: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mercator_projection_SW.jpg/512px-Mercator_projection_SW.jpg',
      },
      initialView: {
        yaw: 0,
        pitch: 0,
        fov: 70,
      },
      hotspots: [],
    },
  ],
  settings: {
    autoTour: false,
    autoTourDelay: 5,
    showControls: true,
    allowFullscreen: true,
    keyboardNavigation: true,
    defaultFov: 70,
    minFov: 30,
    maxFov: 90,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Add navigation hotspots between panoramas
demoTour.panoramas[0].hotspots.push({
  id: 'nav-1',
  type: 'navigation',
  position: { yaw: 180, pitch: -15 },
  tooltip: 'Zur zweiten Ansicht',
  targetPanorama: 'pano-2',
});

demoTour.panoramas[1].hotspots.push({
  id: 'nav-2',
  type: 'navigation',
  position: { yaw: 0, pitch: -15 },
  tooltip: 'Zurück zur Hauptansicht',
  targetPanorama: 'pano-1',
});

// Initialize viewer and editor
let viewer: TourViewer | null = null;
let editor: HotspotEditor | null = null;

async function init() {
  const loadingEl = document.getElementById('loading');
  
  // Check for uploaded panorama in localStorage
  const uploadedPanoramaStr = localStorage.getItem('uploadedPanorama');
  let tourToUse = demoTour;
  
  if (uploadedPanoramaStr) {
    try {
      const uploadedPanorama = JSON.parse(uploadedPanoramaStr);
      console.log('📷 Using uploaded panorama:', uploadedPanorama.id);
      tourToUse = {
        ...demoTour,
        id: 'uploaded-tour',
        name: 'Hochgeladene Tour',
        panoramas: [uploadedPanorama],
      };
      // Clear after use
      localStorage.removeItem('uploadedPanorama');
    } catch (e) {
      console.warn('Could not parse uploaded panorama:', e);
    }
  }
  
  try {
    viewer = new TourViewer({
      container: '#viewer',
      tour: tourToUse,
      onReady: () => {
        console.log('🌐 360° Viewer ready');
        loadingEl?.classList.add('hidden');
      },
      onPanoramaChange: (panoramaId) => {
        console.log(`📍 Switched to panorama: ${panoramaId}`);
        // Re-initialize editor for new panorama if active
        if (editor?.getIsActive()) {
          initEditor();
        }
      },
      onHotspotClick: (hotspot) => {
        console.log(`🔵 Hotspot clicked:`, hotspot);
      },
    });
  } catch (error) {
    console.error('Failed to initialize viewer:', error);
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted);">
          <p>Fehler beim Laden des Panoramas</p>
          <small>${error instanceof Error ? error.message : 'Unbekannter Fehler'}</small>
        </div>
      `;
    }
  }
}

function initEditor() {
  if (!viewer) return;
  
  const psvViewer = viewer.getViewer();
  const markersPlugin = viewer.getMarkersPlugin();
  const panorama = viewer.getCurrentPanorama();
  
  if (!psvViewer || !markersPlugin || !panorama) {
    console.warn('Cannot initialize editor: viewer not ready');
    return;
  }
  
  // Destroy existing editor
  editor?.deactivate();
  
  editor = new HotspotEditor({
    viewer: psvViewer,
    markersPlugin,
    panorama,
    onHotspotAdd: (hotspot) => {
      console.log('➕ Hotspot added:', hotspot);
    },
    onHotspotUpdate: (hotspot) => {
      console.log('✏️ Hotspot updated:', hotspot);
    },
    onHotspotDelete: (id) => {
      console.log('🗑️ Hotspot deleted:', id);
    },
    onSave: (updatedPanorama) => {
      console.log('💾 Panorama saved:', updatedPanorama);
      // In production, this would save to the API
      alert('Konfiguration gespeichert! (In der Konsole als JSON sichtbar)');
      console.log('JSON:', JSON.stringify(updatedPanorama, null, 2));
    },
  });
  
  editor.activate();
}

// Set up control buttons
function setupControls() {
  document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
    viewer?.toggleFullscreen();
  });

  document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
    viewer?.zoomIn();
  });

  document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
    viewer?.zoomOut();
  });

  // Edit button
  document.getElementById('edit-btn')?.addEventListener('click', () => {
    if (editor?.getIsActive()) {
      editor.deactivate();
    } else {
      initEditor();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only handle if not in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'f':
      case 'F':
        viewer?.toggleFullscreen();
        break;
      case '+':
      case '=':
        viewer?.zoomIn();
        break;
      case '-':
      case '_':
        viewer?.zoomOut();
        break;
      case 'e':
      case 'E':
        if (editor?.getIsActive()) {
          editor.deactivate();
        } else {
          initEditor();
        }
        break;
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  init();
  setupControls();
});
