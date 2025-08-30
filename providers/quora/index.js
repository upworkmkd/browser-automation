import { BrowserHelper } from '../../helpers/browser.js';

export default class QuoraProvider {
  constructor(browserHelper) {
    this.browser = browserHelper;
  }

  async login() {
    try {
      console.log('🔄 Logging into Quora...');
      
      await this.browser.goto('https://www.quora.com/login');
      await this.browser.page.waitForSelector('input[type="text"], input[type="email"]');
      await this.browser.page.waitForSelector('input[type="password"]');
      
      const email = process.env.QUORA_EMAIL;
      const password = process.env.QUORA_PASSWORD;
      
      if (!email || !password) {
        throw new Error('QUORA_EMAIL and QUORA_PASSWORD must be set in .env file');
      }
      
      await this.browser.page.fill('input[type="text"], input[type="email"]', email);
      await this.browser.page.fill('input[type="password"]', password);
      
      // Click login button using evaluate for robustness
      await this.browser.page.evaluate(() => {
        const loginButton = document.querySelector('button[type="submit"]') || 
                           document.querySelector('button') || 
                           document.querySelector('input[type="submit"]');
        if (loginButton) {
          loginButton.click();
        }
      });
      
      // Check for captcha
      const captchaDetected = await this.browser.page.evaluate(() => {
        return !!document.querySelector('iframe[title*="reCAPTCHA"], div[class*="captcha"]');
      });
      
      if (captchaDetected) {
        console.log('⚠️  Captcha detected! Please complete it manually. Waiting up to 5 minutes...');
        
        // Wait for manual captcha completion with timeout
        const startTime = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes
        
        while (Date.now() - startTime < timeout) {
          const isLoggedIn = await this.verifyLogin();
          if (isLoggedIn) {
            console.log('✅ Login successful after captcha completion!');
            return;
          }
          await this.browser.page.waitForTimeout(2000);
        }
        
        throw new Error('Login timeout - captcha may not have been completed');
      }
      
      // Wait for login to complete
      await this.browser.page.waitForTimeout(3000);
      
      const isLoggedIn = await this.verifyLogin();
      if (isLoggedIn) {
        console.log('✅ Quora login successful!');
        await this.browser.saveAuthState();
      } else {
        throw new Error('Login verification failed');
      }
      
    } catch (error) {
      console.error('❌ Quora login failed:', error.message);
      throw error;
    }
  }

  async verifyLogin() {
    try {
      const url = this.browser.page.url();
      if (url.includes('/login')) {
        return false;
      }
      
      const feedElements = await this.browser.page.$$('div[class*="feed"], div[class*="content"], div[class*="question"]');
      const userElements = await this.browser.page.$$('div[class*="user"], div[class*="profile"], a[href*="/profile"]');
      
      return feedElements.length > 0 || userElements.length > 0;
    } catch (error) {
      return false;
    }
  }

  async addQuestion() {
    try {
      console.log('🔄 Creating new question on Quora...');
      
      // Navigate to Quora if not already there
      if (!this.browser.page.url().includes('quora.com')) {
        await this.browser.goto('https://www.quora.com');
      }
      
      // Find and click "Add question" button
      const addQuestionClicked = await this.browser.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        
        for (const button of buttons) {
          const text = button.textContent || button.innerHTML || '';
          if (text.toLowerCase().includes('add question') || text.toLowerCase().includes('ask question')) {
            try {
              button.click();
              return true;
            } catch (error) {
              button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return true;
            }
          }
        }
        
        // Check clickable divs
        const clickableDivs = document.querySelectorAll('div[onclick], div[style*="cursor: pointer"]');
        for (const div of clickableDivs) {
          const text = div.textContent || div.innerHTML || '';
          if (text.toLowerCase().includes('add question') || text.toLowerCase().includes('ask question')) {
            try {
              div.click();
              return true;
            } catch (error) {
              div.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return true;
            }
          }
        }
        
        return false;
      });
      
      if (!addQuestionClicked) {
        throw new Error('Could not find or click "Add question" button');
      }
      
      console.log('✅ Add question button clicked');
      
      // Wait for popup to appear
      let popupVisible = false;
      for (let i = 0; i < 10; i++) {
        await this.browser.page.waitForTimeout(1000);
        popupVisible = await this.browser.page.evaluate(() => {
          return document.querySelector('div[role="dialog"], div[class*="modal"], div[class*="popup"]') !== null;
        });
        if (popupVisible) break;
      }
      
