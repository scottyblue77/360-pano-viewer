/**
 * EmbedGenerator - Generates embed code and fullscreen links for tours
 */

export interface EmbedOptions {
  tourId: string;
  baseUrl?: string;
  width?: string;
  height?: string;
  autoplay?: boolean;
  showControls?: boolean;
}

export class EmbedGenerator {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || window.location.origin;
  }

  /**
   * Generate iframe embed code
   */
  generateIframe(options: EmbedOptions): string {
    const url = this.generateViewerUrl(options);
    const width = options.width || '100%';
    const height = options.height || '500';

    return `<iframe
  src="${url}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allowfullscreen
  allow="accelerometer; autoplay; gyroscope"
  style="border: none; border-radius: 8px;"
></iframe>`;
  }

  /**
   * Generate direct viewer URL
   */
  generateViewerUrl(options: EmbedOptions): string {
    const params = new URLSearchParams();
    
    if (options.tourId) {
      params.set('tour', options.tourId);
    }
    if (options.autoplay) {
      params.set('autoplay', '1');
    }
    if (options.showControls === false) {
      params.set('controls', '0');
    }

    const queryString = params.toString();
    return `${this.baseUrl}/embed${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Generate fullscreen link
   */
  generateFullscreenUrl(tourId: string): string {
    return `${this.baseUrl}/?tour=${tourId}&fullscreen=1`;
  }

  /**
   * Generate share link
   */
  generateShareUrl(tourId: string): string {
    return `${this.baseUrl}/?tour=${tourId}`;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  }
}

/**
 * Create and show embed modal
 */
export function showEmbedModal(tourId: string, tourName?: string): void {
  const generator = new EmbedGenerator();

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'embed-modal-overlay';
  modal.innerHTML = `
    <div class="embed-modal">
      <div class="embed-modal-header">
        <h2>Tour teilen</h2>
        <button class="embed-modal-close" id="closeEmbedModal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="embed-modal-content">
        <p class="embed-tour-name">${tourName || tourId}</p>
        
        <div class="embed-section">
          <h3>Embed-Code</h3>
          <div class="embed-code-box">
            <pre id="embedCode">${escapeHtml(generator.generateIframe({ tourId }))}</pre>
          </div>
          <button class="embed-copy-btn" id="copyEmbed">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Code kopieren
          </button>
        </div>

        <div class="embed-section">
          <h3>Direkter Link</h3>
          <div class="embed-link-box">
            <input type="text" readonly id="shareLink" value="${generator.generateShareUrl(tourId)}" />
            <button class="embed-link-copy" id="copyLink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="embed-section">
          <h3>Vollbild-Link</h3>
          <div class="embed-link-box">
            <input type="text" readonly id="fullscreenLink" value="${generator.generateFullscreenUrl(tourId)}" />
            <button class="embed-link-copy" id="copyFullscreen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="embed-options">
          <h3>Optionen</h3>
          <label class="embed-checkbox">
            <input type="checkbox" id="optAutoplay" />
            <span>Autoplay aktivieren</span>
          </label>
          <label class="embed-checkbox">
            <input type="checkbox" id="optHideControls" />
            <span>Controls ausblenden</span>
          </label>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  const closeModal = () => modal.remove();

  modal.querySelector('#closeEmbedModal')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Copy buttons
  modal.querySelector('#copyEmbed')?.addEventListener('click', async () => {
    const code = modal.querySelector('#embedCode')?.textContent || '';
    const success = await generator.copyToClipboard(code);
    showCopyFeedback(modal.querySelector('#copyEmbed') as HTMLElement, success);
  });

  modal.querySelector('#copyLink')?.addEventListener('click', async () => {
    const link = (modal.querySelector('#shareLink') as HTMLInputElement)?.value || '';
    const success = await generator.copyToClipboard(link);
    showCopyFeedback(modal.querySelector('#copyLink') as HTMLElement, success);
  });

  modal.querySelector('#copyFullscreen')?.addEventListener('click', async () => {
    const link = (modal.querySelector('#fullscreenLink') as HTMLInputElement)?.value || '';
    const success = await generator.copyToClipboard(link);
    showCopyFeedback(modal.querySelector('#copyFullscreen') as HTMLElement, success);
  });

  // Options update
  const updateEmbed = () => {
    const autoplay = (modal.querySelector('#optAutoplay') as HTMLInputElement)?.checked;
    const hideControls = (modal.querySelector('#optHideControls') as HTMLInputElement)?.checked;

    const embedCode = modal.querySelector('#embedCode');
    if (embedCode) {
      embedCode.textContent = generator.generateIframe({
        tourId,
        autoplay,
        showControls: !hideControls,
      });
    }
  };

  modal.querySelector('#optAutoplay')?.addEventListener('change', updateEmbed);
  modal.querySelector('#optHideControls')?.addEventListener('change', updateEmbed);

  // Escape key
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showCopyFeedback(button: HTMLElement, success: boolean): void {
  const originalHtml = button.innerHTML;
  button.innerHTML = success 
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Kopiert!'
    : 'Fehler';
  button.classList.add('copied');
  
  setTimeout(() => {
    button.innerHTML = originalHtml;
    button.classList.remove('copied');
  }, 2000);
}
