import { BrowserHelper } from '../../helpers/browser.js';

export default class LinkedInProvider {
  constructor(browserHelper) {
    this.browser = browserHelper;
  }

  async login() {
    try {
      console.log('🔄 Logging into LinkedIn...');
      
      // Check if already logged in
      await this.browser.goto('https://www.linkedin.com');
      await this.browser.page.waitForTimeout(2000);
      
      const isLoggedIn = await this.browser.page.evaluate(() => {
        return !document.querySelector('a[href*="/login"]') && 
               (document.querySelector('nav') || document.querySelector('header'));
      });
      
      if (isLoggedIn) {
        console.log('✅ Already logged into LinkedIn');
        return;
      }
      
      // Click "Sign in with email" button on homepage
      console.log('🔍 Looking for sign in button...');
      
      // First try to find any button with sign in text
      const signInButton = await this.browser.page.$$('button, a').then(async elements => {
        console.log(`Found ${elements.length} potential elements`);
        for (const element of elements) {
          const text = await element.textContent();
          console.log(`Element text: "${text}"`);
          if (text.toLowerCase().includes('sign in') || text.toLowerCase().includes('log in')) {
            console.log(`✅ Found sign in button: "${text}"`);
            return element;
          }
        }
        return null;
      });
      
      if (signInButton) {
        console.log('✅ Sign in button found, clicking...');
        await signInButton.click();
        await this.browser.page.waitForTimeout(2000);
      } else {
        console.log('⚠️  Sign in button not found, trying to proceed to login page directly...');
        // Try to go directly to login page if button not found
        await this.browser.goto('https://www.linkedin.com/login');
        await this.browser.page.waitForTimeout(2000);
      }
      
      // Fill email field
      console.log('🔍 Looking for email field...');
      const emailField = await this.browser.page.$('input[type="email"], input[name="session_key"], input[placeholder*="email"], input[placeholder*="Email"]');
      if (!emailField) {
        console.log('❌ Email field not found, checking page content...');
        console.log('Page title:', await this.browser.page.title());
        console.log('Current URL:', this.browser.page.url());
        throw new Error('Email field not found');
      }
      
      console.log('✅ Email field found');
      const email = process.env.LINKEDIN_USERNAME;
      if (!email) {
        throw new Error('LINKEDIN_USERNAME must be set in .env file');
      }
      
      // Check if email is pre-filled
      const currentValue = await emailField.inputValue();
      if (!currentValue) {
        console.log('📝 Filling email field...');
        await emailField.fill(email);
        console.log('✅ Email filled');
      } else {
        console.log('ℹ️  Email field already has value');
      }
      
      // Fill password field
      console.log('🔍 Looking for password field...');
      const passwordField = await this.browser.page.$('input[type="password"], input[name="session_password"]');
      if (!passwordField) {
        console.log('❌ Password field not found');
        throw new Error('Password field not found');
      }
      
      console.log('✅ Password field found');
      const password = process.env.LINKEDIN_PASSWORD;
      if (!password) {
        throw new Error('LINKEDIN_PASSWORD must be set in .env file');
      }
      
      console.log('📝 Filling password field...');
      await passwordField.fill(password);
      console.log('✅ Password filled');
      
      // Click sign in button
      console.log('🔍 Looking for sign in submit button...');
      const signInSubmitButton = await this.browser.page.$('button[type="submit"]') ||
                                await this.browser.page.$$('button').then(async buttons => {
                                  console.log(`Found ${buttons.length} buttons`);
                                  for (const button of buttons) {
                                    const text = await button.textContent();
                                    console.log(`Button text: "${text}"`);
                                    if (text.toLowerCase().includes('sign in') || text.toLowerCase().includes('log in')) {
                                      console.log(`✅ Found submit button: "${text}"`);
                                      return button;
                                    }
                                  }
                                  return null;
                                });
      if (!signInSubmitButton) {
        console.log('❌ Sign in submit button not found');
        throw new Error('Sign in button not found');
      }
      
      console.log('✅ Sign in submit button found, clicking...');
      await signInSubmitButton.click();
      
      // Wait for login to complete
      await this.browser.page.waitForTimeout(3000);
      
      // Check if login was successful
      const loginSuccessful = await this.browser.page.evaluate(() => {
        return !document.querySelector('input[type="password"]') && 
               (document.querySelector('nav') || document.querySelector('header'));
      });
      
      if (loginSuccessful) {
        console.log('✅ LinkedIn login successful!');
        await this.browser.saveAuthState();
      } else {
        console.log('⚠️  Login may require 2FA/verification. Please complete manually if needed.');
        await this.browser.page.waitForTimeout(5000);
        
        // Final check
        const finalCheck = await this.browser.page.evaluate(() => {
          return !document.querySelector('input[type="password"]') && 
                 (document.querySelector('nav') || document.querySelector('header'));
        });
        
        if (finalCheck) {
          console.log('✅ LinkedIn login completed after verification!');
          await this.browser.saveAuthState();
        } else {
          throw new Error('Login verification failed');
        }
      }
      
    } catch (error) {
      console.error('❌ LinkedIn login failed:', error.message);
      throw error;
    }
  }