      if (!popupVisible) {
        // Retry clicking the button
        await this.browser.page.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          for (const button of buttons) {
            const text = button.textContent || button.innerHTML || '';
            if (text.toLowerCase().includes('add question') || text.toLowerCase().includes('ask question')) {
              button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              break;
            }
          }
        });
        await this.browser.page.waitForTimeout(2000);
      }
      
      // Click "Add question" tab
      await this.browser.page.evaluate(() => {
        const tabs = document.querySelectorAll('button, div[role="tab"], div[class*="tab"]');
        for (const tab of tabs) {
          const text = tab.textContent || tab.innerHTML || '';
          if (text.toLowerCase().includes('add question')) {
            tab.click();
            break;
          }
        }
      });
      
      // Find question input field
      const questionInput = await this.browser.page.$('input[placeholder*="what"], input[placeholder*="How"], textarea[placeholder*="what"], textarea[placeholder*="How"]');
      if (!questionInput) {
        throw new Error('Could not find question input field');
      }
      
      // Generate and fill question
      const question = this.generateTechQuestion();
      await questionInput.fill(question);
      console.log('✅ Question filled:', question);
      
      // Click submit button
      const submitButton = await this.browser.page.$('button[type="submit"]') || 
                          await this.browser.page.$('button') ||
                          await this.browser.page.$$('button').then(buttons => {
                            for (const button of buttons) {
                              const text = button.textContent || '';
                              if (text.toLowerCase().includes('add question') || text.toLowerCase().includes('submit')) {
                                return button;
                              }
                            }
                            return null;
                          });
      if (!submitButton) {
        throw new Error('Could not find submit button');
      }
      
      await submitButton.click();
      console.log('✅ Question submitted');
      
      // Handle suggestion popup
      await this.browser.page.waitForTimeout(2000);
      const suggestionHandled = await this.browser.page.evaluate(() => {
        const xpath = "//*[contains(text(), 'Ask original question')]";
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) {
          const element = result.singleNodeValue;
          try {
            element.click();
            return true;
          } catch (error) {
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
          }
        }
        
        const elements = document.querySelectorAll('*');
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = element.innerText || element.textContent || '';
          if (text.toLowerCase().includes('ask original question')) {
            try {
              element.click();
              return true;
            } catch (error) {
              element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return true;
            }
          }
        }
        return false;
      });
      
      if (suggestionHandled) {
        console.log('✅ Suggestion popup handled');
        await this.browser.page.waitForTimeout(2000);
      }

      // Handle confirmation screen
      await this.browser.page.waitForTimeout(2000);
      const confirmationHandled = await this.browser.page.evaluate(() => {
        const xpath = "//*[contains(text(), 'Done')]";
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) {
          const element = result.singleNodeValue;
          try {
            element.click();
            return true;
          } catch (error) {
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
          }
        }
        
        const elements = document.querySelectorAll('*');
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = element.innerText || element.textContent || '';
          if (text.toLowerCase().includes('done')) {
            try {
              element.click();
              return true;
            } catch (error) {
              element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return true;
            }
          }
        }
        return false;
      });

      if (confirmationHandled) {
        console.log('✅ Confirmation screen handled');
        await this.browser.page.waitForTimeout(2000);
      }

      // Handle skip screen
      await this.browser.page.waitForTimeout(2000);
      const skipHandled = await this.browser.page.evaluate(() => {
        const xpath = "//*[contains(text(), 'Skip')]";
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) {
          const element = result.singleNodeValue;
          try {
            element.click();
            return true;
          } catch (error) {
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
          }
        }
        
        const elements = document.querySelectorAll('*');
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const text = element.innerText || element.textContent || '';
          if (text.toLowerCase().includes('skip')) {
            try {
              element.click();
              return true;
            } catch (error) {
              element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return true;
            }
          }
        }
        return false;
      });

      if (skipHandled) {
        console.log('✅ Skip screen handled');
        await this.browser.page.waitForTimeout(2000);
      }

      console.log('🎉 Question creation completed successfully!');
      
      // Check if auto-close is enabled
      const autoCloseBrowser = process.env.AUTO_CLOSE_BROWSER === 'true';
      if (autoCloseBrowser) {
        console.log('🔒 Auto-close enabled, closing browser...');
        await this.browser.close();
      } else {
        console.log('🔍 Auto-close disabled, browser will stay open for inspection.');
        console.log('Press Ctrl+C when done.');
        await new Promise(() => {}); // Keep browser open indefinitely
      }
      
    } catch (error) {
      console.error('❌ Question creation failed:', error.message);
      console.log('🔍 Browser will stay open for inspection. Press Ctrl+C when done.');
      // Keep browser open on error for manual inspection
      await new Promise(() => {});
    }
  }

  generateTechQuestion() {
    const topics = [
      'AI and machine learning',
      'Node.js development',
      'PHP programming',
      'MySQL database optimization',
      'MongoDB best practices',
      'React.js development',
      'Python automation',
      'Docker containerization',
      'AWS cloud services',
      'Git workflow strategies'
    ];
    
    const questions = [
      'What are the latest trends in {topic}?',
      'How can I improve my {topic} skills?',
      'What are the best practices for {topic}?',
      'How do you handle common challenges in {topic}?',
      'What resources would you recommend for learning {topic}?'
    ];
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    return `${randomQuestion.replace('{topic}', randomTopic)} (Generated at ${timestamp})`;
  }
}