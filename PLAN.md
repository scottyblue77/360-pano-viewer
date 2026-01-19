# 360° Panorama Viewer - Projektplan

## Übersicht

Ein webbasierter 360°-Panorama-Viewer für Agenturen, der DNG-Dateien von Insta360-Kameras in web-optimierte Formate konvertiert und in einem interaktiven Viewer mit Hotspots darstellt.

**Referenz:** Matterport-ähnliche Experience (V2: 3D-Navigation)

---

## Technische Entscheidungen

| Aspekt | Lösung |
|--------|--------|
| Deployment | Vercel |
| Storage | Vercel Blob |
| Frontend | **Photo Sphere Viewer** (Three.js-basiert) + TypeScript |
| Backend | Vercel Serverless Functions |
| Bildformat | WebP (primary), JPEG (fallback) |
| Build Tool | Vite |

### Warum Photo Sphere Viewer?

Photo Sphere Viewer ist eine bewährte Open-Source-Library für 360°-Panoramen:

- **Built-in Features**: Touch, Keyboard, Zoom, Gyroscope, Fullscreen
- **Plugins verfügbar**: Markers, Virtual Tour, Autorotate, Video
- **Three.js-basiert**: Flexibel erweiterbar bei Bedarf
- **TypeScript Support**: Vollständige Typisierung
- **Responsive**: Automatische Anpassung an Container-Größe
- **Battle-tested**: Aktiv gepflegt, große Community

**Dokumentation**: https://photo-sphere-viewer.js.org/

---

## Zielgruppe & Use Cases

- **Primär:** Agenturen (B2B)
- **Sekundär:** Deren Kunden (Endnutzer sehen nur Viewer)
- **Use Case:** Immobilien-Präsentationen, Gebäude-Dokumentation, virtuelle Touren

### Output-Formate
1. **Embed-Code** - `<iframe>` zum Einbetten in Kunden-Websites
2. **Fullscreen-Link** - Direkter Link zur vollständigen Ansicht

---

## Features Version 1

### Viewer
- [x] 360° Sphere-Rendering (equirectangular Projektion)
- [x] Drag-Navigation (Maus)
- [x] Touch-Navigation (Mobile)
- [x] Keyboard-Navigation (WASD / Pfeiltasten)
- [x] Zoom (Scroll / Pinch)
- [x] Responsive Design (Mobile-first)
- [x] Fullscreen-Modus

### Hotspots
- [x] **Navigations-Hotspots** - Schwebend, wechselt zu anderem Panorama
- [x] **Info-Hotspots** - Popup mit:
  - Text (Titel + Beschreibung)
  - Bild
  - Video (embedded)
  - Link (extern)

### Übergänge
- [x] Fade-Überblendung zwischen Panoramen
- [x] Smooth Animationen

### Auto-Features
- [x] Auto-Tour (optional) - Automatisch durch alle Panoramen
- [ ] Auto-Rotation (später)

### Branding
- [x] Logo-Austausch möglich
- [ ] Custom Colors (später)

### Editor
- [x] Visueller Hotspot-Editor
  - Klicken im Panorama zum Platzieren
  - Drag zum Verschieben
  - Popup zum Bearbeiten der Inhalte

### Backend
- [x] DNG-Upload Endpoint
- [x] Konvertierung: DNG → WebP/JPEG (mehrere Auflösungen)
- [x] Vercel Blob Storage Integration
- [x] Tour-Konfiguration speichern/laden

---

## Features Version 2 (Später)

- [ ] 3D-Flug-Navigation (Matterport-Style Click-to-Move)
- [ ] Nutzer-Authentifizierung (Agentur-Accounts)
- [ ] Dashboard für Tour-Verwaltung
- [ ] Erweitertes Branding (Farben, Themes)
- [ ] Analytics (Views, Klicks, Heatmaps)

---

## Projektstruktur

```
360-pano-viewer/
├── PLAN.md                    # Dieser Plan
├── README.md                  # Dokumentation
├── package.json
├── tsconfig.json
├── vite.config.ts             # Vite Konfiguration
├── vercel.json                # Vercel Deployment Config
│
├── index.html                 # Entry HTML (Vite)
│
├── src/
│   ├── main.ts                # Entry Point
│   │
│   ├── viewer/
│   │   ├── TourViewer.ts      # Photo Sphere Viewer Wrapper
│   │   ├── config.ts          # Viewer-Konfiguration
│   │   └── plugins.ts         # Plugin-Setup (Markers, VirtualTour)
│   │
│   ├── editor/
│   │   ├── HotspotEditor.ts   # Visueller Hotspot-Editor
│   │   ├── EditorPanel.ts     # Seitenpanel für Bearbeitung
│   │   └── EditorToolbar.ts   # Toolbar mit Tools
│   │
│   ├── types/
│   │   └── index.ts           # TypeScript Interfaces (Tour, Hotspot, etc.)
│   │
│   ├── utils/
│   │   └── responsive.ts      # Device Detection, Resolution Picking
│   │
│   └── styles/
│       ├── main.css           # Globale Styles + CSS Variables
│       ├── viewer.css         # Viewer-spezifische Styles
│       └── editor.css         # Editor-Styles
│
├── api/                       # Vercel Serverless Functions
│   ├── upload.ts              # DNG Upload & Konvertierung
│   ├── tours/
│   │   ├── [id].ts            # GET/PUT/DELETE einzelne Tour
│   │   └── index.ts           # GET alle Tours, POST neue Tour
│   └── embed/
│       └── [id].ts            # Embed-Code/iFrame generieren
│
├── public/
│   ├── sample-panoramas/      # Demo-Bilder (bereits konvertiert)
│   └── icons/                 # Custom Hotspot-Icons
│
└── tours/
    └── demo-tour.json         # Beispiel-Tour Konfiguration
```