  async createPost() {
    try {
      console.log('🔄 Creating new post on LinkedIn...');
      
      // Navigate to LinkedIn if not already there
      if (!this.browser.page.url().includes('linkedin.com')) {
        await this.browser.goto('https://www.linkedin.com');
        await this.browser.page.waitForTimeout(2000);
      }
      
      // Find and click "Start a post" button
      console.log('🔍 Looking for "Start a post" button...');
      
      // Wait for the page to be fully loaded
      await this.browser.page.waitForTimeout(2000);
      
      // Try multiple strategies to find the start post button
      let startPostButton = null;
      
      // Strategy 1: Look for button with specific text
      startPostButton = await this.browser.page.$$('button').then(async buttons => {
        for (const button of buttons) {
          const text = await button.textContent();
          if (text && (text.toLowerCase().includes('start a post') || 
                       text.toLowerCase().includes('create a post') ||
                       text.toLowerCase().includes('post') && text.toLowerCase().includes('start'))) {
            console.log(`✅ Found start post button: "${text}"`);
            return button;
          }
        }
        return null;
      });
      
      // Strategy 2: Look for div with start post text
      if (!startPostButton) {
        startPostButton = await this.browser.page.$$('div[role="button"], div[class*="button"], div[class*="post"]').then(async divs => {
          for (const div of divs) {
            const text = await div.textContent();
            if (text && (text.toLowerCase().includes('start a post') || 
                         text.toLowerCase().includes('create a post') ||
                         text.toLowerCase().includes('post') && text.toLowerCase().includes('start'))) {
              console.log(`✅ Found start post div: "${text}"`);
              return div;
            }
          }
          return null;
        });
      }
      
      // Strategy 3: Look for any element with start post text
      if (!startPostButton) {
        startPostButton = await this.browser.page.$$('*').then(async elements => {
          for (const element of elements) {
            try {
              const text = await element.textContent();
              if (text && (text.toLowerCase().includes('start a post') || 
                           text.toLowerCase().includes('create a post'))) {
                console.log(`✅ Found start post element: "${text}" (${element.tagName})`);
                return element;
              }
            } catch (error) {
              // Skip elements that can't be read
              continue;
            }
          }
          return null;
        });
      }
      
      if (!startPostButton) {
        console.log('❌ Could not find "Start a post" button');
        console.log('Current page elements:');
        const buttons = await this.browser.page.$$('button');
        for (let i = 0; i < Math.min(buttons.length, 10); i++) {
          const text = await buttons[i].textContent();
          console.log(`Button ${i}: "${text}"`);
        }
        throw new Error('Could not find "Start a post" button');
      }
      
      console.log('✅ Start post button found, clicking...');
      await startPostButton.click();
      console.log('✅ Start post button clicked');
      
      // Wait for post modal to appear
      console.log('🔍 Waiting for post modal to appear...');
      await this.browser.page.waitForSelector('div[role="dialog"], div[class*="modal"], div[class*="popup"]', { timeout: 10000 });
      console.log('✅ Post modal appeared');
      
      // Find and fill the post textarea
      console.log('🔍 Looking for post textarea...');
      
      // Wait a bit more for the textarea to be fully rendered
      await this.browser.page.waitForTimeout(1000);
      
      // Look for the specific LinkedIn post textarea div
      const postTextarea = await this.browser.page.$('div.ql-editor.ql-blank[contenteditable="true"], div[class*="ql-editor"][contenteditable="true"]') ||
                          await this.browser.page.$('div[contenteditable="true"][data-placeholder*="what"], div[contenteditable="true"][aria-placeholder*="what"]') ||
                          await this.browser.page.$$('div[contenteditable="true"]').then(async elements => {
                            for (const element of elements) {
                              const placeholder = await element.getAttribute('data-placeholder') || await element.getAttribute('aria-placeholder') || '';
                              const className = await element.getAttribute('class') || '';
                              const role = await element.getAttribute('role') || '';
                              console.log(`Found element: class="${className}", placeholder="${placeholder}", role="${role}"`);
                              
                              if (className.includes('ql-editor') || 
                                  placeholder.toLowerCase().includes('what') || 
                                  placeholder.toLowerCase().includes('talk') ||
                                  role === 'textbox') {
                                console.log(`✅ Found post textarea: class="${className}", placeholder="${placeholder}", role="${role}"`);
                                return element;
                              }
                            }
                            return null;
                          });
      
      if (!postTextarea) {
        console.log('❌ Could not find post textarea');
        console.log('Available contenteditable elements:');
        const contentEditableElements = await this.browser.page.$$('div[contenteditable="true"]');
        for (let i = 0; i < contentEditableElements.length; i++) {
          const element = contentEditableElements[i];
          const className = await element.getAttribute('class') || '';
          const placeholder = await element.getAttribute('data-placeholder') || await element.getAttribute('aria-placeholder') || '';
          const role = await element.getAttribute('role') || '';
          console.log(`Element ${i}: class="${className}", placeholder="${placeholder}", role="${role}"`);
        }
        throw new Error('Could not find post textarea');
      }
      
      console.log('✅ Post textarea found');
      const postContent = this.generatePostContent();
      
      // Clear the existing content first
      await postTextarea.click();
      await this.browser.page.keyboard.press('Control+a');
      await this.browser.page.keyboard.press('Delete');
      
      // Fill the content
      await postTextarea.fill(postContent);
      console.log('✅ Post content filled');
      
      // Click Post button
      const postButton = await this.browser.page.$('button[type="submit"]') ||
                        await this.browser.page.$$('button').then(async buttons => {
                          for (const button of buttons) {
                            const text = await button.textContent();
                            if (text.toLowerCase().includes('post')) {
                              return button;
                            }
                          }
                          return null;
                        });
      if (!postButton) {
        throw new Error('Could not find Post button');
      }
      
      await postButton.click();
      console.log('✅ Post submitted successfully!');
      
      // Wait for post to be processed
      await this.browser.page.waitForTimeout(3000);
      
    } catch (error) {
      console.error('❌ Post creation failed:', error.message);
      throw error;
    }
  }

  generatePostContent() {
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
    
    const insights = [
      'One key insight I\'ve learned about {topic} is the importance of understanding the fundamentals before diving into advanced features.',
      'When working with {topic}, I always prioritize code readability and maintainability over clever optimizations.',
      'The most challenging aspect of {topic} is often not the technical implementation, but designing the right architecture.',
      'I\'ve found that the best approach to learning {topic} is through hands-on projects rather than just reading documentation.',
      'In {topic}, the difference between good and great code often lies in attention to error handling and edge cases.'
    ];
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomInsight = insights[Math.floor(Math.random() * insights.length)];
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    return `${randomInsight.replace('{topic}', randomTopic)}\n\n#${randomTopic.replace(/\s+/g, '')} #Programming #Tech #Development\n\nGenerated at ${timestamp}`;
  }
}
