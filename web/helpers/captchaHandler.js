import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class CaptchaHandler {
  constructor(browserHelper) {
    this.browser = browserHelper;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // CAPTCHA type constants
    this.CAPTCHA_TYPES = {
      RECAPTCHA_V2_CHECKBOX: 'recaptcha-v2-checkbox',
      RECAPTCHA_V2_IMAGE: 'recaptcha-v2-image',
      RECAPTCHA_V2_INVISIBLE: 'recaptcha-v2-invisible',
      RECAPTCHA_V3: 'recaptcha-v3',
      HCAPTCHA: 'hcaptcha',
      HCAPTCHA_IMAGE: 'hcaptcha-image',
      FUNCAPTCHA: 'funcaptcha',
      MATH_CAPTCHA: 'math-captcha',
      TEXT_CAPTCHA: 'text-captcha',
      PUZZLE_JIGSAW: 'puzzle-jigsaw',
      PUZZLE_SLIDER: 'puzzle-slider',
      PUZZLE_ROTATION: 'puzzle-rotation',
      CLOUDFLARE_TURNSTILE: 'cloudflare-turnstile',
      CUSTOM: 'custom-captcha'
    };
    
    // Success rates for different CAPTCHA types
    // Checkbox should ALWAYS have higher priority than image challenges
    this.successRates = {
      [this.CAPTCHA_TYPES.RECAPTCHA_V2_CHECKBOX]: 0.98, // Highest priority
      [this.CAPTCHA_TYPES.MATH_CAPTCHA]: 0.95,
      [this.CAPTCHA_TYPES.RECAPTCHA_V2_IMAGE]: 0.90, // Lower than checkbox
      [this.CAPTCHA_TYPES.RECAPTCHA_V2_INVISIBLE]: 0.88,
      [this.CAPTCHA_TYPES.PUZZLE_SLIDER]: 0.85,
      [this.CAPTCHA_TYPES.TEXT_CAPTCHA]: 0.85,
      [this.CAPTCHA_TYPES.RECAPTCHA_V3]: 0.82,
      [this.CAPTCHA_TYPES.PUZZLE_JIGSAW]: 0.80,
      [this.CAPTCHA_TYPES.CLOUDFLARE_TURNSTILE]: 0.78,
      [this.CAPTCHA_TYPES.HCAPTCHA]: 0.75,
      [this.CAPTCHA_TYPES.HCAPTCHA_IMAGE]: 0.72,
      [this.CAPTCHA_TYPES.FUNCAPTCHA]: 0.70,
      [this.CAPTCHA_TYPES.PUZZLE_ROTATION]: 0.65,
      [this.CAPTCHA_TYPES.CUSTOM]: 0.50
    };
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
          case this.CAPTCHA_TYPES.RECAPTCHA_V2_CHECKBOX:
            solved = await this.handleRecaptchaV2Checkbox();
            break;
          case this.CAPTCHA_TYPES.RECAPTCHA_V2_IMAGE:
            solved = await this.handleRecaptchaV2ImageChallenge();
            break;
          case this.CAPTCHA_TYPES.RECAPTCHA_V2_INVISIBLE:
            solved = await this.handleRecaptchaV2Invisible();
            break;
          case this.CAPTCHA_TYPES.RECAPTCHA_V3:
            solved = await this.handleRecaptchaV3();
            break;
          case this.CAPTCHA_TYPES.HCAPTCHA:
            solved = await this.handleHCaptcha();
            break;
          case this.CAPTCHA_TYPES.HCAPTCHA_IMAGE:
            solved = await this.handleHCaptchaImage();
            break;
          case this.CAPTCHA_TYPES.FUNCAPTCHA:
            solved = await this.handleFunCaptcha();
            break;
          case this.CAPTCHA_TYPES.MATH_CAPTCHA:
            solved = await this.handleMathCaptcha();
            break;
          case this.CAPTCHA_TYPES.TEXT_CAPTCHA:
            solved = await this.handleTextCaptcha();
            break;
          case this.CAPTCHA_TYPES.PUZZLE_JIGSAW:
            solved = await this.handleJigsawPuzzle();
            break;
          case this.CAPTCHA_TYPES.PUZZLE_SLIDER:
            solved = await this.handleSliderPuzzle();
            break;
          case this.CAPTCHA_TYPES.PUZZLE_ROTATION:
            solved = await this.handleRotationPuzzle();
            break;
          case this.CAPTCHA_TYPES.CLOUDFLARE_TURNSTILE:
            solved = await this.handleCloudflareTurnstile();
            break;
          case this.CAPTCHA_TYPES.CUSTOM:
            solved = await this.handleCustomCaptcha();
            break;
          default:
            console.log(`⚠️  Unknown CAPTCHA type: ${captchaType}`);
            solved = await this.handleCustomCaptcha(); // Fallback to custom handler
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
   * Enhanced CAPTCHA detection system that identifies all major CAPTCHA types
   * @returns {Promise<string|null>} - CAPTCHA type or null if none found
   */
  async detectCaptchaType() {
    console.log('🔍 Running comprehensive CAPTCHA detection...');
    
    // Run all detection methods in parallel for efficiency
    const detectionResults = await Promise.all([
      this.detectRecaptcha(),
      this.detectHCaptcha(),
      this.detectFunCaptcha(),
      this.detectMathCaptcha(),
      this.detectTextCaptcha(),
      this.detectPuzzleCaptcha(),
      this.detectCloudflareType(),
      this.detectCustomCaptcha()
    ]);
    
    // Filter out null results and prioritize by confidence/success rate
    const validDetections = detectionResults.filter(result => result !== null);
    
    if (validDetections.length === 0) {
      console.log('❌ No CAPTCHA detected with any method');
      return null;
    }
    
    if (validDetections.length === 1) {
      console.log(`✅ Single CAPTCHA detected: ${validDetections[0]}`);
      return validDetections[0];
    }
    
    // Multiple CAPTCHAs detected - prioritize by success rate
    const prioritized = validDetections.sort((a, b) => 
      (this.successRates[b] || 0.5) - (this.successRates[a] || 0.5)
    );
    
    console.log(`🎯 Multiple CAPTCHAs detected: [${validDetections.join(', ')}], prioritizing: ${prioritized[0]}`);
    return prioritized[0];
  }
  
  /**
   * Detect reCAPTCHA variations (v2, v3, invisible)
   */
  async detectRecaptcha() {
    return await this.browser.page.evaluate(() => {
      console.log('🔍 Detecting reCAPTCHA types...');
      
      // Check for reCAPTCHA v3 first (no UI, just script)
      if (window.grecaptcha && window.grecaptcha.enterprise) {
        console.log('✅ Found reCAPTCHA v3');
        return 'recaptcha-v3';
      }
      
      // Check for reCAPTCHA v2 invisible
      const invisibleSelectors = [
        '.g-recaptcha[data-size="invisible"]',
        '[data-callback][data-sitekey]:not([data-size="normal"])'
      ];
      
      for (const selector of invisibleSelectors) {
        if (document.querySelector(selector)) {
          console.log('✅ Found reCAPTCHA v2 invisible:', selector);
          return 'recaptcha-v2-invisible';
        }
      }
      
      // IMPORTANT: Check for reCAPTCHA v2 checkbox FIRST
      // Even if a challenge iframe exists, we need to click the checkbox first
      const checkboxSelectors = [
        'iframe[title*="reCAPTCHA"]',
        'iframe[src*="recaptcha"]', 
        'iframe[src*="google.com/recaptcha"]',
        'div[class*="recaptcha"]',
        '.g-recaptcha',
        '#recaptcha',
        '[data-sitekey]'
      ];
      
      for (const selector of checkboxSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log('🔍 Found reCAPTCHA element:', selector, 'visible:', element.offsetWidth > 0 && element.offsetHeight > 0);
          // Check if this is the main reCAPTCHA checkbox (not the challenge)
          if (!selector.includes('challenge') && !selector.includes('bframe')) {
            console.log('✅ Detected reCAPTCHA v2 checkbox (priority)');
            return 'recaptcha-v2-checkbox';
          }
        }
      }
      
      // Only check for image challenge if it's VISIBLE (not hidden)
      // A hidden challenge iframe means we haven't clicked the checkbox yet
      const challengeSelectors = [
        'iframe[title*="recaptcha challenge"]',
        'iframe[src*="recaptcha/api2/bframe"]',
        'div[class*="recaptcha-challenge"]'
      ];
      
      for (const selector of challengeSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;
          console.log('🔍 Found challenge iframe:', selector, 'visible:', isVisible);
          
          if (isVisible) {
            console.log('✅ Detected visible reCAPTCHA v2 image challenge');
            return 'recaptcha-v2-image';
          } else {
            console.log('⚠️  Challenge iframe exists but is hidden - checkbox likely needs to be clicked first');
          }
        }
      }
      
      console.log('❌ No reCAPTCHA detected');
      return null;
    });
  }
  
  /**
   * Detect hCaptcha variations
   */
  async detectHCaptcha() {
    return await this.browser.page.evaluate(() => {
      // Check for hCaptcha challenge first
      const challengeSelectors = [
        'iframe[src*="hcaptcha.com"][src*="challenge"]',
        'div[class*="hcaptcha-challenge"]'
      ];
      
      for (const selector of challengeSelectors) {
        if (document.querySelector(selector)) {
          return 'hcaptcha-image';
        }
      }
      
      // Check for hCaptcha checkbox
      const hcaptchaSelectors = [
        'iframe[src*="hcaptcha"]',
        'div[class*="hcaptcha"]',
        '.h-captcha',
        '[data-hcaptcha-sitekey]'
      ];
      
      for (const selector of hcaptchaSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return 'hcaptcha';
        }
      }
      
      return null;
    });
  }
  
  /**
   * Detect FunCaptcha (Arkose Labs)
   */
  async detectFunCaptcha() {
    return await this.browser.page.evaluate(() => {
      const funCaptchaSelectors = [
        'iframe[src*="funcaptcha"]',
        'iframe[src*="arkoselabs"]',
        'div[class*="funcaptcha"]',
        '#funcaptcha',
        '[data-pk]' // FunCaptcha public key attribute
      ];
      
      for (const selector of funCaptchaSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return 'funcaptcha';
        }
      }
      
      // Check for Arkose Labs enforcement
      if (window.arkoseEnforcement || document.querySelector('script[src*="arkoselabs"]')) {
        return 'funcaptcha';
      }
      
      return null;
    });
  }
  
  /**
   * Detect mathematical CAPTCHAs
   */
  async detectMathCaptcha() {
    return await this.browser.page.evaluate(() => {
      // Look for math expressions in text
      const mathPatterns = [
        /\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\?/,
        /what\s+is\s+\d+/i,
        /solve\s*:/i,
        /calculate\s*:/i,
        /\d+\s*plus\s*\d+/i,
        /\d+\s*minus\s*\d+/i
      ];
      
      const textElements = document.querySelectorAll('*');
      for (const element of textElements) {
        const text = element.textContent || '';
        for (const pattern of mathPatterns) {
          if (pattern.test(text)) {
            return 'math-captcha';
          }
        }
      }
      
      // Check for common math CAPTCHA containers
      const mathSelectors = [
        '[class*="math"]',
        '[id*="math"]',
        '[class*="calculate"]',
        '[id*="calculate"]'
      ];
      
      for (const selector of mathSelectors) {
        const element = document.querySelector(selector);
        if (element && /\d+.*[+\-*\/].*\d+/.test(element.textContent)) {
          return 'math-captcha';
        }
      }
      
      return null;
    });
  }
  
  /**
   * Detect text-based CAPTCHAs
   */
  async detectTextCaptcha() {
    return await this.browser.page.evaluate(() => {
      // Look for distorted text images
      const textCaptchaSelectors = [
        'img[src*="captcha"]',
        'img[alt*="captcha"]',
        'canvas[id*="captcha"]',
        'div[class*="captcha"] img',
        'div[id*="captcha"] img'
      ];
      
      for (const selector of textCaptchaSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return 'text-captcha';
        }
      }
      
      // Check for text input with CAPTCHA-like context
      const inputs = document.querySelectorAll('input[type="text"]');
      for (const input of inputs) {
        const label = input.previousElementSibling || input.nextElementSibling;
        const labelText = label ? label.textContent.toLowerCase() : '';
        if (labelText.includes('captcha') || labelText.includes('verification')) {
          return 'text-captcha';
        }
      }
      
      return null;
    });
  }
  
  /**
   * Detect puzzle-based CAPTCHAs
   */
  async detectPuzzleCaptcha() {
    return await this.browser.page.evaluate(() => {
      // Detect jigsaw puzzles
      const jigsawSelectors = [
        '[class*="jigsaw"]',
        '[class*="puzzle"]',
        'canvas[id*="puzzle"]',
        'div[class*="slider-captcha"]'
      ];
      
      for (const selector of jigsawSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Determine specific puzzle type
          const className = element.className.toLowerCase();
          if (className.includes('slider') || className.includes('slide')) {
            return 'puzzle-slider';
          } else if (className.includes('rotate') || className.includes('rotation')) {
            return 'puzzle-rotation';
          } else {
            return 'puzzle-jigsaw';
          }
        }
      }
      
      // Check for slider-specific elements
      const sliderSelectors = [
        'div[class*="slider"][class*="track"]',
        'div[class*="slide-verify"]',
        'input[type="range"][class*="captcha"]'
      ];
      
      for (const selector of sliderSelectors) {
        if (document.querySelector(selector)) {
          return 'puzzle-slider';
        }
      }
      
      return null;
    });
  }
  
  /**
   * Detect Cloudflare Turnstile
   */
  async detectCloudflareType() {
    return await this.browser.page.evaluate(() => {
      const turnstileSelectors = [
        'iframe[src*="turnstile"]',
        'div[class*="turnstile"]',
        '[data-sitekey][data-theme]', // Turnstile attributes
        'script[src*="turnstile"]'
      ];
      
      for (const selector of turnstileSelectors) {
        if (document.querySelector(selector)) {
          return 'cloudflare-turnstile';
        }
      }
      
      // Check for Cloudflare challenge page
      if (document.title.includes('Just a moment') || 
          document.body.textContent.includes('Checking your browser')) {
        return 'cloudflare-turnstile';
      }
      
      return null;
    });
  }
  
  /**
   * Detect custom/unknown CAPTCHA types
   */
  async detectCustomCaptcha() {
    return await this.browser.page.evaluate(() => {
      // Generic CAPTCHA indicators
      const genericSelectors = [
        'div[class*="captcha"]',
        'div[id*="captcha"]',
        '.captcha',
        '#captcha',
        'div[class*="verification"]',
        'div[id*="verification"]',
        'div[class*="challenge"]',
        'div[id*="challenge"]'
      ];
      
      for (const selector of genericSelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
          return 'custom-captcha';
        }
      }
      
      // Check for disabled submit buttons (common CAPTCHA indicator)
      const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
      for (const button of submitButtons) {
        if (button.disabled) {
          // Look for CAPTCHA-like content nearby
          const parent = button.closest('form') || button.parentElement;
          if (parent && /captcha|verification|challenge|security/i.test(parent.textContent)) {
            return 'custom-captcha';
          }
        }
      }
      
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
      
      // Debug: Check what reCAPTCHA elements exist
      await this.browser.page.evaluate(() => {
        const allIframes = document.querySelectorAll('iframe');
        console.log(`🔍 Found ${allIframes.length} iframes on page`);
        allIframes.forEach((iframe, index) => {
          console.log(`  ${index}: ${iframe.src || 'no src'} - title: "${iframe.title || 'no title'}" - visible: ${iframe.offsetWidth > 0 && iframe.offsetHeight > 0}`);
        });
      });
      
      // Wait for the reCAPTCHA iframe to load
      await this.browser.page.waitForSelector('iframe[title*="reCAPTCHA"], iframe[src*="recaptcha"]', { timeout: 10000 });
      
      // Get the reCAPTCHA iframe (not the challenge iframe)
      const recaptchaFrameElement = await this.browser.page.$('iframe[title*="reCAPTCHA"]:not([title*="challenge"])');
      if (!recaptchaFrameElement) {
        console.log('⚠️  Could not find main reCAPTCHA iframe element, trying alternative selectors...');
        
        // Try alternative approach
        const altFrame = await this.browser.page.$('iframe[src*="recaptcha"]:not([src*="bframe"])');
        if (!altFrame) {
          console.log('⚠️  Could not find any suitable reCAPTCHA iframe');
          return false;
        }
        console.log('✅ Found alternative reCAPTCHA iframe');
      }
      
      const finalFrame = recaptchaFrameElement || await this.browser.page.$('iframe[src*="recaptcha"]:not([src*="bframe"])');
      const recaptchaFrame = await finalFrame.contentFrame();
      
      if (!recaptchaFrame) {
        console.log('⚠️  Could not access reCAPTCHA iframe content');
        return false;
      }
      
      console.log('✅ Successfully accessed reCAPTCHA iframe content');
      
      // Look for the checkbox within the iframe
      console.log('🔍 Looking for checkbox inside iframe...');
      const checkbox = await recaptchaFrame.$('span[role="checkbox"], div[role="checkbox"], .recaptcha-checkbox');
      
      // Click the checkbox
      if (checkbox) {
        console.log('✅ Found checkbox, clicking...');
        await checkbox.click();
        console.log('✅ Clicked reCAPTCHA checkbox successfully');
      } else {
        // Debug what's in the iframe
        const iframeContent = await recaptchaFrame.evaluate(() => {
          return {
            html: document.body.innerHTML.substring(0, 200),
            elements: Array.from(document.querySelectorAll('*')).map(el => ({
              tag: el.tagName,
              role: el.getAttribute('role'),
              class: el.className,
              id: el.id
            })).slice(0, 10)
          };
        });
        console.log('🔍 iframe content:', iframeContent);
        throw new Error('Could not find reCAPTCHA checkbox');
      }
      
      // Wait to see if it's solved or if we need to do image challenge
      await this.browser.page.waitForTimeout(3000);
      
      // Wait longer for potential image challenge to appear
      console.log('🔍 Waiting for CAPTCHA response after checkbox click...');
      await this.browser.page.waitForTimeout(2000);
      
      // Check if an image challenge appeared FIRST (more reliable than button state)
      console.log('🔍 Checking if image challenge appeared...');
      const imageChallenge = await this.browser.page.evaluate(() => {
        const challengeIframe = document.querySelector('iframe[title*="recaptcha challenge"]');
        const isVisible = challengeIframe && challengeIframe.offsetWidth > 0 && challengeIframe.offsetHeight > 0;
        console.log('Challenge iframe found:', !!challengeIframe, 'visible:', isVisible);
        return isVisible;
      });
      
      if (imageChallenge) {
        console.log('🖼️  Image challenge appeared and is visible, solving...');
        return await this.handleRecaptchaV2ImageChallenge();
      }
      
      // If no image challenge, THEN check if login button is enabled
      console.log('🔍 No image challenge detected, checking if login button is now enabled...');
      const isLoginButtonEnabled = await this.isLoginButtonEnabled();
      if (isLoginButtonEnabled) {
        console.log('✅ Login button is now enabled after CAPTCHA checkbox click!');
        return true;
      }
      
      // Final comprehensive check
      console.log('🔍 Performing final CAPTCHA completion check...');
      
      // Check if there's still a hidden challenge iframe (indicates incomplete CAPTCHA)
      const hasHiddenChallenge = await this.browser.page.evaluate(() => {
        const challengeIframe = document.querySelector('iframe[title*="recaptcha challenge"]');
        const isHidden = challengeIframe && challengeIframe.offsetWidth === 0 && challengeIframe.offsetHeight === 0;
        console.log('Hidden challenge iframe exists:', !!challengeIframe && isHidden);
        return isHidden;
      });
      
      if (hasHiddenChallenge) {
        console.log('⚠️  Hidden challenge iframe detected - CAPTCHA not fully solved');
        console.log('💡 This usually means an image challenge should appear but didn\'t become visible');
        return false;
      }
      
      // Check if checkbox appears solved (no challenge iframe at all)
      const isFullySolved = await this.browser.page.evaluate(() => {
        const mainFrame = document.querySelector('iframe[title*="reCAPTCHA"]:not([title*="challenge"])');
        const challengeFrame = document.querySelector('iframe[title*="recaptcha challenge"]');
        
        // CAPTCHA is fully solved if:
        // 1. Main reCAPTCHA iframe exists
        // 2. No challenge iframe exists (or it's completely gone)
        const solved = mainFrame && !challengeFrame;
        console.log('Main reCAPTCHA iframe:', !!mainFrame, 'Challenge iframe:', !!challengeFrame, 'Fully solved:', solved);
        return solved;
      });
      
      if (isFullySolved) {
        console.log('✅ reCAPTCHA appears fully solved, checking login button one final time...');
        // Wait a bit more and check login button again
        await this.browser.page.waitForTimeout(2000);
        const isLoginButtonEnabledFinal = await this.isLoginButtonEnabled();
        if (isLoginButtonEnabledFinal) {
          console.log('✅ Login button enabled - CAPTCHA successfully solved!');
          return true;
        } else {
          console.log('⚠️  Login button still disabled despite CAPTCHA appearing solved');
          return false;
        }
      } else {
        console.log('⚠️  CAPTCHA does not appear to be fully solved');
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
      
      // Wait for the challenge iframe to become visible (not just exist)
      console.log('🔍 Waiting for challenge iframe to become visible...');
      
      // The iframe might already exist but be hidden, so we wait for it to become visible
      let challengeVisible = false;
      for (let i = 0; i < 20; i++) {  // Wait up to 10 seconds (20 * 500ms)
        const isVisible = await this.browser.page.evaluate(() => {
          const challengeIframe = document.querySelector('iframe[title*="recaptcha challenge"]');
          return challengeIframe && challengeIframe.offsetWidth > 0 && challengeIframe.offsetHeight > 0;
        });
        
        if (isVisible) {
          challengeVisible = true;
          console.log('✅ Challenge iframe became visible');
          break;
        }
        
        await this.browser.page.waitForTimeout(500);
      }
      
      if (!challengeVisible) {
        console.log('⚠️  Challenge iframe never became visible');
        return false;
      }
      
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
      if (process.env.DEBUG_CAPTCHA_SCREENSHOTS === 'true' || process.env.DEBUG_CAPTCHA === 'true') {
        try {
          const fs = await import('fs');
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const cleanInstruction = instruction.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
          const debugPath = `captcha-${cleanInstruction}-${timestamp}.png`;
          fs.writeFileSync(debugPath, challengeImage);
          console.log(`📸 Debug: Challenge image saved to ${debugPath}`);
          console.log(`🔍 Debug: Instruction was "${instruction}"`);
        } catch (e) {
          console.log('⚠️  Could not save debug screenshot:', e.message);
        }
      }
      
      // Use OpenAI Vision to analyze the image
      const solution = await this.analyzeImageChallenge(instruction, challengeImage, gridInfo);
      
      if (!solution || solution.length === 0) {
        console.log('⚠️  AI could not identify any matching squares');
        return false;
      }
      
      console.log(`🎯 AI identified ${solution.length} squares to click: [${solution.join(', ')}]`);
      
      // Click on the identified image squares with improved selectors
      // IMPORTANT: imageIndex is 0-based, so square 0 is the first square
      for (const imageIndex of solution) {
        try {
          console.log(`🎯 Attempting to click square at index ${imageIndex} (0-based)`);
          
          // Try multiple ways to select the tile - USE ZERO-BASED INDEXING
          let clicked = false;
          
          // Method 1: Use array indexing (most reliable)
          try {
            const imageSquares = await challengeFrame.$$('.rc-imageselect-tile');
            console.log(`Found ${imageSquares.length} image tiles total`);
            
            if (imageSquares[imageIndex]) {
              await imageSquares[imageIndex].click();
              console.log(`✅ Clicked image square at index ${imageIndex} using array indexing`);
              clicked = true;
            }
          } catch (e) {
            console.log(`⚠️  Array indexing failed for square ${imageIndex}:`, e.message);
          }
          
          // Method 2: CSS nth-child selector (1-based, so add 1 to index)
          if (!clicked) {
            try {
              const nthChildSelector = `.rc-imageselect-tile:nth-child(${imageIndex + 1})`;
              const imageSquare = await challengeFrame.$(nthChildSelector);
              if (imageSquare) {
                await imageSquare.click();
                console.log(`✅ Clicked image square at index ${imageIndex} using nth-child(${imageIndex + 1})`);
                clicked = true;
              }
            } catch (e) {
              console.log(`⚠️  nth-child selector failed for square ${imageIndex}:`, e.message);
            }
          }
          
          // Method 3: Table cell approach
          if (!clicked) {
            try {
              const tableCells = await challengeFrame.$$('td');
              if (tableCells[imageIndex]) {
                await tableCells[imageIndex].click();
                console.log(`✅ Clicked image square at index ${imageIndex} using table cell`);
                clicked = true;
              }
            } catch (e) {
              console.log(`⚠️  Table cell approach failed for square ${imageIndex}:`, e.message);
            }
          }
          
          if (!clicked) {
            console.error(`❌ Could not click image square at index ${imageIndex} with any method`);
          } else {
            await this.browser.page.waitForTimeout(800); // Wait between clicks
          }
          
        } catch (error) {
          console.error(`❌ Error clicking image square at index ${imageIndex}:`, error);
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
            content: `You are an expert CAPTCHA solver with exceptional visual recognition abilities. You will analyze a reCAPTCHA image grid and identify which squares contain the specified objects.

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

VISUAL ANALYSIS INSTRUCTIONS:
- Examine each square individually and carefully
- Look for both full objects and partial objects that extend across square boundaries
- Consider objects that may be partially obscured or at different angles
- Pay attention to distinctive features of the target object (wheels, handlebars for motorcycles, etc.)
- Be especially careful with similar objects (motorcycles vs bicycles, cars vs trucks)

RESPONSE FORMAT: Return ONLY a plain JSON array of numbers (zero-based indices).
- CORRECT: [0, 2, 5] or [1, 4, 7, 8] or []
- INCORRECT: \`\`\`json [0, 2, 5] \`\`\` (no markdown formatting)

ACCURACY IS CRITICAL: Only select squares where you are highly confident the target object is present. False positives will cause CAPTCHA failure.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `TARGET OBJECT: "${instruction}"

Analyze this ${gridInfo.gridType} grid image with extreme care. Examine each of the ${gridInfo.totalTiles} squares to identify which ones contain the target object.

STEP-BY-STEP PROCESS:
1. Identify the key visual features of "${instruction.replace(/select all (squares with|images with|images of)/i, '')}"
2. Examine each square from 0 to ${gridInfo.totalTiles - 1}
3. Only include squares where you can clearly identify the target object
4. Return ONLY the JSON array of indices

Critical reminder: Use zero-based indexing (0 to ${gridInfo.totalTiles - 1}) and return plain JSON only.`
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
      
      // Clean the response - remove markdown formatting if present
      let cleanedContent = content.trim();
      
      // Remove markdown code blocks if present
      if (cleanedContent.includes('```')) {
        cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      }
      
      console.log('🔧 Cleaned AI response:', cleanedContent);
      
      // Parse the JSON response
      try {
        const solution = JSON.parse(cleanedContent);
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
        console.error('❌ Error parsing cleaned AI response:', parseError);
        
        // Try to extract numbers from the response even if JSON parsing failed
        const numbers = cleanedContent.match(/\d+/g);
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
   * Handles reCAPTCHA v2 invisible challenges
   * @returns {Promise<boolean>}
   */
  async handleRecaptchaV2Invisible() {
    try {
      console.log('🎯 Attempting to handle reCAPTCHA v2 invisible...');
      
      // Invisible reCAPTCHA triggers automatically, just wait for it to complete
      await this.browser.page.waitForTimeout(5000);
      
      // Check if login button becomes enabled
      const isLoginButtonEnabled = await this.isLoginButtonEnabled();
      if (isLoginButtonEnabled) {
        console.log('✅ reCAPTCHA v2 invisible completed successfully!');
        return true;
      }
      
      console.log('⚠️  reCAPTCHA v2 invisible may require additional verification');
      return false;
      
    } catch (error) {
      console.error('❌ Error handling reCAPTCHA v2 invisible:', error);
      return false;
    }
  }
  
  /**
   * Handles reCAPTCHA v3 (score-based, no user interaction)
   * @returns {Promise<boolean>}
   */
  async handleRecaptchaV3() {
    try {
      console.log('🎯 Handling reCAPTCHA v3 (score-based)...');
      
      // v3 is score-based and automatic, just wait and check if login proceeds
      await this.browser.page.waitForTimeout(3000);
      
      const isLoginButtonEnabled = await this.isLoginButtonEnabled();
      if (isLoginButtonEnabled) {
        console.log('✅ reCAPTCHA v3 score acceptable!');
        return true;
      }
      
      console.log('⚠️  reCAPTCHA v3 score may be too low, manual completion required');
      return false;
      
    } catch (error) {
      console.error('❌ Error handling reCAPTCHA v3:', error);
      return false;
    }
  }
  
  /**
   * Handles mathematical CAPTCHA challenges using AI
   * @returns {Promise<boolean>}
   */
  async handleMathCaptcha() {
    try {
      console.log('🎯 Attempting to solve mathematical CAPTCHA...');
      
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key required for math CAPTCHA solving');
        return false;
      }
      
      // Find the math question text
      const mathQuestion = await this.browser.page.evaluate(() => {
        const mathPatterns = [
          /\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\?/,
          /what\s+is\s+\d+[\+\-\*\/]\d+/i,
          /solve\s*:.*\d+.*[\+\-\*\/].*\d+/i,
          /calculate\s*:.*\d+.*[\+\-\*\/].*\d+/i
        ];
        
        const textElements = document.querySelectorAll('*');
        for (const element of textElements) {
          const text = element.textContent || '';
          for (const pattern of mathPatterns) {
            const match = text.match(pattern);
            if (match) {
              return match[0];
            }
          }
        }
        return null;
      });
      
      if (!mathQuestion) {
        console.log('⚠️  Could not find math question text');
        return false;
      }
      
      console.log(`📊 Math question found: "${mathQuestion}"`);
      
      // Use AI to solve the math problem
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a calculator. Solve the given mathematical expression and return ONLY the numerical answer, nothing else."
          },
          {
            role: "user",
            content: `Solve this: ${mathQuestion}`
          }
        ],
        max_tokens: 10,
        temperature: 0
      });
      
      const answer = response.choices[0].message.content.trim();
      console.log(`🤖 AI calculated answer: ${answer}`);
      
      // Find and fill the answer input
      const inputFilled = await this.browser.page.evaluate((answer) => {
        // Look for math CAPTCHA input fields
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
        for (const input of inputs) {
          const parent = input.closest('div');
          const parentText = parent ? parent.textContent : '';
          
          if (parentText.includes('=') || parentText.includes('answer') || 
              parentText.includes('result') || parentText.includes('solve')) {
            input.value = answer;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, answer);
      
      if (inputFilled) {
        console.log('✅ Math CAPTCHA answer filled successfully!');
        await this.browser.page.waitForTimeout(1000);
        return true;
      } else {
        console.log('⚠️  Could not find math answer input field');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error solving math CAPTCHA:', error);
      return false;
    }
  }
  
  /**
   * Handles text-based CAPTCHA challenges using OCR and AI
   * @returns {Promise<boolean>}
   */
  async handleTextCaptcha() {
    try {
      console.log('🎯 Attempting to solve text CAPTCHA...');
      
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key required for text CAPTCHA solving');
        return false;
      }
      
      // Find CAPTCHA image
      const captchaImage = await this.browser.page.$('img[src*="captcha"], img[alt*="captcha"], canvas[id*="captcha"]');
      if (!captchaImage) {
        console.log('⚠️  Could not find text CAPTCHA image');
        return false;
      }
      
      // Screenshot the CAPTCHA
      const imageBuffer = await captchaImage.screenshot();
      
      // Use OpenAI Vision to read the text
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an OCR system. Extract the text from this CAPTCHA image. Return ONLY the text you see, nothing else. Handle distorted letters, noise, and various fonts."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What text do you see in this CAPTCHA image?"
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
        max_tokens: 50,
        temperature: 0
      });
      
      const extractedText = response.choices[0].message.content.trim();
      console.log(`🤖 AI extracted text: "${extractedText}"`);
      
      // Find and fill the text input
      const inputFilled = await this.browser.page.evaluate((text) => {
        const inputs = document.querySelectorAll('input[type="text"]');
        for (const input of inputs) {
          const parent = input.closest('div, form');
          const parentText = parent ? parent.textContent.toLowerCase() : '';
          
          if (parentText.includes('captcha') || parentText.includes('verification') ||
              parentText.includes('security') || parentText.includes('code')) {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, extractedText);
      
      if (inputFilled) {
        console.log('✅ Text CAPTCHA solved successfully!');
        await this.browser.page.waitForTimeout(1000);
        return true;
      } else {
        console.log('⚠️  Could not find text CAPTCHA input field');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error solving text CAPTCHA:', error);
      return false;
    }
  }
  
  /**
   * Handles jigsaw puzzle CAPTCHAs
   * @returns {Promise<boolean>}
   */
  async handleJigsawPuzzle() {
    try {
      console.log('🎯 Attempting to solve jigsaw puzzle CAPTCHA...');
      
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  OpenAI API key required for jigsaw puzzle solving');
        return false;
      }
      
      // Find puzzle elements
      const puzzleContainer = await this.browser.page.$('[class*="jigsaw"], [class*="puzzle"], canvas[id*="puzzle"]');
      if (!puzzleContainer) {
        console.log('⚠️  Could not find jigsaw puzzle container');
        return false;
      }
      
      // Screenshot the puzzle
      const puzzleImage = await puzzleContainer.screenshot();
      
      // Use AI to analyze the puzzle
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a puzzle solver. Analyze this jigsaw puzzle image and determine where the missing piece should be placed. Return coordinates as JSON: {\"x\": number, \"y\": number} representing the approximate position where the piece should be placed."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this jigsaw puzzle and tell me where the missing piece should be placed."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${puzzleImage.toString('base64')}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 100,
        temperature: 0
      });
      
      const aiResponse = response.choices[0].message.content.trim();
      console.log(`🤖 AI puzzle analysis: ${aiResponse}`);
      
      try {
        const coordinates = JSON.parse(aiResponse);
        
        // Drag the puzzle piece to the calculated position
        const puzzleBounds = await puzzleContainer.boundingBox();
        const targetX = puzzleBounds.x + coordinates.x;
        const targetY = puzzleBounds.y + coordinates.y;
        
        // Find draggable piece (usually near the puzzle area)
        await this.simulateHumanDrag(puzzleContainer, targetX, targetY);
        
        console.log('✅ Jigsaw puzzle piece moved!');
        await this.browser.page.waitForTimeout(2000);
        return true;
        
      } catch (parseError) {
        console.log('⚠️  Could not parse AI coordinates, trying alternative approach');
        // Fallback: try clicking center of puzzle area
        await puzzleContainer.click();
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error solving jigsaw puzzle:', error);
      return false;
    }
  }
  
  /**
   * Handles slider puzzle CAPTCHAs
   * @returns {Promise<boolean>}
   */
  async handleSliderPuzzle() {
    try {
      console.log('🎯 Attempting to solve slider puzzle CAPTCHA...');
      
      // Find slider element
      const slider = await this.browser.page.$('div[class*="slider"], input[type="range"][class*="captcha"]');
      if (!slider) {
        console.log('⚠️  Could not find slider element');
        return false;
      }
      
      // Get slider background image for analysis
      const sliderContainer = await this.browser.page.$('div[class*="slider-captcha"], div[class*="slide-verify"]');
      if (!sliderContainer) {
        console.log('⚠️  Could not find slider container');
        return false;
      }
      
      const sliderImage = await sliderContainer.screenshot();
      
      if (process.env.OPENAI_API_KEY) {
        // Use AI to determine slider position
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Analyze this slider puzzle image. Determine how far the slider should be moved to complete the puzzle. Return a percentage (0-100) representing how far to slide."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "How far should I slide to complete this puzzle? Return only a number between 0-100."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${sliderImage.toString('base64')}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 10,
          temperature: 0
        });
        
        const percentage = parseInt(response.choices[0].message.content.trim());
        console.log(`🤖 AI suggests sliding ${percentage}%`);
        
        // Perform human-like slider movement
        await this.simulateHumanSlider(slider, percentage);
      } else {
        // Fallback: try common slider positions
        const positions = [30, 50, 70, 80, 90];
        for (const position of positions) {
          console.log(`🎯 Trying slider position: ${position}%`);
          await this.simulateHumanSlider(slider, position);
          await this.browser.page.waitForTimeout(1000);
          
          // Check if solved
          const isEnabled = await this.isLoginButtonEnabled();
          if (isEnabled) {
            console.log(`✅ Slider puzzle solved at ${position}%!`);
            return true;
          }
        }
      }
      
      console.log('✅ Slider puzzle movement completed!');
      await this.browser.page.waitForTimeout(2000);
      return true;
      
    } catch (error) {
      console.error('❌ Error solving slider puzzle:', error);
      return false;
    }
  }
  
  /**
   * Handles rotation puzzle CAPTCHAs
   * @returns {Promise<boolean>}
   */
  async handleRotationPuzzle() {
    try {
      console.log('🎯 Attempting to solve rotation puzzle CAPTCHA...');
      
      // Find rotation elements
      const rotationElement = await this.browser.page.$('[class*="rotate"], [class*="rotation"]');
      if (!rotationElement) {
        console.log('⚠️  Could not find rotation puzzle element');
        return false;
      }
      
      // Try different rotation angles
      const angles = [90, 180, 270, 360];
      
      for (const angle of angles) {
        console.log(`🔄 Trying rotation angle: ${angle}°`);
        
        // Simulate rotation (implementation depends on specific CAPTCHA)
        await rotationElement.click();
        await this.browser.page.waitForTimeout(500);
        
        // Check if puzzle is solved
        const isEnabled = await this.isLoginButtonEnabled();
        if (isEnabled) {
          console.log(`✅ Rotation puzzle solved at ${angle}°!`);
          return true;
        }
      }
      
      console.log('✅ Rotation puzzle attempts completed!');
      return false;
      
    } catch (error) {
      console.error('❌ Error solving rotation puzzle:', error);
      return false;
    }
  }
  
  /**
   * Handles FunCaptcha challenges
   * @returns {Promise<boolean>}
   */
  async handleFunCaptcha() {
    try {
      console.log('🎯 Attempting to handle FunCaptcha...');
      
      // FunCaptcha is complex and game-based, requires specialized handling
      console.log('⚠️  FunCaptcha detected - attempting basic interaction');
      
      const funCaptchaFrame = await this.browser.page.$('iframe[src*="funcaptcha"], iframe[src*="arkoselabs"]');
      if (!funCaptchaFrame) {
        console.log('⚠️  Could not find FunCaptcha iframe');
        return false;
      }
      
      // Basic interaction - click through if possible
      await funCaptchaFrame.click();
      await this.browser.page.waitForTimeout(3000);
      
      console.log('⚠️  FunCaptcha requires manual completion or specialized service');
      return false;
      
    } catch (error) {
      console.error('❌ Error handling FunCaptcha:', error);
      return false;
    }
  }
  
  /**
   * Handles hCaptcha image challenges
   * @returns {Promise<boolean>}
   */
  async handleHCaptchaImage() {
    try {
      console.log('🎯 Attempting to solve hCaptcha image challenge...');
      
      // Similar to reCAPTCHA image challenges but for hCaptcha
      const challengeFrame = await this.browser.page.$('iframe[src*="hcaptcha.com"][src*="challenge"]');
      if (!challengeFrame) {
        console.log('⚠️  Could not find hCaptcha challenge frame');
        return false;
      }
      
      // Implementation would be similar to reCAPTCHA image challenge
      // but adapted for hCaptcha's specific structure
      console.log('⚠️  hCaptcha image challenge requires specialized implementation');
      return false;
      
    } catch (error) {
      console.error('❌ Error handling hCaptcha image challenge:', error);
      return false;
    }
  }
  
  /**
   * Handles Cloudflare Turnstile
   * @returns {Promise<boolean>}
   */
  async handleCloudflareTurnstile() {
    try {
      console.log('🎯 Handling Cloudflare Turnstile...');
      
      // Turnstile usually completes automatically, just wait
      await this.browser.page.waitForTimeout(5000);
      
      // Check if challenge is completed
      const isCompleted = await this.browser.page.evaluate(() => {
        return !document.title.includes('Just a moment') && 
               !document.body.textContent.includes('Checking your browser');
      });
      
      if (isCompleted) {
        console.log('✅ Cloudflare Turnstile completed successfully!');
        return true;
      }
      
      console.log('⚠️  Cloudflare Turnstile may require additional time');
      return false;
      
    } catch (error) {
      console.error('❌ Error handling Cloudflare Turnstile:', error);
      return false;
    }
  }
  
  /**
   * Handles custom/unknown CAPTCHA types
   * @returns {Promise<boolean>}
   */
  async handleCustomCaptcha() {
    try {
      console.log('🎯 Attempting to handle custom CAPTCHA...');
      
      // Generic approach for unknown CAPTCHAs
      await this.browser.page.waitForTimeout(2000);
      
      // Try clicking on CAPTCHA elements
      const captchaElements = await this.browser.page.$$('[class*="captcha"], [id*="captcha"]');
      for (const element of captchaElements) {
        try {
          await element.click();
          await this.browser.page.waitForTimeout(1000);
        } catch (e) {
          // Continue to next element
        }
      }
      
      // Check if any interaction helped
      const isEnabled = await this.isLoginButtonEnabled();
      if (isEnabled) {
        console.log('✅ Custom CAPTCHA interaction successful!');
        return true;
      }
      
      console.log('⚠️  Custom CAPTCHA requires manual completion or specific implementation');
      return false;
      
    } catch (error) {
      console.error('❌ Error handling custom CAPTCHA:', error);
      return false;
    }
  }

  /**
   * Handles hCaptcha challenges
   * @returns {Promise<boolean>}
   */
  async handleHCaptcha() {
    console.log('⚠️  hCaptcha detected - attempting basic handling');
    
    try {
      // Try basic hCaptcha checkbox click
      const hcaptchaFrame = await this.browser.page.$('iframe[src*="hcaptcha"]');
      if (hcaptchaFrame) {
        await hcaptchaFrame.click();
        await this.browser.page.waitForTimeout(3000);
        
        const isEnabled = await this.isLoginButtonEnabled();
        if (isEnabled) {
          console.log('✅ hCaptcha basic interaction successful!');
          return true;
        }
      }
    } catch (error) {
      console.error('Error with basic hCaptcha handling:', error);
    }
    
    console.log('⚠️  hCaptcha requires manual completion or specialized service');
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
      console.log('🔍 Checking login button state...');
      
      const loginButtons = document.querySelectorAll('button[type="submit"], button, input[type="submit"]');
      console.log(`Found ${loginButtons.length} potential login buttons`);
      
      for (let i = 0; i < loginButtons.length; i++) {
        const button = loginButtons[i];
        const text = button.textContent || button.value || '';
        const isLoginButton = text.toLowerCase().includes('log') || text.toLowerCase().includes('sign');
        
        if (isLoginButton) {
          const isEnabled = !button.disabled && !button.hasAttribute('disabled') && 
                           button.style.pointerEvents !== 'none' && 
                           !button.classList.contains('disabled');
          
          console.log(`Login button ${i}: "${text.trim()}" - enabled: ${isEnabled}, disabled attr: ${button.disabled}, hasDisabledAttr: ${button.hasAttribute('disabled')}, pointerEvents: ${button.style.pointerEvents}, classes: ${button.className}`);
          
          return isEnabled;
        }
      }
      
      console.log('⚠️  No login button found');
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
   * Simulates human-like drag movement for puzzle solving
   * @param {Object} startElement - Element to drag from
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   */
  async simulateHumanDrag(startElement, targetX, targetY) {
    try {
      console.log(`🖱️  Simulating human drag to coordinates (${targetX}, ${targetY})`);
      
      // Get starting position
      const startBounds = await startElement.boundingBox();
      const startX = startBounds.x + startBounds.width / 2;
      const startY = startBounds.y + startBounds.height / 2;
      
      // Hover to starting position first
      await this.browser.page.mouse.move(startX, startY);
      await this.browser.page.waitForTimeout(this.randomDelay(100, 300));
      
      // Press mouse down
      await this.browser.page.mouse.down();
      await this.browser.page.waitForTimeout(this.randomDelay(50, 150));
      
      // Create human-like movement path with curves
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        
        // Add some curve to the movement (Bezier-like)
        const curve = Math.sin(progress * Math.PI) * 10;
        const currentX = startX + (targetX - startX) * progress + curve;
        const currentY = startY + (targetY - startY) * progress;
        
        await this.browser.page.mouse.move(currentX, currentY);
        await this.browser.page.waitForTimeout(this.randomDelay(20, 80));
      }
      
      // Final position adjustment
      await this.browser.page.mouse.move(targetX, targetY);
      await this.browser.page.waitForTimeout(this.randomDelay(100, 200));
      
      // Release mouse
      await this.browser.page.mouse.up();
      await this.browser.page.waitForTimeout(this.randomDelay(200, 400));
      
      console.log('✅ Human-like drag completed');
      
    } catch (error) {
      console.error('❌ Error in human drag simulation:', error);
    }
  }
  
  /**
   * Simulates human-like slider movement
   * @param {Object} sliderElement - Slider element
   * @param {number} percentage - Percentage to slide (0-100)
   */
  async simulateHumanSlider(sliderElement, percentage) {
    try {
      console.log(`🎚️  Simulating human slider movement to ${percentage}%`);
      
      const sliderBounds = await sliderElement.boundingBox();
      const startX = sliderBounds.x;
      const startY = sliderBounds.y + sliderBounds.height / 2;
      const targetX = sliderBounds.x + (sliderBounds.width * percentage / 100);
      
      // Move to slider start
      await this.browser.page.mouse.move(startX + 10, startY);
      await this.browser.page.waitForTimeout(this.randomDelay(200, 400));
      
      // Press and hold
      await this.browser.page.mouse.down();
      await this.browser.page.waitForTimeout(this.randomDelay(100, 200));
      
      // Human-like sliding motion with micro-adjustments
      const steps = Math.max(5, Math.floor(Math.abs(targetX - startX) / 20));
      
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentX = startX + (targetX - startX) * progress;
        
        // Add slight vertical oscillation for realism
        const oscillation = Math.sin(progress * Math.PI * 4) * 2;
        const currentY = startY + oscillation;
        
        await this.browser.page.mouse.move(currentX, currentY);
        await this.browser.page.waitForTimeout(this.randomDelay(30, 100));
      }
      
      // Final position
      await this.browser.page.mouse.move(targetX, startY);
      await this.browser.page.waitForTimeout(this.randomDelay(100, 300));
      
      // Release
      await this.browser.page.mouse.up();
      await this.browser.page.waitForTimeout(this.randomDelay(200, 500));
      
      console.log('✅ Human-like slider movement completed');
      
    } catch (error) {
      console.error('❌ Error in slider simulation:', error);
    }
  }
  
  /**
   * Generates random delay within range for human-like timing
   * @param {number} min - Minimum delay in milliseconds
   * @param {number} max - Maximum delay in milliseconds
   * @returns {number} Random delay
   */
  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Simulates human typing patterns with realistic timing
   * @param {Object} element - Element to type in
   * @param {string} text - Text to type
   */
  async simulateHumanTyping(element, text) {
    try {
      console.log(`⌨️  Simulating human typing: "${text}"`);
      
      await element.click();
      await this.browser.page.waitForTimeout(this.randomDelay(200, 400));
      
      // Clear existing content
      await element.selectText();
      
      // Type character by character with human-like delays
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        await this.browser.page.keyboard.type(char);
        
        // Variable typing speed - faster for common letters, slower for special chars
        let delay = this.randomDelay(80, 200);
        if (/[A-Za-z\s]/.test(char)) {
          delay = this.randomDelay(50, 150); // Faster for letters and spaces
        } else if (/[0-9]/.test(char)) {
          delay = this.randomDelay(100, 180); // Medium for numbers
        } else {
          delay = this.randomDelay(150, 300); // Slower for special characters
        }
        
        await this.browser.page.waitForTimeout(delay);
      }
      
      console.log('✅ Human-like typing completed');
      
    } catch (error) {
      console.error('❌ Error in typing simulation:', error);
    }
  }
  
  /**
   * Enhanced CAPTCHA statistics and success tracking
   */
  getCaptchaStats() {
    const stats = {
      totalAttempts: 0,
      successfulSolves: 0,
      typeBreakdown: {},
      averageTime: 0
    };
    
    // This would be populated by tracking solve attempts
    // Implementation would store stats in memory or persistent storage
    
    return stats;
  }
  
  /**
   * Adaptive learning system for improving CAPTCHA solving
   * @param {string} captchaType - Type of CAPTCHA
   * @param {boolean} success - Whether solving was successful
   * @param {number} timeSpent - Time spent solving in milliseconds
   */
  async learnFromAttempt(captchaType, success, timeSpent) {
    try {
      // This would implement machine learning to improve success rates
      console.log(`📊 Learning from ${captchaType}: ${success ? 'SUCCESS' : 'FAILURE'} (${timeSpent}ms)`);
      
      // Update success rates dynamically
      if (this.successRates[captchaType] !== undefined) {
        if (success) {
          this.successRates[captchaType] = Math.min(0.99, this.successRates[captchaType] + 0.01);
        } else {
          this.successRates[captchaType] = Math.max(0.10, this.successRates[captchaType] - 0.005);
        }
        
        console.log(`📈 Updated ${captchaType} success rate: ${(this.successRates[captchaType] * 100).toFixed(1)}%`);
      }
      
    } catch (error) {
      console.error('❌ Error in learning system:', error);
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
