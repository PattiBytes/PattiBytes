// PWA Install Handler
class PWAInstallHandler {
  constructor() {
    this.installPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    console.log('PWA Install Handler initialized');
    
    // Check if already installed
    this.checkInstallStatus();
    
    // Listen for install prompt
    this.setupInstallPrompt();
    
    // Setup install UI
    this.setupInstallUI();
    
    // Track installation
    this.trackInstallation();
  }

  checkInstallStatus() {
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      this.isInstalled = true;
      document.body.classList.add('pwa-installed');
      console.log('App is running as PWA');
    }
    
    // Check if install prompt was previously dismissed
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) { // Don't show for a week after dismissal
        console.log('Install prompt recently dismissed');
        return;
      }
    }
  }

  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('beforeinstallprompt event fired');
      
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      this.installPrompt = e;
      
      // Show custom install UI
      this.showInstallBanner();
      
      // Log that install prompt is available
      this.logInstallPromptAvailable();
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', (e) => {
      console.log('PWA was installed successfully');
      this.onAppInstalled();
    });
  }

  setupInstallUI() {
    // Create install banner if it doesn't exist
    if (!document.querySelector('.pwa-install-banner')) {
      this.createInstallBanner();
    }
    
    // Add install button to header if needed
    this.addInstallButtonToHeader();
  }

  createInstallBanner() {
    const banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="install-banner-content">
        <div class="install-info">
          <div class="install-icon">📱</div>
          <div class="install-text">
            <div class="install-title">ਐਪ ਇੰਸਟਾਲ ਕਰੋ</div>
            <div class="install-subtitle">ਤੇਜ਼ ਅਤੇ ਆਸਾਨ ਪਹੁੰਚ ਲਈ</div>
          </div>
        </div>
        <div class="install-actions">
          <button class="install-btn" onclick="pwaInstaller.triggerInstall()">
            ਇੰਸਟਾਲ
          </button>
          <button class="dismiss-btn" onclick="pwaInstaller.dismissBanner()">
            ✕
          </button>
        </div>
      </div>
    `;
    
    // Add CSS for banner
    this.addInstallBannerStyles();
    
    // Don't show banner initially
    banner.style.display = 'none';
    document.body.appendChild(banner);
  }

  addInstallBannerStyles() {
    if (document.querySelector('#install-banner-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'install-banner-styles';
    styles.textContent = `
      .pwa-install-banner {
        position: fixed;
        top: var(--nav-height);
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        z-index: 1500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        transform: translateY(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .pwa-install-banner.show {
        transform: translateY(0);
      }
      
      .install-banner-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .install-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      
      .install-icon {
        font-size: 24px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
      
      .install-title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 2px;
      }
      
      .install-subtitle {
        font-size: 12px;
        opacity: 0.9;
      }
      
      .install-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .install-btn {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        backdrop-filter: blur(10px);
      }
      
      .install-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.05);
      }
      
      .dismiss-btn {
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .dismiss-btn:hover {
        opacity: 1;
      }
      
      @media (max-width: 480px) {
        .install-banner-content {
          padding: 8px 12px;
        }
        
        .install-info {
          gap: 8px;
        }
        
        .install-title {
          font-size: 13px;
        }
        
        .install-subtitle {
          font-size: 11px;
        }
      }
      
      /* Adjust main content when banner is shown */
      body.install-banner-shown {
        padding-top: calc(var(--nav-height) + 48px);
      }
      
      body.install-banner-shown .app-header {
        box-shadow: none;
      }
      
      @media (max-width: 480px) {
        body.install-banner-shown {
          padding-top: calc(var(--nav-height) + 40px);
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  showInstallBanner() {
    if (this.isInstalled) return;
    
    const banner = document.querySelector('.pwa-install-banner');
    if (banner) {
      banner.style.display = 'block';
      document.body.classList.add('install-banner-shown');
      
      // Show with animation
      setTimeout(() => {
        banner.classList.add('show');
      }, 100);
      
      console.log('Install banner shown');
    }
  }

  hideBanner() {
    const banner = document.querySelector('.pwa-install-banner');
    if (banner) {
      banner.classList.remove('show');
      document.body.classList.remove('install-banner-shown');
      
      setTimeout(() => {
        banner.style.display = 'none';
      }, 300);
    }
  }

  async triggerInstall() {
    if (!this.installPrompt) {
      console.log('Install prompt not available');
      this.showManualInstallInstructions();
      return;
    }
    
    try {
      // Hide the banner
      this.hideBanner();
      
      // Show the install prompt
      this.installPrompt.prompt();
      
      // Wait for user response
      const result = await this.installPrompt.userChoice;
      
      console.log('Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        this.trackInstallAccepted();
      } else {
        console.log('User dismissed the install prompt');
        this.trackInstallDismissed();
      }
      
      // Clear the prompt
      this.installPrompt = null;
      
    } catch (error) {
      console.error('Error during install:', error);
      this.showManualInstallInstructions();
    }
  }

  dismissBanner() {
    this.hideBanner();
    
    // Remember dismissal
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    
    // Track dismissal
    this.trackBannerDismissed();
    
    console.log('Install banner dismissed by user');
  }

  showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = 'Safari ਮੈਨੂ ਖੋਲੋ ਅਤੇ "Add to Home Screen" ਚੁਣੋ';
    } else if (isAndroid) {
      instructions = 'Chrome ਮੈਨੂ ਖੋਲੋ ਅਤੇ "Add to Home Screen" ਚੁਣੋ';
    } else {
      instructions = 'ਬ੍ਰਾਊਜ਼ਰ ਮੈਨੂ ਤੋਂ "Install App" ਜਾਂ "Add to Home Screen" ਚੁਣੋ';
    }
    
    // Show notification with instructions
    if (window.appNavigation) {
      window.appNavigation.showNotification(instructions, 'info');
    } else {
      alert(instructions);
    }
  }

  onAppInstalled() {
    this.isInstalled = true;
    document.body.classList.add('pwa-installed');
    
    // Hide banner
    this.hideBanner();
    
    // Clear stored dismissal
    localStorage.removeItem('pwa-install-dismissed');
    
    // Track successful installation
    this.trackInstallCompleted();
    
    // Show success message
    if (window.appNavigation) {
      window.appNavigation.showNotification('ਐਪ ਸਫਲਤਾ ਨਾਲ ਇੰਸਟਾਲ ਹੋ ਗਈ!', 'success');
    }
  }

  trackInstallation() {
    // Listen for installation events and track them
    window.addEventListener('appinstalled', () => {
      this.logEvent('pwa_installed');
    });
  }

  // Analytics tracking methods
  logInstallPromptAvailable() {
    this.logEvent('pwa_install_prompt_shown');
  }

  trackInstallAccepted() {
    this.logEvent('pwa_install_accepted');
  }

  trackInstallDismissed() {
    this.logEvent('pwa_install_dismissed');
  }

  trackBannerDismissed() {
    this.logEvent('pwa_banner_dismissed');
  }

  trackInstallCompleted() {
    this.logEvent('pwa_install_completed');
  }

  logEvent(eventName, data = {}) {
    // Log to console for debugging
    console.log('PWA Event:', eventName, data);
    
    // Add your analytics tracking here
    // Example: gtag('event', eventName, data);
    // Example: analytics.track(eventName, data);
    
    // Store in localStorage for later analysis
    const events = JSON.parse(localStorage.getItem('pwa_events') || '[]');
    events.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      data: data
    });
    localStorage.setItem('pwa_events', JSON.stringify(events));
  }

  // Method to check PWA requirements
  checkPWARequirements() {
    const requirements = {
      manifest: !!document.querySelector('link[rel="manifest"]'),
      serviceWorker: 'serviceWorker' in navigator,
      https: location.protocol === 'https:' || location.hostname === 'localhost',
      standalone: window.matchMedia('(display-mode: standalone)').matches
    };
    
    console.log('PWA Requirements Check:', requirements);
    return requirements;
  }

  // Debug method
  debug() {
    console.log('PWA Install Handler Debug Info:', {
      installPrompt: !!this.installPrompt,
      isInstalled: this.isInstalled,
      requirements: this.checkPWARequirements(),
      events: JSON.parse(localStorage.getItem('pwa_events') || '[]')
    });
  }
}

// Initialize PWA installer
document.addEventListener('DOMContentLoaded', () => {
  window.pwaInstaller = new PWAInstallHandler();
});

// Expose debug function globally
window.debugPWA = () => {
  if (window.pwaInstaller) {
    window.pwaInstaller.debug();
  }
};
