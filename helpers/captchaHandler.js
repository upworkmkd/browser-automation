import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class CaptchaHandler {
  constructor(browserHelper) {
    this.browser = browserHelper;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Main method to handle any CAPTCHA that appears on the page with retry logic
   * @returns {Promise<boolean>} - true if CAPTCHA was solved, false if not found
   */
  async handleCaptcha() {
    const maxAttempts = 5;
    const retryInterval = 25000; // 25 seconds
    const totalTimeout = 2 * 60 * 1000; // 2 minutes
    
    console.log('🔍 Checking for CAPTCHAs on the page...');
    
    // Wait a bit for CAPTCHA to load if it exists
    await this.browser.page.waitForTimeout(2000);
    
    // Check for different types of CAPTCHAs
    const captchaType = await this.detectCaptchaType();
    console.log(`🔍 CAPTCHA detection result: ${captchaType || 'none'}`); 
    
    // If no CAPTCHA found but debug mode is enabled, show what elements are present
    if (!captchaType && process.env.DEBUG_CAPTCHA === 'true') {
      console.log('🐛 DEBUG: No CAPTCHA detected, showing all potential elements...');
      await this.debugCaptchaElements();
    }
    
    if (!captchaType) {
      console.log('✅ No CAPTCHA detected');
      return true;
    }
    
    console.log(`🤖 CAPTCHA detected: ${captchaType} - Will attempt ${maxAttempts} times over 2 minutes`);
    
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check if we've exceeded total timeout
      if (Date.now() - startTime > totalTimeout) {
        console.log('⏰ Total timeout exceeded, falling back to manual completion');
        break;
      }
      
      console.log(`🎯 Attempt ${attempt}/${maxAttempts} to solve CAPTCHA...`);
      
      try {
        let solved = false;
        
        switch (captchaType) {
          case 'recaptcha-v2-checkbox':
            solved = await this.handleRecaptchaV2Checkbox();
            break;
          case 'recaptcha-v2-image':
            solved = await this.handleRecaptchaV2ImageChallenge();
            break;
          case 'hcaptcha':
            solved = await this.handleHCaptcha();
            break;
          default:
            console.log('⚠️  Unknown CAPTCHA type');
            break;
        }
        
        if (solved) {
          console.log(`🎉 CAPTCHA solved successfully on attempt ${attempt}!`);
          return true;
        }
        
        // If this wasn't the last attempt, wait before trying again
        if (attempt < maxAttempts && Date.now() - startTime < totalTimeout - retryInterval) {
          console.log(`⏳ Attempt ${attempt} failed, waiting ${retryInterval/1000} seconds before retry...`);
          await this.browser.page.waitForTimeout(retryInterval);
          
          // Re-check CAPTCHA type in case it changed
          const newCaptchaType = await this.detectCaptchaType();
          if (newCaptchaType !== captchaType) {
            console.log(`🔄 CAPTCHA type changed from ${captchaType} to ${newCaptchaType}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error on attempt ${attempt}:`, error);
        if (attempt < maxAttempts) {
          await this.browser.page.waitForTimeout(5000); // Shorter wait on error
        }
      }
    }
    
    console.log('⚠️  All automatic attempts failed, falling back to manual completion');
    return await this.waitForManualCompletion();
  }

  /**
   * Detects what type of CAPTCHA is present on the page
   * @returns {Promise<string|null>} - CAPTCHA type or null if none found
   */
  async detectCaptchaType() {
    return await this.browser.page.evaluate(() => {
      console.log('🔍 Checking for various CAPTCHA types...');
      
      // Check for reCAPTCHA v2 checkbox - multiple selectors
      const recaptchaSelectors = [
        'iframe[title*="reCAPTCHA"]',
        'iframe[src*="recaptcha"]', 
        'iframe[src*="google.com/recaptcha"]',
        'div[class*="recaptcha"]',
        '.g-recaptcha',
        '#recaptcha',
        '[data-sitekey]'
      ];
      
      for (const selector of recaptchaSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`✅ Found reCAPTCHA using selector: ${selector}`);
          return 'recaptcha-v2-checkbox';
        }
      }
      
      // Check for reCAPTCHA v2 image challenge
      const challengeSelectors = [
        'iframe[title*="recaptcha challenge"]',
        'iframe[src*="recaptcha/api2/bframe"]',
        'div[class*="recaptcha-challenge"]'
      ];
      
      for (const selector of challengeSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`✅ Found reCAPTCHA challenge using selector: ${selector}`);
          return 'recaptcha-v2-image';
        }
      }
      
      // Check for hCaptcha
      const hcaptchaSelectors = [
        'iframe[src*="hcaptcha"]',
        'div[class*="hcaptcha"]',
        '.h-captcha',
        '[data-hcaptcha-sitekey]'
      ];
      
      for (const selector of hcaptchaSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`✅ Found hCaptcha using selector: ${selector}`);
          return 'hcaptcha';
        }
      }
      
      // Generic CAPTCHA detection with more patterns
      const genericSelectors = [
        'div[class*="captcha"]',
        'div[id*="captcha"]',
        '.captcha',
        '#captcha',
        'div[class*="verification"]',
        'div[id*="verification"]',
        'img[src*="captcha"]',
        'canvas[id*="captcha"]'
      ];
      
      for (const selector of genericSelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
          console.log(`✅ Found generic CAPTCHA using selector: ${selector}`);
          return 'generic';
        }
      }
      
      // Check for any disabled login buttons that might indicate CAPTCHA requirement
      const loginButtons = document.querySelectorAll('button[type="submit"], button, input[type="submit"]');
      for (const button of loginButtons) {
        const text = (button.textContent || button.value || '').toLowerCase();
        if ((text.includes('log') || text.includes('sign')) && button.disabled) {
          console.log('⚠️  Login button is disabled, might indicate CAPTCHA requirement');
          // Don't return a CAPTCHA type just for disabled button, but log it
        }
      }
      
      console.log('❌ No CAPTCHA detected with any selector');
      return null;
    });
  }

  /**
   * Handles reCAPTCHA v2 checkbox (the simple "I'm not a robot" checkbox)
   * @returns {Promise<boolean>}
   */
  async handleRecaptchaV2Checkbox() {
    try {
      console.log('🎯 Attempting to solve reCAPTCHA v2 checkbox...');
      
      // Wait for the reCAPTCHA iframe to load
      await this.browser.page.waitForSelector('iframe[title*="reCAPTCHA"], iframe[src*="recaptcha"]', { timeout: 10000 });
      
      // Get the reCAPTCHA iframe
      const recaptchaFrameElement = await this.browser.page.$('iframe[title*="reCAPTCHA"], iframe[src*="recaptcha"]');
      if (!recaptchaFrameElement) {
        console.log('⚠️  Could not find reCAPTCHA iframe element');
        return false;
      }
      
      const recaptchaFrame = await recaptchaFrameElement.contentFrame();
      if (!recaptchaFrame) {
        console.log('⚠️  Could not access reCAPTCHA iframe content');
        return false;
      }
      
      // Look for the checkbox within the iframe
      const checkbox = await recaptchaFrame.$('span[role="checkbox"], div[role="checkbox"], .recaptcha-checkbox');
      
      // Click the checkbox
      if (checkbox) {
        await checkbox.click();
      } else {
        throw new Error('Could not find reCAPTCHA checkbox');
      }
      console.log('✅ Clicked reCAPTCHA checkbox');
      
      // Wait to see if it's solved or if we need to do image challenge
      await this.browser.page.waitForTimeout(3000);
      
      // FIRST: Check if the login button is now enabled (important case!)
      const isLoginButtonEnabled = await this.isLoginButtonEnabled();
      if (isLoginButtonEnabled) {
        console.log('✅ Login button is now enabled after CAPTCHA checkbox click!');
        return true;
      }
      
      // If login button still disabled, check if an image challenge appeared
      const imageChallenge = await this.browser.page.evaluate(() => {
        return document.querySelector('iframe[title*="recaptcha challenge"]') !== null;
      });
      
      if (imageChallenge) {
        console.log('🖼️  Image challenge appeared, solving...');
        return await this.handleRecaptchaV2ImageChallenge();
      }
      
      // Check if checkbox is now checked (fallback check)
      const isChecked = await this.browser.page.evaluate(() => {
        return document.querySelector('iframe[title*="reCAPTCHA"]') && 
               !document.querySelector('iframe[title*="recaptcha challenge"]');
      });
      
      if (isChecked) {
        console.log('✅ reCAPTCHA checkbox appears solved, but login button still disabled');
        // Wait a bit more and check login button again
        await this.browser.page.waitForTimeout(2000);
        const isLoginButtonEnabledNow = await this.isLoginButtonEnabled();
        if (isLoginButtonEnabledNow) {
          console.log('✅ Login button enabled after additional wait!');
          return true;
        } else {
          console.log('⚠️  Login button still disabled despite checkbox being checked');
          return false;
        }
      } else {
        console.log('⚠️  Checkbox click didn\'t solve CAPTCHA immediately');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error handling reCAPTCHA checkbox:', error);
      return false;
    }
  }

  /**
   * Handles reCAPTCHA v2 image challenges using OpenAI Vision
   * @returns {Promise<boolean>}
   */
  async handleRecaptchaV2ImageChallenge() {
    try {
      console.log('🖼️  Attempting to solve reCAPTCHA v2 image challenge...');
      
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key not found');
        return false;
      }
      
      // Wait for the challenge iframe to load
      await this.browser.page.waitForSelector('iframe[title*="recaptcha challenge"]', { timeout: 10000 });
      
      // Get the challenge iframe - use frame() instead of frameLocator()
      const challengeFrameElement = await this.browser.page.$('iframe[title*="recaptcha challenge"]');
      if (!challengeFrameElement) {
        console.log('⚠️  Could not find challenge iframe element');
        return false;
      }
      
      const challengeFrame = await challengeFrameElement.contentFrame();
      if (!challengeFrame) {
        console.log('⚠️  Could not access challenge iframe content');
        return false;
      }
      
      // Wait for the challenge to fully load
      await this.browser.page.waitForTimeout(3000);
      
      // Get the challenge instruction text with multiple selectors
      let instruction = '';
      try {
        const instructionSelectors = [
          '.rc-imageselect-desc-no-canonical',
          '.rc-imageselect-desc', 
          '.rc-imageselect-desc-wrapper',
          '.rc-task'
        ];
        
        for (const selector of instructionSelectors) {
          try {
            const element = await challengeFrame.$(selector);
            if (element) {
              instruction = await element.textContent();
              if (instruction && instruction.trim()) {
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (error) {
        console.error('❌ Could not get instruction text:', error);
      }
      
      console.log('📋 Challenge instruction:', instruction);
      
      if (!instruction || !instruction.trim()) {
        console.log('⚠️  Could not get challenge instruction');
        return false;
      }
      
      // Get grid information first to understand layout
      const gridInfo = await challengeFrame.evaluate(() => {
        const tiles = document.querySelectorAll('.rc-imageselect-tile, td');
        const table = document.querySelector('.rc-imageselect-table-33, .rc-imageselect-table-44');
        const rows = table ? table.querySelectorAll('tr').length : Math.ceil(Math.sqrt(tiles.length));
        const cols = Math.ceil(tiles.length / rows);
        
        return {
          totalTiles: tiles.length,
          rows: rows,
          cols: cols,
          gridType: tiles.length === 9 ? '3x3' : tiles.length === 16 ? '4x4' : `${rows}x${cols}`
        };
      });
      
      console.log('🔢 Grid info:', gridInfo);
      
      // Take a screenshot of just the image grid area
      let challengeImage;
      try {
        // Try multiple selectors for the challenge area
        const imageSelectors = [
          '.rc-imageselect-challenge',
          '.rc-imageselect-table-33',
          '.rc-imageselect-table-44', 
          '.rc-imageselect'
        ];
        
        for (const selector of imageSelectors) {
          try {
            const element = await challengeFrame.$(selector);
            if (element) {
              challengeImage = await element.screenshot();
              if (challengeImage) {
                console.log(`✅ Screenshot taken using selector: ${selector}`);
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (error) {
        console.error('❌ Error taking screenshot:', error);
        return false;
      }
      
      if (!challengeImage) {
        console.log('⚠️  Could not capture challenge image');
        return false;
      }
      
      // Optional: Save debug screenshot if environment variable is set
      if (process.env.DEBUG_CAPTCHA_SCREENSHOTS === 'true') {
        const fs = await import('fs');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const debugPath = `captcha-challenge-${timestamp}.png`;
        fs.writeFileSync(debugPath, challengeImage);
        console.log(`📸 Debug: Challenge image saved to ${debugPath}`);
      }
      
      // Use OpenAI Vision to analyze the image
      const solution = await this.analyzeImageChallenge(instruction, challengeImage, gridInfo);
      
      if (!solution || solution.length === 0) {
        console.log('⚠️  AI could not identify any matching squares');
        return false;
      }
      
      console.log(`🎯 AI identified ${solution.length} squares to click: [${solution.join(', ')}]`);
      
      // Click on the identified image squares with improved selectors
      for (const imageIndex of solution) {
        try {
          // Try multiple ways to select the tile
          let clicked = false;
          
          const selectors = [
            `.rc-imageselect-tile:nth-child(${imageIndex + 1})`,
            `td:nth-child(${imageIndex + 1})`,
            `.rc-imageselect-tile`
          ];
          
          for (const selector of selectors) {
            try {
              if (selector === '.rc-imageselect-tile') {
                const imageSquares = await challengeFrame.$$(selector);
                if (imageSquares[imageIndex]) {
                  await imageSquares[imageIndex].click();
                  clicked = true;
                }
              } else {
                const imageSquare = await challengeFrame.$(selector);
                if (imageSquare) {
                  await imageSquare.click();
                  clicked = true;
                }
              }
              
              if (clicked) {
                console.log(`✅ Clicked image square ${imageIndex + 1} using ${selector}`);
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!clicked) {
            console.error(`❌ Could not click image square ${imageIndex + 1}`);
          } else {
            await this.browser.page.waitForTimeout(800); // Slightly longer wait between clicks
          }
          
        } catch (error) {
          console.error(`❌ Error clicking image square ${imageIndex + 1}:`, error);
        }
      }
      
      // Wait a bit before clicking verify
      await this.browser.page.waitForTimeout(1000);
      
      // Click verify button with multiple selectors
      try {
        const verifySelectors = [
          '#recaptcha-verify-button',
          '.rc-button-default',
          'button[id*="verify"]',
          'input[id*="verify"]'
        ];
        
        let verifyClicked = false;
        for (const selector of verifySelectors) {
          try {
            const verifyButton = await challengeFrame.$(selector);
            if (verifyButton) {
              await verifyButton.click();
              console.log(`✅ Clicked verify button using ${selector}`);
              verifyClicked = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!verifyClicked) {
          console.error('❌ Could not click verify button');
          return false;
        }
      } catch (error) {
        console.error('❌ Error clicking verify button:', error);
        return false;
      }
      
      // Wait for verification with better checking
      await this.browser.page.waitForTimeout(4000);
      
      // Check if solved with multiple indicators
      const isSolved = await this.browser.page.evaluate(() => {
        // Check if challenge iframe is gone
        const challengeIframe = document.querySelector('iframe[title*="recaptcha challenge"]');
        if (!challengeIframe) return true;
        
        // Check if checkbox is now checked
        const checkbox = document.querySelector('iframe[title*="reCAPTCHA"]');
        if (checkbox) {
          // Look for success indicators in the main reCAPTCHA iframe
          return true; // Assume success if challenge is gone but main iframe remains
        }
        
        return false;
      });
      
      if (isSolved) {
        console.log('🎉 reCAPTCHA image challenge solved successfully!');
        return true;
      } else {
        console.log('⚠️  Image challenge solution verification failed');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error handling reCAPTCHA image challenge:', error);
      return false;
    }
  }

  /**
   * Uses OpenAI Vision to analyze CAPTCHA image and determine which squares to click
   * @param {string} instruction - The CAPTCHA instruction text
   * @param {Buffer} imageBuffer - Screenshot of the CAPTCHA image grid
   * @param {Object} gridInfo - Information about the grid layout
   * @returns {Promise<number[]>} - Array of image indices to click (0-based)
   */
  async analyzeImageChallenge(instruction, imageBuffer, gridInfo) {
    try {
      console.log('🤖 Using AI vision to analyze CAPTCHA image...');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // GPT-4 with vision
        messages: [
          {
            role: "system",
            content: `You are an expert CAPTCHA solver. You will analyze a reCAPTCHA image grid and identify which squares match the given instruction.

CRITICAL INFORMATION:
- The image shows a ${gridInfo.gridType} grid with ${gridInfo.totalTiles} total squares
- Squares are numbered from 0 to ${gridInfo.totalTiles - 1} (zero-based indexing)
- Numbering goes LEFT TO RIGHT, TOP TO BOTTOM
- For a ${gridInfo.gridType} grid:
  ${gridInfo.gridType === '3x3' ? 
    'Row 1: [0, 1, 2], Row 2: [3, 4, 5], Row 3: [6, 7, 8]' :
    gridInfo.gridType === '4x4' ? 
    'Row 1: [0,1,2,3], Row 2: [4,5,6,7], Row 3: [8,9,10,11], Row 4: [12,13,14,15]' :
    `Grid has ${gridInfo.rows} rows and ${gridInfo.cols} columns`}

TASK: Look at each square carefully and identify ALL squares that contain the object(s) mentioned in the instruction.

RESPONSE FORMAT: Return ONLY a JSON array of numbers (zero-based indices).
Examples: [0, 2, 5] or [1, 4, 7, 8] or [] if no matches

Be thorough but conservative - only select squares where you're confident the object is present.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `INSTRUCTION: "${instruction}"

Analyze this ${gridInfo.gridType} grid image carefully. Which squares contain the objects mentioned in the instruction?

Remember:
- Look at ALL ${gridInfo.totalTiles} squares
- Use zero-based indexing (0 to ${gridInfo.totalTiles - 1})
- Only return the JSON array of indices, nothing else
- Be thorough but only select squares where you're confident`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.05 // Very low temperature for consistent results
      });
      
      const content = response.choices[0].message.content.trim();
      console.log('🤖 AI response:', content);
      
      // Parse the JSON response
      try {
        const solution = JSON.parse(content);
        if (Array.isArray(solution)) {
          // Validate indices are within range
          const validSolution = solution.filter(index => 
            typeof index === 'number' && 
            index >= 0 && 
            index < gridInfo.totalTiles
          );
          
          if (validSolution.length !== solution.length) {
            console.warn('⚠️  Some AI-provided indices were out of range and filtered');
          }
          
          console.log(`✅ AI identified ${validSolution.length} valid squares to click: [${validSolution.join(', ')}]`);
          return validSolution;
        } else {
          console.error('❌ AI response is not an array');
        }
      } catch (parseError) {
        console.error('❌ Error parsing AI response:', parseError);
        
        // Try to extract numbers from the response even if JSON parsing failed
        const numbers = content.match(/\d+/g);
        if (numbers) {
          const extractedSolution = numbers
            .map(num => parseInt(num))
            .filter(index => index >= 0 && index < gridInfo.totalTiles);
          
          if (extractedSolution.length > 0) {
            console.log('🔧 Extracted numbers from malformed response:', extractedSolution);
            return extractedSolution;
          }
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error using AI vision for CAPTCHA:', error);
      return [];
    }
  }

  /**
   * Handles hCaptcha challenges
   * @returns {Promise<boolean>}
   */
  async handleHCaptcha() {
    console.log('⚠️  hCaptcha detected - this requires manual completion or specialized service');
    return false;
  }

  /**
   * Waits for manual CAPTCHA completion with timeout
   * @returns {Promise<boolean>}
   */
  async waitForManualCompletion() {
    console.log('⏳ Waiting for manual CAPTCHA completion (up to 5 minutes)...');
    
    const startTime = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    while (Date.now() - startTime < timeout) {
      // Check if CAPTCHA is still present
      const captchaStillPresent = await this.browser.page.evaluate(() => {
        return document.querySelector('iframe[title*="reCAPTCHA"], iframe[title*="recaptcha challenge"], iframe[src*="hcaptcha"]') !== null;
      });
      
      if (!captchaStillPresent) {
        console.log('✅ CAPTCHA completed manually!');
        return true;
      }
      
      await this.browser.page.waitForTimeout(2000);
    }
    
    console.log('⏰ Manual CAPTCHA completion timeout');
    return false;
  }

  /**
   * Checks if login button is enabled (useful for checking if CAPTCHA is required)
   * @returns {Promise<boolean>}
   */
  async isLoginButtonEnabled() {
    return await this.browser.page.evaluate(() => {
      const loginButtons = document.querySelectorAll('button[type="submit"], button, input[type="submit"]');
      for (const button of loginButtons) {
        const text = button.textContent || button.value || '';
        if (text.toLowerCase().includes('log') || text.toLowerCase().includes('sign')) {
          return !button.disabled && !button.hasAttribute('disabled');
        }
      }
      return true; // Default to enabled if can't find login button
    });
  }

  /**
   * Saves debugging screenshot of current page state
   * @param {string} filename - Name for the screenshot file
   */
  async saveDebugScreenshot(filename) {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const path = `debug-captcha-${filename}-${timestamp}.png`;
      await this.browser.page.screenshot({ path, fullPage: true });
      console.log(`📸 Debug screenshot saved: ${path}`);
    } catch (error) {
      console.error('❌ Error saving debug screenshot:', error);
    }
  }

  /**
   * Debug method to log all potential CAPTCHA elements on the page
   */
  async debugCaptchaElements() {
    const elements = await this.browser.page.evaluate(() => {
      const selectors = [
        'iframe', 'div[class*="captcha"]', 'div[id*="captcha"]', 
        'div[class*="recaptcha"]', 'canvas', 'button[disabled]',
        '[data-sitekey]', '[data-hcaptcha-sitekey]'
      ];
      
      const found = [];
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
          found.push({
            selector: `${selector}:nth-child(${index + 1})`,
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            src: el.src || '',
            title: el.title || '',
            text: (el.textContent || '').substring(0, 50),
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
            disabled: el.disabled || false
          });
        });
      });
      
      return found;
    });
    
    console.log('🔍 Debug - All potential CAPTCHA-related elements found:');
    elements.forEach((el, index) => {
      console.log(`${index}: ${JSON.stringify(el, null, 2)}`);
    });
    
    return elements;
  }
}

export const createCaptchaHandler = (browserHelper) => new CaptchaHandler(browserHelper);
