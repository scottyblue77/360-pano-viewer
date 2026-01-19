/**
 * 360° Panorama Viewer - Type Definitions
 */

// ==========================================
// Tour & Panorama Types
// ==========================================

export interface Tour {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  panoramas: Panorama[];
  settings: TourSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Panorama {
  id: string;
  name: string;
  description?: string;
  images: PanoramaImages;
  initialView: ViewPosition;
  hotspots: Hotspot[];
}

export interface PanoramaImages {
  /** 4K resolution (4096x2048) for desktop */
  high: string;
  /** 2K resolution (2048x1024) for mobile */
  medium: string;
  /** Preview/Thumbnail (512x256) for fast loading */
  low: string;
}

export interface ViewPosition {
  /** Horizontal angle in degrees (-180 to 180) */
  yaw: number;
  /** Vertical angle in degrees (-90 to 90) */
  pitch: number;
  /** Field of view in degrees (30 to 90) */
  fov: number;
}

// ==========================================
// Hotspot Types
// ==========================================

export type HotspotType = 'navigation' | 'info';

export interface BaseHotspot {
  id: string;
  type: HotspotType;
  position: {
    yaw: number;
    pitch: number;
  };
  tooltip?: string;
}

export interface NavigationHotspot extends BaseHotspot {
  type: 'navigation';
  /** Target panorama ID */
  targetPanorama: string;
  /** Optional rotation direction for arrow icon */
  rotation?: number;
}

export interface InfoHotspot extends BaseHotspot {
  type: 'info';
  content: InfoContent;
}

export interface InfoContent {
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  link?: {
    url: string;
    label?: string;
  };
}

export type Hotspot = NavigationHotspot | InfoHotspot;

// ==========================================
// Settings Types
// ==========================================

export interface TourSettings {
  /** Enable auto-tour mode */
  autoTour: boolean;
  /** Delay in seconds between panoramas in auto-tour */
  autoTourDelay: number;
  /** Show control buttons */
  showControls: boolean;
  /** Allow fullscreen mode */
  allowFullscreen: boolean;
  /** Enable keyboard navigation (WASD/Arrows) */
  keyboardNavigation: boolean;
  /** Default field of view */
  defaultFov: number;
  /** Minimum field of view (max zoom in) */
  minFov: number;
  /** Maximum field of view (max zoom out) */
  maxFov: number;
}

// ==========================================
// Viewer State Types
// ==========================================

export interface ViewerState {
  currentPanorama: string | null;
  isLoading: boolean;
  isFullscreen: boolean;
  isAutoTourActive: boolean;
  editorMode: boolean;
}

// ==========================================
// Event Types
// ==========================================

export interface HotspotClickEvent {
  hotspot: Hotspot;
  panorama: Panorama;
}

export interface PanoramaChangeEvent {
  from: string | null;
  to: string;
  panorama: Panorama;
}

// ==========================================
// Default Values
// ==========================================

export const DEFAULT_TOUR_SETTINGS: TourSettings = {
  autoTour: false,
  autoTourDelay: 5,
  showControls: true,
  allowFullscreen: true,
  keyboardNavigation: true,
  defaultFov: 70,
  minFov: 30,
  maxFov: 90,
};

export const DEFAULT_VIEW_POSITION: ViewPosition = {
  yaw: 0,
  pitch: 0,
  fov: 70,
};
