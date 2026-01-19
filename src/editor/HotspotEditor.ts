/**
 * HotspotEditor - Visual editor for placing and editing hotspots
 * Allows clicking in panorama to place hotspots, drag to move, and panel to edit content
 */

import type { Viewer } from '@photo-sphere-viewer/core';
import type { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import type { Hotspot, InfoHotspot, NavigationHotspot, Panorama } from '../types';

export interface HotspotEditorOptions {
  viewer: Viewer;
  markersPlugin: MarkersPlugin;
  panorama: Panorama;
  onHotspotAdd?: (hotspot: Hotspot) => void;
  onHotspotUpdate?: (hotspot: Hotspot) => void;
  onHotspotDelete?: (hotspotId: string) => void;
  onSave?: (panorama: Panorama) => void;
}

type HotspotToolType = 'info' | 'navigation' | 'select';

export class HotspotEditor {
  private viewer: Viewer;
  private markersPlugin: MarkersPlugin;
  private panorama: Panorama;
  private options: HotspotEditorOptions;
  
  private isActive = false;
  private currentTool: HotspotToolType = 'select';
  private selectedHotspot: Hotspot | null = null;
  private editorPanel: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;

  constructor(options: HotspotEditorOptions) {
    this.options = options;
    this.viewer = options.viewer;
    this.markersPlugin = options.markersPlugin;
    this.panorama = { ...options.panorama, hotspots: [...options.panorama.hotspots] };
  }

  /**
   * Activate editor mode
   */
  activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.createToolbar();
    this.createEditorPanel();
    this.setupEventListeners();
    this.updateMarkerStyles();

    document.body.classList.add('editor-active');
  }

  /**
   * Deactivate editor mode
   */
  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;

    this.removeToolbar();
    this.removeEditorPanel();
    this.removeEventListeners();
    this.resetMarkerStyles();

    document.body.classList.remove('editor-active');
    this.selectedHotspot = null;
  }

  /**
   * Toggle editor mode
   */
  toggle(): void {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  /**
   * Check if editor is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current panorama with all hotspots
   */
  getPanorama(): Panorama {
    return this.panorama;
  }

  /**
   * Export tour configuration as JSON
   */
  exportJson(): string {
    return JSON.stringify(this.panorama, null, 2);
  }

  // ==========================================
  // UI Creation
  // ==========================================

  private createToolbar(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'editor-toolbar';
    this.toolbar.innerHTML = `
      <div class="toolbar-group">
        <button class="toolbar-btn active" data-tool="select" title="Auswählen (V)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
          </svg>
        </button>
        <button class="toolbar-btn" data-tool="info" title="Info-Hotspot (I)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
        <button class="toolbar-btn" data-tool="navigation" title="Navigations-Hotspot (N)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 8 16 12 12 16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button class="toolbar-btn" id="deleteHotspotBtn" title="Löschen (Del)" disabled>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
      <div class="toolbar-spacer"></div>
      <div class="toolbar-group">
        <button class="toolbar-btn toolbar-btn-primary" id="saveBtn" title="Speichern">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Speichern</span>
        </button>
        <button class="toolbar-btn" id="exportBtn" title="Als JSON exportieren">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button class="toolbar-btn" id="closeEditorBtn" title="Editor schließen (Esc)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(this.toolbar);

    // Tool selection
    this.toolbar.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectTool(btn.getAttribute('data-tool') as HotspotToolType);
      });
    });

    // Delete button
    this.toolbar.querySelector('#deleteHotspotBtn')?.addEventListener('click', () => {
      if (this.selectedHotspot) {
        this.deleteHotspot(this.selectedHotspot.id);
      }
    });

    // Save button
    this.toolbar.querySelector('#saveBtn')?.addEventListener('click', () => {
      this.save();
    });

    // Export button
    this.toolbar.querySelector('#exportBtn')?.addEventListener('click', () => {
      this.downloadJson();
    });

    // Close button
    this.toolbar.querySelector('#closeEditorBtn')?.addEventListener('click', () => {
      this.deactivate();
    });
  }

  private removeToolbar(): void {
    this.toolbar?.remove();
    this.toolbar = null;
  }

  private createEditorPanel(): void {
    this.editorPanel = document.createElement('div');
    this.editorPanel.className = 'editor-panel';
    this.editorPanel.innerHTML = `
      <div class="panel-header">
        <h3>Hotspot bearbeiten</h3>
        <button class="panel-close" id="closePanelBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="panel-content">
        <p class="panel-empty">Wähle einen Hotspot aus oder erstelle einen neuen.</p>
      </div>
    `;

    document.body.appendChild(this.editorPanel);

    this.editorPanel.querySelector('#closePanelBtn')?.addEventListener('click', () => {
      this.deselectHotspot();
    });
  }

  private removeEditorPanel(): void {
    this.editorPanel?.remove();
    this.editorPanel = null;
  }

  private selectTool(tool: HotspotToolType): void {
    this.currentTool = tool;
    
    this.toolbar?.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
    });

    // Update cursor
    const container = this.viewer.container;
    container.style.cursor = tool === 'select' ? 'default' : 'crosshair';
  }

  // ==========================================
  // Event Handling
  // ==========================================

  private clickHandler = (e: { data: { rightclick: boolean }; args: [{ yaw: number; pitch: number }] }) => {
    if (e.data.rightclick) return;
    
    const position = e.args[0];
    
    if (this.currentTool === 'info' || this.currentTool === 'navigation') {
      this.addHotspot(this.currentTool, position);
    }
  };

  private markerSelectHandler = (e: { marker: { id: string; data?: { hotspot?: Hotspot } } }) => {
    const hotspot = e.marker.data?.hotspot;
    if (hotspot) {
      this.selectHotspot(hotspot);
    }
  };

  private keydownHandler = (e: KeyboardEvent) => {
    if (!this.isActive) return;
    
    switch (e.key) {
      case 'v':
      case 'V':
        this.selectTool('select');
        break;
      case 'i':
      case 'I':
        this.selectTool('info');
        break;
      case 'n':
      case 'N':
        this.selectTool('navigation');
        break;
      case 'Delete':
      case 'Backspace':
        if (this.selectedHotspot) {
          this.deleteHotspot(this.selectedHotspot.id);
        }
        break;
      case 'Escape':
        if (this.selectedHotspot) {
          this.deselectHotspot();
        } else {
          this.deactivate();
        }
        break;
    }
  };

  private setupEventListeners(): void {
    this.viewer.addEventListener('click', this.clickHandler);
    this.markersPlugin.addEventListener('select-marker', this.markerSelectHandler);
    document.addEventListener('keydown', this.keydownHandler);
  }

  private removeEventListeners(): void {
    this.viewer.removeEventListener('click', this.clickHandler);
    this.markersPlugin.removeEventListener('select-marker', this.markerSelectHandler);
    document.removeEventListener('keydown', this.keydownHandler);
  }

  // ==========================================
  // Hotspot Management
  // ==========================================

  private addHotspot(type: 'info' | 'navigation', position: { yaw: number; pitch: number }): void {
    const id = `hotspot_${Date.now()}`;
    
    // Convert radians to degrees
    const yawDeg = (position.yaw * 180) / Math.PI;
    const pitchDeg = (position.pitch * 180) / Math.PI;

    let hotspot: Hotspot;

    if (type === 'info') {
      hotspot = {
        id,
        type: 'info',
        position: { yaw: yawDeg, pitch: pitchDeg },
        tooltip: 'Neuer Info-Punkt',
        content: {
          title: 'Neuer Info-Punkt',
          description: '',
        },
      } as InfoHotspot;
    } else {
      hotspot = {
        id,
        type: 'navigation',
        position: { yaw: yawDeg, pitch: pitchDeg },
        tooltip: 'Navigation',
        targetPanorama: '',
      } as NavigationHotspot;
    }

    // Add to panorama
    this.panorama.hotspots.push(hotspot);

    // Add marker to viewer
    this.addMarkerForHotspot(hotspot);

    // Select the new hotspot
    this.selectHotspot(hotspot);

    // Callback
    this.options.onHotspotAdd?.(hotspot);

    // Switch to select tool
    this.selectTool('select');
  }

  private addMarkerForHotspot(hotspot: Hotspot): void {
    const isInfo = hotspot.type === 'info';
    
    this.markersPlugin.addMarker({
      id: hotspot.id,
      position: {
        yaw: `${hotspot.position.yaw}deg`,
        pitch: `${hotspot.position.pitch}deg`,
      },
      html: `<div class="hotspot hotspot-${hotspot.type} editor-hotspot" data-hotspot-id="${hotspot.id}"></div>`,
      anchor: 'center center',
      tooltip: hotspot.tooltip,
      data: { hotspot },
    });
  }

  private selectHotspot(hotspot: Hotspot): void {
    this.selectedHotspot = hotspot;

    // Update marker styles
    this.markersPlugin.getMarkers().forEach((marker) => {
      const el = marker.domElement;
      if (el) {
        el.classList.toggle('selected', marker.id === hotspot.id);
      }
    });

    // Update delete button
    const deleteBtn = this.toolbar?.querySelector('#deleteHotspotBtn') as HTMLButtonElement;
    if (deleteBtn) deleteBtn.disabled = false;

    // Show edit panel
    this.showEditPanel(hotspot);
  }

  private deselectHotspot(): void {
    this.selectedHotspot = null;

    // Update marker styles
    this.markersPlugin.getMarkers().forEach((marker) => {
      marker.domElement?.classList.remove('selected');
    });

    // Update delete button
    const deleteBtn = this.toolbar?.querySelector('#deleteHotspotBtn') as HTMLButtonElement;
    if (deleteBtn) deleteBtn.disabled = true;

    // Hide edit panel
    this.hideEditPanel();
  }

  private deleteHotspot(id: string): void {
    // Remove from panorama
    this.panorama.hotspots = this.panorama.hotspots.filter((h) => h.id !== id);

    // Remove marker
    this.markersPlugin.removeMarker(id);

    // Deselect
    this.deselectHotspot();

    // Callback
    this.options.onHotspotDelete?.(id);
  }

  private updateHotspot(hotspot: Hotspot): void {
    // Update in panorama
    const index = this.panorama.hotspots.findIndex((h) => h.id === hotspot.id);
    if (index !== -1) {
      this.panorama.hotspots[index] = hotspot;
    }

    // Update marker tooltip
    this.markersPlugin.updateMarker({
      id: hotspot.id,
      tooltip: hotspot.tooltip,
      data: { hotspot },
    });

    // Callback
    this.options.onHotspotUpdate?.(hotspot);
  }

  // ==========================================
  // Edit Panel
  // ==========================================

  private showEditPanel(hotspot: Hotspot): void {
    if (!this.editorPanel) return;

    const content = this.editorPanel.querySelector('.panel-content');
    if (!content) return;

    this.editorPanel.classList.add('visible');

    if (hotspot.type === 'info') {
      content.innerHTML = this.renderInfoHotspotForm(hotspot as InfoHotspot);
      this.setupInfoFormListeners(hotspot as InfoHotspot);
    } else {
      content.innerHTML = this.renderNavigationHotspotForm(hotspot as NavigationHotspot);
      this.setupNavigationFormListeners(hotspot as NavigationHotspot);
    }
  }

  private hideEditPanel(): void {
    if (!this.editorPanel) return;

    this.editorPanel.classList.remove('visible');
    
    const content = this.editorPanel.querySelector('.panel-content');
    if (content) {
      content.innerHTML = '<p class="panel-empty">Wähle einen Hotspot aus oder erstelle einen neuen.</p>';
    }
  }

  private renderInfoHotspotForm(hotspot: InfoHotspot): string {
    const content = hotspot.content || {};
    return `
      <form class="hotspot-form" id="hotspotForm">
        <div class="form-group">
          <label>Titel</label>
          <input type="text" name="title" value="${content.title || ''}" placeholder="Titel eingeben..." />
        </div>
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea name="description" rows="3" placeholder="Beschreibung eingeben...">${content.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Bild-URL</label>
          <input type="url" name="image" value="${content.image || ''}" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label>Video-URL</label>
          <input type="url" name="video" value="${content.video || ''}" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label>Link</label>
          <input type="url" name="linkUrl" value="${content.link?.url || ''}" placeholder="https://..." />
          <input type="text" name="linkLabel" value="${content.link?.label || ''}" placeholder="Link-Text (optional)" class="mt-sm" />
        </div>
        <div class="form-group">
          <label>Tooltip</label>
          <input type="text" name="tooltip" value="${hotspot.tooltip || ''}" placeholder="Text beim Hover..." />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Übernehmen</button>
        </div>
      </form>
    `;
  }

  private renderNavigationHotspotForm(hotspot: NavigationHotspot): string {
    return `
      <form class="hotspot-form" id="hotspotForm">
        <div class="form-group">
          <label>Ziel-Panorama ID</label>
          <input type="text" name="targetPanorama" value="${hotspot.targetPanorama || ''}" placeholder="z.B. pano-2" />
        </div>
        <div class="form-group">
          <label>Tooltip</label>
          <input type="text" name="tooltip" value="${hotspot.tooltip || ''}" placeholder="Text beim Hover..." />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Übernehmen</button>
        </div>
      </form>
    `;
  }

  private setupInfoFormListeners(hotspot: InfoHotspot): void {
    const form = this.editorPanel?.querySelector('#hotspotForm') as HTMLFormElement;
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      
      const updated: InfoHotspot = {
        ...hotspot,
        tooltip: formData.get('tooltip') as string || undefined,
        content: {
          title: formData.get('title') as string || undefined,
          description: formData.get('description') as string || undefined,
          image: formData.get('image') as string || undefined,
          video: formData.get('video') as string || undefined,
          link: (formData.get('linkUrl') as string) ? {
            url: formData.get('linkUrl') as string,
            label: formData.get('linkLabel') as string || undefined,
          } : undefined,
        },
      };

      this.updateHotspot(updated);
      this.selectedHotspot = updated;
    });
  }

  private setupNavigationFormListeners(hotspot: NavigationHotspot): void {
    const form = this.editorPanel?.querySelector('#hotspotForm') as HTMLFormElement;
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      
      const updated: NavigationHotspot = {
        ...hotspot,
        tooltip: formData.get('tooltip') as string || undefined,
        targetPanorama: formData.get('targetPanorama') as string,
      };

      this.updateHotspot(updated);
      this.selectedHotspot = updated;
    });
  }

  // ==========================================
  // Marker Styles
  // ==========================================

  private updateMarkerStyles(): void {
    // Add editor-mode class to all markers
    this.markersPlugin.getMarkers().forEach((marker) => {
      marker.domElement?.classList.add('editor-mode');
    });
  }

  private resetMarkerStyles(): void {
    this.markersPlugin.getMarkers().forEach((marker) => {
      marker.domElement?.classList.remove('editor-mode', 'selected');
    });
  }

  // ==========================================
  // Save & Export
  // ==========================================

  private save(): void {
    this.options.onSave?.(this.panorama);
    
    // Show save confirmation
    const saveBtn = this.toolbar?.querySelector('#saveBtn');
    if (saveBtn) {
      saveBtn.classList.add('saved');
      setTimeout(() => saveBtn.classList.remove('saved'), 2000);
    }
  }

  private downloadJson(): void {
    const json = this.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.panorama.id || 'panorama'}-config.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}
