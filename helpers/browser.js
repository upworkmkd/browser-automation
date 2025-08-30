import { chromium } from 'playwright';

export class BrowserHelper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async init() {
    try {
      console.log('🌐 Initializing browser...');
      
      this.browser = await chromium.launch({
        headless: false,
        slowMo: 100
      });
      
      // Try to load existing session
      try {
        this.context = await this.browser.newContext({
          storageState: './auth.json'
        });
        console.log('✅ Loaded existing session');
      } catch (error) {
        this.context = await this.browser.newContext();
        console.log('🆕 Created new session');
      }
      
      this.page = await this.context.newPage();
      console.log('✅ Browser initialized successfully');
      
    } catch (error) {
      console.error('❌ Browser initialization failed:', error.message);
      throw error;
    }
  }

  async goto(url) {
    try {
      await this.page.goto(url, { waitUntil: 'commit' });
      
      // Wait for either domcontentloaded or networkidle
      await Promise.race([
        this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }),
        this.page.waitForLoadState('networkidle', { timeout: 15000 })
      ]).catch(() => {
        console.log('⚠️  Page load timeout, continuing...');
      });
      
    } catch (error) {
      console.error(`❌ Navigation to ${url} failed:`, error.message);
      throw error;
    }
  }

  async waitForNavigation() {
    try {
      await Promise.race([
        this.page.waitForLoadState('networkidle', { timeout: 15000 }),
        this.page.waitForLoadState('domcontentloaded', { timeout: 10000 })
      ]).catch(() => {
        console.log('⚠️  Navigation timeout, continuing...');
      });
    } catch (error) {
      console.error('❌ Navigation wait failed:', error.message);
    }
  }

  async saveAuthState() {
    try {
      await this.context.storageState({ path: './auth.json' });
      console.log('💾 Session state saved');
    } catch (error) {
      console.error('❌ Failed to save session state:', error.message);
    }
  }

  async close() {
    try {
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      console.log('🔒 Browser closed');
    } catch (error) {
      console.error('❌ Error closing browser:', error.message);
    }
  }

  async getElementContext(element) {
    const contextData = {
      innerText: await element.innerText(),
      ariaLabel: await element.getAttribute('aria-label'),
      placeholder: await element.getAttribute('placeholder'),
      type: await element.getAttribute('type'),
      role: await element.getAttribute('role'),
      name: await element.getAttribute('name'),
      id: await element.getAttribute('id'),
      className: await element.getAttribute('class'),
      dataPlaceholder: await element.getAttribute('data-placeholder'),
      ariaPlaceholder: await element.getAttribute('aria-placeholder'),
      nearbyText: []
    };

    // Get text from nearby elements
    const nearby = await element.evaluate(el => {
      const range = 2; // Look at elements within 2 levels up and siblings
      const texts = [];
      let current = el;
      
      // Look up the tree
      for (let i = 0; i < range; i++) {
        current = current.parentElement;
        if (!current) break;
        for (const child of current.childNodes) {
          if (child.nodeType === 3 && child.textContent.trim()) { // Text node
            texts.push(child.textContent.trim());
          }
        }
      }
      
      return texts;
    });

    contextData.nearbyText = nearby;
    return contextData;
  }
}
