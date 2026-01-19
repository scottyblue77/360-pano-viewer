/**
 * TourViewer - Main 360° Panorama Viewer Class
 * Wraps Photo Sphere Viewer with custom configuration and plugins
 */

import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin';
import type { Tour, Panorama, Hotspot, TourSettings, ViewerState } from '../types';
import { DEFAULT_TOUR_SETTINGS } from '../types';

// Import Photo Sphere Viewer styles
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';

export interface TourViewerOptions {
  container: HTMLElement | string;
  tour?: Tour;
  settings?: Partial<TourSettings>;
  onReady?: () => void;
  onPanoramaChange?: (panoramaId: string) => void;
  onHotspotClick?: (hotspot: Hotspot) => void;
}

export class TourViewer {
  private viewer: Viewer | null = null;
  private markersPlugin: MarkersPlugin | null = null;
  private virtualTourPlugin: VirtualTourPlugin | null = null;
  private autorotatePlugin: AutorotatePlugin | null = null;
  
  private tour: Tour | null = null;
  private settings: TourSettings;
  private state: ViewerState;
  
  private container: HTMLElement;
  private options: TourViewerOptions;

  constructor(options: TourViewerOptions) {
    this.options = options;
    this.settings = { ...DEFAULT_TOUR_SETTINGS, ...options.settings };
    this.state = {
      currentPanorama: null,
      isLoading: true,
      isFullscreen: false,
      isAutoTourActive: false,
      editorMode: false,
    };

    // Get container element
    if (typeof options.container === 'string') {
      const el = document.querySelector(options.container);
      if (!el) throw new Error(`Container "${options.container}" not found`);
      this.container = el as HTMLElement;
    } else {
      this.container = options.container;
    }

    // Initialize if tour is provided
    if (options.tour) {
      this.loadTour(options.tour);
    }
  }

  /**
   * Load a tour configuration and initialize the viewer
   */
  async loadTour(tour: Tour): Promise<void> {
    this.tour = tour;
    
    if (tour.panoramas.length === 0) {
      throw new Error('Tour has no panoramas');
    }

    const firstPanorama = tour.panoramas[0];
    
    // Initialize Photo Sphere Viewer
    this.viewer = new Viewer({
      container: this.container,
      panorama: this.selectImageResolution(firstPanorama),
      defaultYaw: `${firstPanorama.initialView.yaw}deg`,
      defaultPitch: `${firstPanorama.initialView.pitch}deg`,
      defaultZoomLvl: this.fovToZoomLevel(firstPanorama.initialView.fov),
      minFov: this.settings.minFov,
      maxFov: this.settings.maxFov,
      navbar: false, // We use custom controls
      keyboard: this.settings.keyboardNavigation ? 'always' : false,
      touchmoveTwoFingers: false,
      mousewheelCtrlKey: false,
      plugins: this.initPlugins(tour),
    });

    // Get plugin instances
    this.markersPlugin = this.viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    this.virtualTourPlugin = this.viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;
    this.autorotatePlugin = this.viewer.getPlugin(AutorotatePlugin) as AutorotatePlugin;

    // Set up event listeners
    this.setupEventListeners();

    // Update state
    this.state.currentPanorama = firstPanorama.id;
    this.state.isLoading = false;

    // Fire ready callback
    this.options.onReady?.();
  }

