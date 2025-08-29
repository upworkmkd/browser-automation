import { browserHelper } from '../helpers/browser.js';
import { aiMatcher } from '../helpers/aiMatcher.js';
import dotenv from 'dotenv';

dotenv.config();

export class LinkedInLogin {
  constructor() {
    this.browser = browserHelper;
    this.matcher = aiMatcher;
  }

  async execute() {
    try {
      // Start at LinkedIn homepage
      console.log('Navigating to LinkedIn homepage...');
      await this.browser.goto('https://www.linkedin.com');
      
      // Wait for key elements to be present
      console.log('Waiting for page to be ready...');
      await Promise.race([
        this.browser.page.waitForSelector('button', { timeout: 10000 }),
        this.browser.page.waitForSelector('a[href*="login"]', { timeout: 10000 }),
        this.browser.page.waitForSelector('a[href*="sign-in"]', { timeout: 10000 })
      ]).catch(() => {
        console.log('Timeout waiting for initial elements, will try to continue...');
      });

      // Check if we're already logged in
      const currentUrl = this.browser.page.url();
      if (currentUrl.includes('feed') || currentUrl.includes('mynetwork')) {
        console.log('Already logged in via stored session');
        return;
      }

      // Find and click "Sign in with email" button on homepage
      console.log('Looking for Sign in with email button...');
      const homePageButtons = await this.browser.page.$$('button, a');
      const signInWithEmailMatch = await this.matcher.findBestMatch(
        "Find the button or link that says Sign in with email",
        homePageButtons,
        this.browser
      );
      console.log('Sign in with email button found:', signInWithEmailMatch.explanation);
      await signInWithEmailMatch.element.click();
      await this.browser.waitForNavigation();

      // On the login page, check if email field is already filled
      console.log('Checking email field...');
      const emailElements = await this.browser.page.$$('input');
      const emailMatch = await this.matcher.findBestMatch(
        "Find the email or phone input field",
        emailElements,
        this.browser
      );
      console.log('Email field found:', emailMatch.explanation);
      
      // Get current value of email field
      const currentEmail = await emailMatch.element.inputValue();
      if (!currentEmail) {
        console.log('Email field empty, filling with provided email...');
        await emailMatch.element.fill(process.env.LINKEDIN_USERNAME);
      } else {
        console.log('Email field already filled with:', currentEmail);
      }

      // Find and fill password field
      console.log('Looking for password field...');
      const passwordElements = await this.browser.page.$$('input[type="password"]');
      const passwordMatch = await this.matcher.findBestMatch(
        "Find the password input field",
        passwordElements,
        this.browser
      );
      console.log('Password field found:', passwordMatch.explanation);
      await passwordMatch.element.fill(process.env.LINKEDIN_PASSWORD);

      // Find and click sign in button
      console.log('Looking for sign in button...');
      const buttonElements = await this.browser.page.$$('button');
      const signInMatch = await this.matcher.findBestMatch(
        "Find the main sign in button to submit the form",
        buttonElements,
        this.browser
      );
      console.log('Sign in button found:', signInMatch.explanation);
      await signInMatch.element.click();

      // Wait for navigation and handle potential verification
      await this.browser.waitForNavigation();
      
      // Check current URL to determine state
      const postLoginUrl = this.browser.page.url();
      
      if (postLoginUrl.includes('feed') || postLoginUrl.includes('mynetwork')) {
        console.log('Successfully logged in to LinkedIn');
        // Save authenticated session
        await this.browser.saveAuthState();
      } else if (postLoginUrl.includes('checkpoint') || postLoginUrl.includes('verification')) {
        console.log('Verification required. Session will be saved after manual verification.');
        
        // Wait for manual verification (user needs to enter code)
        console.log('Please complete the verification step manually...');
        
        // Wait for redirect to feed or mynetwork (successful verification)
        await this.browser.page.waitForURL(url => url.includes('feed') || url.includes('mynetwork'), {
          timeout: 300000 // 5 minute timeout for manual verification
        });
        
        console.log('Verification completed successfully');
        // Save authenticated session after verification
        await this.browser.saveAuthState();
      } else {
        console.log('Warning: Login might not have been successful. Current URL:', postLoginUrl);
      }
    } catch (error) {
      console.error('Error during LinkedIn login:', error);
      throw error;
    }
  }
}

export const linkedInLogin = new LinkedInLogin();
