# 360° Panorama Viewer

Ein webbasierter 360°-Panorama-Viewer für Agenturen, der interaktive virtuelle Touren mit Hotspots ermöglicht.

## Features

- 🌐 **360° Panorama-Darstellung** - Equirectangular-Projektion mit WebGL
- 🖱️ **Intuitive Navigation** - Maus, Touch, Keyboard (WASD/Pfeiltasten)
- 🔍 **Zoom** - Scroll-Rad, Pinch-Geste, Buttons
- 📍 **Info-Hotspots** - Text, Bilder, Videos, Links
- 🔗 **Navigations-Hotspots** - Zwischen Panoramen wechseln
- 📱 **Responsive** - Optimiert für Desktop und Mobile
- 🎬 **Fade-Übergänge** - Smooth Transitions zwischen Panoramen
- 📺 **Fullscreen-Modus** - Immersive Darstellung

## Tech Stack

- **Frontend**: TypeScript + Vite
- **Viewer**: Photo Sphere Viewer (Three.js-basiert)
- **Plugins**: Markers, Virtual Tour, Autorotate
- **Styling**: CSS mit Custom Properties (Glassmorphism)

## Installation

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Für Produktion bauen
npm run build
```

## Verwendung

### Als Standalone-Viewer

Öffne `http://localhost:3000` nach `npm run dev`.

### Als React-Komponente (später)

```tsx
import { TourViewer } from '360-pano-viewer';

<TourViewer
  tour={tourConfig}
  onHotspotClick={(hotspot) => console.log(hotspot)}
/>
```

### Embed-Code

```html
<iframe 
  src="https://your-domain.com/tour/TOUR_ID" 
  width="100%" 
  height="500" 
  frameborder="0" 
  allowfullscreen
></iframe>
```

## Tour-Konfiguration

```typescript
const tour = {
  id: 'my-tour',
  name: 'Meine Tour',
  panoramas: [
    {
      id: 'pano-1',
      name: 'Eingang',
      images: {
        high: '/images/pano-1-4k.webp',
        medium: '/images/pano-1-2k.webp',
        low: '/images/pano-1-preview.webp',
      },
      initialView: { yaw: 0, pitch: 0, fov: 70 },
      hotspots: [
        {
          id: 'info-1',
          type: 'info',
          position: { yaw: 45, pitch: 0 },
          content: {
            title: 'Willkommen',
            description: 'Beschreibung hier...',
          },
        },
        {
          id: 'nav-1',
          type: 'navigation',
          position: { yaw: 180, pitch: -10 },
          targetPanorama: 'pano-2',
        },
      ],
    },
  ],
  settings: {
    autoTour: false,
    keyboardNavigation: true,
    allowFullscreen: true,
  },
};
```

## Keyboard-Shortcuts

| Taste | Aktion |
|-------|--------|
| ← → ↑ ↓ | Panorama drehen |
| W A S D | Panorama drehen (alternativ) |
| + / - | Zoom |
| F | Fullscreen |

## Lizenz

MIT