  /**
   * Initialize Photo Sphere Viewer plugins
   */
  private initPlugins(tour: Tour) {
    const plugins: Array<[typeof MarkersPlugin | typeof VirtualTourPlugin | typeof AutorotatePlugin, object]> = [];

    // Markers Plugin - for info hotspots
    plugins.push([
      MarkersPlugin,
      {
        markers: this.createInfoMarkers(tour.panoramas[0]),
      },
    ]);

    // Virtual Tour Plugin - for navigation between panoramas
    if (tour.panoramas.length > 1) {
      plugins.push([
        VirtualTourPlugin,
        {
          positionMode: 'manual',
          renderMode: '3d',
          transitionOptions: {
            showLoader: false,
            speed: '20rpm',
            fadeIn: true,
            rotation: true,
          },
          markerStyle: {
            element: this.createNavigationMarkerElement(),
            size: { width: 48, height: 48 },
          },
          dataMode: 'client',
          nodes: this.createVirtualTourNodes(tour),
        },
      ]);
    }

    // Autorotate Plugin - for auto-tour
    plugins.push([
      AutorotatePlugin,
      {
        autorotateSpeed: '0.5rpm',
        autorotatePitch: '0deg',
        autostartDelay: null, // Manual start only
        autostartOnIdle: false,
      },
    ]);

    return plugins;
  }

  /**
   * Create markers for info hotspots
   */
  private createInfoMarkers(panorama: Panorama) {
    return panorama.hotspots
      .filter((h): h is Extract<Hotspot, { type: 'info' }> => h.type === 'info')
      .map((hotspot) => ({
        id: hotspot.id,
        position: {
          yaw: `${hotspot.position.yaw}deg`,
          pitch: `${hotspot.position.pitch}deg`,
        },
        html: this.createInfoMarkerElement(hotspot),
        anchor: 'center center' as const,
        tooltip: hotspot.tooltip,
        data: { hotspot },
      }));
  }

  /**
   * Create HTML element for info hotspot marker
   */
  private createInfoMarkerElement(hotspot: Extract<Hotspot, { type: 'info' }>): string {
    return `<div class="hotspot hotspot-info" data-hotspot-id="${hotspot.id}"></div>`;
  }

