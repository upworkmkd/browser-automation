import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

export class BrowserHelper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS === 'true',
      slowMo: parseInt(process.env.SLOWMO || '50')
    });

    // Try to load stored session state
    try {
      this.context = await this.browser.newContext({
        storageState: './auth.json'
      });
      console.log('Loaded stored authentication state');
    } catch (error) {
      console.log('No stored auth state found, creating new context');
      this.context = await this.browser.newContext();
    }
    
    this.page = await this.context.newPage();
  }

  async saveAuthState() {
    if (this.context) {
      await this.context.storageState({ path: './auth.json' });
      console.log('Saved authentication state');
    }
  }

  async goto(url) {
    try {
      // Use { waitUntil: 'commit' } for faster initial load
      await this.page.goto(url, { 
        waitUntil: 'commit',
        timeout: 30000 
      });
      
      // Then wait for the page to be more fully loaded
      await Promise.race([
        this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }),
        this.page.waitForLoadState('networkidle', { timeout: 10000 })
      ]).catch(() => {
        console.log('Page load wait timed out, continuing anyway...');
      });
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log('Initial page load timed out, checking if page is usable...');
        // Check if we can still interact with the page
        const pageContent = await this.page.content().catch(() => '');
        if (!pageContent) {
          throw new Error('Page load failed completely');
        }
      } else {
        throw error;
      }
    }
  }

  async close() {
    await this.context?.close();
    await this.browser?.close();
  }

  async waitForNavigation() {
    try {
      // Wait for either networkidle or domcontentloaded, whichever comes first
      await Promise.race([
        this.page.waitForLoadState('networkidle', { timeout: 10000 }),
        this.page.waitForLoadState('domcontentloaded', { timeout: 10000 })
      ]);
    } catch (error) {
      console.log('Navigation wait timed out, continuing anyway...');
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

export const browserHelper = new BrowserHelper();