---

## Datenmodell

### Tour
```typescript
interface Tour {
  id: string;
  name: string;
  logo?: string;              // Custom Logo URL
  panoramas: Panorama[];
  settings: TourSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

### Panorama
```typescript
interface Panorama {
  id: string;
  name: string;
  images: {
    high: string;             // 4K WebP
    medium: string;           // 2K WebP
    low: string;              // Preview
  };
  initialView: {
    yaw: number;              // Horizontal Blickrichtung
    pitch: number;            // Vertikal
    fov: number;              // Field of View (Zoom)
  };
  hotspots: Hotspot[];
}
```

### Hotspot
```typescript
interface Hotspot {
  id: string;
  type: 'navigation' | 'info';
  position: {
    yaw: number;
    pitch: number;
  };
  // Für Navigation
  targetPanorama?: string;
  // Für Info
  content?: {
    title?: string;
    description?: string;
    image?: string;
    video?: string;
    link?: string;
  };
}
```

### TourSettings
```typescript
interface TourSettings {
  autoTour: boolean;
  autoTourDelay: number;      // Sekunden pro Panorama
  showControls: boolean;
  allowFullscreen: boolean;
}
```

---

## Konvertierungs-Pipeline

```
Insta360 DNG (50-100MB)
        │
        ▼
   [Upload API]
        │
        ▼
   dcraw (RAW decode)
        │
        ▼
   Sharp (resize & optimize)
        │
        ├──► 4096x2048 WebP (High)    ~2-4MB
        ├──► 2048x1024 WebP (Medium)  ~500KB
        └──► 512x256 WebP (Preview)   ~20KB
        │
        ▼
   [Vercel Blob Storage]
```

---

## UI/UX Design-Richtung

- **Ästhetik:** Dunkel, immersiv, minimalistisch
- **Controls:** Glassmorphism, transluzent
- **Hotspots:** Pulsierender Kreis, dezent animiert
- **Info-Popups:** Slide-In von der Seite, Backdrop-Blur
- **Übergänge:** Smooth, 400-600ms Fade
- **Mobile:** Bottom-Controls, große Touch-Targets

---

## Implementierungs-Reihenfolge

### Phase 1: Projekt-Setup & Basic Viewer
1. Vite + TypeScript Projekt initialisieren
2. Photo Sphere Viewer integrieren
3. Demo mit Sample-Panorama (statisches Bild)
4. Keyboard-Navigation aktivieren (WASD/Pfeiltasten)
5. Responsive Container + Fullscreen

### Phase 2: Hotspots & Virtual Tour
6. Markers-Plugin: Info-Hotspots mit Popup
7. Virtual-Tour-Plugin: Navigation zwischen Panoramen
8. Fade-Übergänge konfigurieren
9. Custom Hotspot-Styles (Puls-Animation)

### Phase 3: Visueller Editor
10. Editor-Modus Toggle (View ↔ Edit)
11. Klick-zum-Platzieren von Hotspots
12. Hotspot-Bearbeitung Panel (Text, Bild, Video, Link)
13. Drag-to-Move für existierende Hotspots
14. Tour-Konfiguration exportieren (JSON)

### Phase 4: Backend & Storage
15. Vercel Serverless Setup
16. DNG → WebP Konvertierung (Sharp + dcraw)
17. Multi-Resolution Output (4K, 2K, Preview)
18. Vercel Blob Storage Integration
19. Tour API: CRUD Endpoints

### Phase 5: Polish & Deployment
20. Auto-Tour Feature (Autorotate-Plugin)
21. Embed-Code Generator (iFrame)
22. Logo-Branding (austauschbar)
23. Mobile-Optimierung (Touch-Targets, Bottom-Controls)
24. Performance: Lazy-Loading, Progressive Enhancement

---

## Abhängigkeiten

### Frontend
```json
{
  "@photo-sphere-viewer/core": "^5.x",
  "@photo-sphere-viewer/markers-plugin": "^5.x",
  "@photo-sphere-viewer/virtual-tour-plugin": "^5.x",
  "@photo-sphere-viewer/autorotate-plugin": "^5.x",
  "three": "^0.160.x",
  "typescript": "^5.x",
  "vite": "^5.x"
}
```

### Backend (Vercel Functions)
```json
{
  "sharp": "^0.33.x",
  "dcraw-vendored": "^1.x",
  "@vercel/blob": "^0.x"
}
```

---

## Photo Sphere Viewer Plugins

| Plugin | Zweck |
|--------|-------|
| **@photo-sphere-viewer/markers-plugin** | Info-Hotspots mit Custom HTML/Icons |
| **@photo-sphere-viewer/virtual-tour-plugin** | Navigation zwischen Panoramen mit Links |
| **@photo-sphere-viewer/autorotate-plugin** | Auto-Tour Rotation |
| **@photo-sphere-viewer/gallery-plugin** | Optional: Thumbnail-Navigation |

---

## Notizen

- Insta360 DNG-Dateien sind bereits equirectangular (keine Stitching nötig)
- WebP wird von allen modernen Browsern unterstützt
- Photo Sphere Viewer handhabt Responsive automatisch
- CSS `backdrop-filter` für Glassmorphism (Safari Fallback beachten)
- Mobile: Touch-Gesten werden von PSV nativ unterstützt
- Keyboard-Navigation (WASD/Pfeile) über PSV keyboard option aktivierbar