  /**
   * Create HTML element for navigation hotspot marker
   */
  private createNavigationMarkerElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'hotspot hotspot-nav';
    return el;
  }

  /**
   * Create virtual tour nodes from panoramas
   */
  private createVirtualTourNodes(tour: Tour) {
    return tour.panoramas.map((panorama) => ({
      id: panorama.id,
      panorama: this.selectImageResolution(panorama),
      name: panorama.name,
      position: {
        yaw: panorama.initialView.yaw,
        pitch: panorama.initialView.pitch,
      },
      links: panorama.hotspots
        .filter((h): h is Extract<Hotspot, { type: 'navigation' }> => h.type === 'navigation')
        .map((hotspot) => ({
          nodeId: hotspot.targetPanorama,
          position: {
            yaw: `${hotspot.position.yaw}deg`,
            pitch: `${hotspot.position.pitch}deg`,
          },
        })),
    }));
  }

  /**
   * Select appropriate image resolution based on device
   */
  private selectImageResolution(panorama: Panorama): string {
    const isMobile = window.innerWidth <= 768 || 
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      return panorama.images.medium || panorama.images.high;
    }
    return panorama.images.high;
  }

  /**
   * Convert FOV to Photo Sphere Viewer zoom level (0-100)
   */
  private fovToZoomLevel(fov: number): number {
    const minFov = this.settings.minFov;
    const maxFov = this.settings.maxFov;
    return 100 - ((fov - minFov) / (maxFov - minFov)) * 100;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.viewer) return;

    // Handle marker clicks
    this.markersPlugin?.addEventListener('select-marker', (e) => {
      const hotspot = e.marker.data?.hotspot as Hotspot | undefined;
      if (hotspot && hotspot.type === 'info') {
        this.showInfoPopup(hotspot);
        this.options.onHotspotClick?.(hotspot);
      }
    });

    // Handle panorama changes (virtual tour)
    this.virtualTourPlugin?.addEventListener('node-changed', (e) => {
      this.state.currentPanorama = e.node.id;
      this.options.onPanoramaChange?.(e.node.id);
      
      // Update info markers for new panorama
      const panorama = this.tour?.panoramas.find((p) => p.id === e.node.id);
      if (panorama && this.markersPlugin) {
        this.markersPlugin.clearMarkers();
        this.createInfoMarkers(panorama).forEach((marker) => {
          this.markersPlugin?.addMarker(marker);
        });
      }
    });

    // Handle fullscreen changes
    this.viewer.addEventListener('fullscreen', (e) => {
      this.state.isFullscreen = e.fullscreenEnabled;
    });
  }

  /**
   * Show info popup for a hotspot
   */
  private showInfoPopup(hotspot: Extract<Hotspot, { type: 'info' }>): void {
    // Remove existing popup
    const existing = document.querySelector('.info-popup');
    if (existing) existing.remove();

    const content = hotspot.content;
    if (!content) return;

    const popup = document.createElement('div');
    popup.className = 'info-popup';
    
    let html = '';
    if (content.title) {
      html += `<h3>${content.title}</h3>`;
    }
    if (content.description) {
      html += `<p>${content.description}</p>`;
    }
    if (content.image) {
      html += `<img src="${content.image}" alt="${content.title || 'Info'}" loading="lazy" />`;
    }
    if (content.video) {
      html += `<video src="${content.video}" controls playsinline></video>`;
    }
    if (content.link) {
      html += `<a href="${content.link.url}" target="_blank" rel="noopener">
        ${content.link.label || 'Mehr erfahren'} →
      </a>`;
    }

    popup.innerHTML = html;
    
    // Position popup near the hotspot (simplified - center of screen)
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';

    document.getElementById('app')?.appendChild(popup);

    // Close popup on click outside
    const closePopup = (e: MouseEvent) => {
      if (!popup.contains(e.target as Node)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    };
    setTimeout(() => document.addEventListener('click', closePopup), 100);
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Navigate to a specific panorama
   */
  goToPanorama(panoramaId: string): void {
    this.virtualTourPlugin?.setCurrentNode(panoramaId);
  }

  /**
   * Set the current view position
   */
  setView(yaw: number, pitch: number, fov?: number): void {
    this.viewer?.rotate({ yaw: `${yaw}deg`, pitch: `${pitch}deg` });
    if (fov) {
      this.viewer?.zoom(this.fovToZoomLevel(fov));
    }
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    const currentZoom = this.viewer?.getZoomLevel() ?? 50;
    this.viewer?.zoom(Math.min(100, currentZoom + 10));
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    const currentZoom = this.viewer?.getZoomLevel() ?? 50;
    this.viewer?.zoom(Math.max(0, currentZoom - 10));
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(): void {
    this.viewer?.toggleFullscreen();
  }

  /**
   * Start auto-tour
   */
  startAutoTour(): void {
    this.autorotatePlugin?.start();
    this.state.isAutoTourActive = true;
  }

  /**
   * Stop auto-tour
   */
  stopAutoTour(): void {
    this.autorotatePlugin?.stop();
    this.state.isAutoTourActive = false;
  }

  /**
   * Get current viewer state
   */
  getState(): ViewerState {
    return { ...this.state };
  }

  /**
   * Get the internal Photo Sphere Viewer instance
   */
  getViewer(): Viewer | null {
    return this.viewer;
  }

  /**
   * Get the markers plugin instance
   */
  getMarkersPlugin(): MarkersPlugin | null {
    return this.markersPlugin;
  }

  /**
   * Get the current tour configuration
   */
  getTour(): Tour | null {
    return this.tour;
  }

  /**
   * Get the current panorama
   */
  getCurrentPanorama(): Panorama | undefined {
    if (!this.tour || !this.state.currentPanorama) return undefined;
    return this.tour.panoramas.find((p) => p.id === this.state.currentPanorama);
  }

  /**
   * Destroy the viewer
   */
  destroy(): void {
    this.viewer?.destroy();
    this.viewer = null;
    this.markersPlugin = null;
    this.virtualTourPlugin = null;
    this.autorotatePlugin = null;
  }
}
