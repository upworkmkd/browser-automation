import { BrowserHelper } from '../../helpers/browser.js';
import { AIMatcher } from '../../helpers/aiMatcher.js';

export default class QuoraProvider {
  constructor(browserHelper) {
    this.browser = browserHelper;
    this.aiMatcher = new AIMatcher();
  }

  async login() {
    try {
      console.log('🔄 Logging into Quora...');
      
      // First check if already logged in
      await this.browser.goto('https://www.quora.com');
      await this.browser.page.waitForTimeout(2000);
      
      const isAlreadyLoggedIn = await this.verifyLogin();
      if (isAlreadyLoggedIn) {
        console.log('✅ Already logged into Quora!');
        return;
      }
      
      // Not logged in, proceed with login
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
      
      // Click login button using AI for intelligent detection
      console.log('🔍 Looking for login button using AI...');
      
      // Get all potential login buttons
      const potentialLoginButtons = await this.browser.page.$$('button[type="submit"], button, input[type="submit"]');
      console.log(`Found ${potentialLoginButtons.length} potential login buttons`);
      
      if (potentialLoginButtons.length === 0) {
        throw new Error('No login buttons found on the page');
      }
      
      // Use AI to find the correct login button
      const loginButtonMatch = await this.aiMatcher.findBestMatch(
        "Find the main login button to submit the Quora login form. This should be a button that submits the login credentials, not a button that opens forms or performs other actions. Look for buttons with text like 'Log in', 'Sign in', 'Login', or similar authentication actions.",
        potentialLoginButtons,
        this.browser
      );
      
      console.log(`✅ AI found best login button match: ${loginButtonMatch.explanation}`);
      
      const loginButton = loginButtonMatch.element;
      
      console.log('✅ Login button found, clicking...');
      await loginButton.click();
      console.log('✅ Login button clicked');
      
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
      console.log('🔍 Looking for "Add question" button using AI...');
      
      // Get all potential add question buttons
      const potentialAddQuestionButtons = await this.browser.page.$$('button, [role="button"], div[onclick], div[style*="cursor: pointer"]');
      console.log(`Found ${potentialAddQuestionButtons.length} potential add question buttons`);
      
      if (potentialAddQuestionButtons.length === 0) {
        throw new Error('No add question buttons found on the page');
      }
      
      // Use AI to find the correct add question button
      const addQuestionButtonMatch = await this.aiMatcher.findBestMatch(
        "Find the main button to add or create a new question on Quora. This should be a button that opens the question creation form, not a button for other actions. Look for buttons with text like 'Add question', 'Ask question', 'Create question', or similar question creation actions.",
        potentialAddQuestionButtons,
        this.browser
      );
      
      console.log(`✅ AI found best add question button match: ${addQuestionButtonMatch.explanation}`);
      
      const addQuestionButton = addQuestionButtonMatch.element;
      
      // Click the button with fallback to dispatchEvent if needed
      try {
        await addQuestionButton.click();
        console.log('✅ Add question button clicked successfully');
      } catch (error) {
        console.log('⚠️  Direct click failed, trying dispatchEvent...');
        await addQuestionButton.evaluate(element => {
          element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        console.log('✅ Add question button clicked via dispatchEvent');
      }
      
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
      console.log('🔍 Looking for question submit button using AI...');
      
      // Get all potential submit buttons
      const potentialSubmitButtons = await this.browser.page.$$('button, input[type="submit"]');
      console.log(`Found ${potentialSubmitButtons.length} potential submit buttons`);
      
      if (potentialSubmitButtons.length === 0) {
        throw new Error('No submit buttons found on the page');
      }
      
      // Use AI to find the correct submit button
      const submitButtonMatch = await this.aiMatcher.findBestMatch(
        "We just filled in a question text in a textarea/input field. Now we need to find the button that will actually submit/post that question to Quora. This should be a button that completes the question creation process, not a button for other actions. Look for buttons with text like 'Add question', 'Submit', 'Post question', 'Ask question', or similar submission actions. The button should be the final step to publish the question we just wrote.",
        potentialSubmitButtons,
        this.browser
      );
      
      console.log(`✅ AI found best submit button match: ${submitButtonMatch.explanation}`);
      
      const submitButton = submitButtonMatch.element;
      
      console.log('✅ Submit button found, clicking...');
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

  async createPost() {
    try {
      console.log('🔄 Creating new post on Quora...');
      
      // Navigate to Quora if not already there
      if (!this.browser.page.url().includes('quora.com')) {
        await this.browser.goto('https://www.quora.com');
      }
      
      // Find and click "Add question" button (same as question creation)
      console.log('🔍 Looking for "Add question" button using AI...');
      
      // Get all potential add question buttons
      const potentialAddQuestionButtons = await this.browser.page.$$('button, [role="button"], div[onclick], div[style*="cursor: pointer"]');
      console.log(`Found ${potentialAddQuestionButtons.length} potential add question buttons`);
      
      if (potentialAddQuestionButtons.length === 0) {
        throw new Error('No add question buttons found on the page');
      }
      
      // Use AI to find the correct add question button
      const addQuestionButtonMatch = await this.aiMatcher.findBestMatch(
        "Find the main button to add or create a new question on Quora. This should be a button that opens the question creation form, not a button for other actions. Look for buttons with text like 'Add question', 'Ask question', 'Create question', or similar question creation actions.",
        potentialAddQuestionButtons,
        this.browser
      );
      
      console.log(`✅ AI found best add question button match: ${addQuestionButtonMatch.explanation}`);
      
      const addQuestionButton = addQuestionButtonMatch.element;
      
      // Click the button with fallback to dispatchEvent if needed
      try {
        await addQuestionButton.click();
        console.log('✅ Add question button clicked successfully');
      } catch (error) {
        console.log('⚠️  Direct click failed, trying dispatchEvent...');
        await addQuestionButton.evaluate(element => {
          element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        console.log('✅ Add question button clicked via dispatchEvent');
      }
      
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
      
      // Click "Create post" tab instead of "Add question" tab
      console.log('🔍 Looking for "Create post" tab...');
      await this.browser.page.evaluate(() => {
        const tabs = document.querySelectorAll('button, div[role="tab"], div[class*="tab"]');
        for (const tab of tabs) {
          const text = tab.textContent || tab.innerHTML || '';
          if (text.toLowerCase().includes('create post') || text.toLowerCase().includes('post')) {
            tab.click();
            break;
          }
        }
      });
      
      // Wait for post input field to appear
      await this.browser.page.waitForTimeout(2000);
      
      // Find post input field using AI
      console.log('🔍 Looking for post input field using AI...');
      const potentialPostInputs = await this.browser.page.$$('div[contenteditable="true"], textarea, input[type="text"]');
      console.log(`Found ${potentialPostInputs.length} potential post input fields`);
      
      if (potentialPostInputs.length === 0) {
        throw new Error('No post input fields found on the page');
      }
      
      // Use AI to find the correct post input field
      const postInputMatch = await this.aiMatcher.findBestMatch(
        "Find the main text input field where users type their Quora posts. Look for elements with placeholders like 'say something...' or similar post creation text. This should be a contenteditable div or textarea where users write their post content.",
        potentialPostInputs,
        this.browser
      );
      
      console.log(`✅ AI found best post input field match: ${postInputMatch.explanation}`);
      
      const postInput = postInputMatch.element;
      
      // Generate and fill post content
      const postContent = this.generateTechPost();
      await postInput.fill(postContent);
      console.log('✅ Post content filled');
      
      // Click Post button using AI
      console.log('🔍 Looking for post submit button using AI...');
      const potentialPostSubmitButtons = await this.browser.page.$$('button, input[type="submit"]');
      console.log(`Found ${potentialPostSubmitButtons.length} potential post submit buttons`);
      
      if (potentialPostSubmitButtons.length === 0) {
        throw new Error('No post submit buttons found on the page');
      }
      
      // Use AI to find the correct post submit button
      const postSubmitButtonMatch = await this.aiMatcher.findBestMatch(
        "We just filled in a post text. Now we need to find the button that will actually submit/post that content to Quora. This should be a button that completes the post creation process. Look for buttons with text like 'Post', 'Submit', 'Publish', or similar submission actions.",
        potentialPostSubmitButtons,
        this.browser
      );
      
      console.log(`✅ AI found best post submit button match: ${postSubmitButtonMatch.explanation}`);
      
      const postSubmitButton = postSubmitButtonMatch.element;
      
      console.log('✅ Post submit button found, clicking...');
      await postSubmitButton.click();
      console.log('✅ Post submitted successfully!');
      
      // Wait for post to be processed
      await this.browser.page.waitForTimeout(3000);
      
      console.log('🎉 Post creation completed successfully!');
      
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
      console.error('❌ Post creation failed:', error.message);
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

  generateTechPost() {
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
    
    const postTemplates = [
      `# The Future of {topic}: A Comprehensive Guide

As technology continues to evolve at an unprecedented pace, {topic} has emerged as one of the most critical areas for developers and businesses alike. In this post, I'll share my insights on the current state, emerging trends, and practical strategies for success.

## Current State of {topic}

The landscape of {topic} has changed dramatically over the past few years. What was once considered cutting-edge is now becoming standard practice, and new innovations are constantly reshaping how we approach development and implementation.

## Key Trends to Watch

1. **Automation and AI Integration**: The integration of artificial intelligence is revolutionizing how we approach {topic}
2. **Cloud-Native Solutions**: More organizations are moving towards cloud-first strategies
3. **Security-First Approach**: With increasing cyber threats, security is no longer an afterthought

## Practical Implementation Strategies

When implementing {topic} solutions, it's crucial to start with a solid foundation. Begin by understanding your specific use case, then build incrementally while maintaining flexibility for future changes.

## My Experience and Recommendations

Based on my work with various {topic} projects, I've found that success often comes down to three key factors: proper planning, iterative development, and continuous learning. Don't be afraid to experiment and learn from failures.

What are your thoughts on the current state of {topic}? Have you encountered any specific challenges or breakthroughs in your projects? I'd love to hear about your experiences and discuss potential solutions.

#TechInnovation #Development #Innovation #FutureOfTech

Generated at {timestamp}`,
      
      `# Mastering {topic}: Lessons from the Field

After working extensively with {topic} across multiple projects, I've gathered some valuable insights that I believe could help others navigate this complex landscape. Let me share what I've learned and what I wish I knew when I started.

## The Learning Curve

{title} can be intimidating at first, especially given the rapid pace of change in the industry. However, I've found that breaking it down into manageable components makes the journey much more approachable.

## Common Pitfalls to Avoid

1. **Over-engineering**: It's easy to get carried away with complex solutions when simpler approaches would work better
2. **Ignoring Documentation**: Good documentation practices save countless hours in the long run
3. **Not Testing Early**: Implementing testing from the start prevents major issues down the line

## Success Strategies

The most successful {topic} implementations I've seen follow a consistent pattern: they start small, iterate quickly, and maintain a strong focus on user needs. It's not about using the latest technology for its own sake.

## Tools and Resources

I've compiled a list of essential tools and resources that have been invaluable in my {topic} journey. From development environments to testing frameworks, having the right tools can make all the difference.

## Looking Ahead

The future of {topic} is incredibly exciting. We're seeing new frameworks, tools, and methodologies emerge that promise to make development faster, more reliable, and more accessible than ever before.

What challenges have you faced with {topic}? What strategies have worked well for you? I'm always eager to learn from the community and share knowledge.

#TechCommunity #Learning #Development #Innovation

Generated at {timestamp}`
    ];
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const randomTemplate = postTemplates[Math.floor(Math.random() * postTemplates.length)];
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    return randomTemplate.replace(/{topic}/g, randomTopic).replace(/{timestamp}/g, timestamp);
  }
}