import { browserHelper } from '../helpers/browser.js';
import { aiMatcher } from '../helpers/aiMatcher.js';

export class CreatePost {
  constructor() {
    this.browser = browserHelper;
    this.matcher = aiMatcher;
  }

  async execute(postContent) {
    try {
      console.log('Looking for "Start a post" button...');
      // Find and click "Start a post" button
      const startPostElements = await this.browser.page.$$('button, div[role="button"]');
      const startPostMatch = await this.matcher.findBestMatch(
        "Find the button or element that says Start a post",
        startPostElements,
        this.browser
      );
      console.log('Start a post button found:', startPostMatch.explanation);
      await startPostMatch.element.click();

      // Wait for the post modal to appear
      await this.browser.page.waitForTimeout(2000); // Give modal time to fully open

      console.log('Looking for post text area...');
      // Find the post text area by its placeholder
      const textAreas = await this.browser.page.$$('div[role="textbox"], textarea');
      const postTextAreaMatch = await this.matcher.findBestMatch(
        "Find the text area with placeholder 'What do you want to talk about?'",
        textAreas,
        this.browser
      );
      console.log('Post text area found:', postTextAreaMatch.explanation);

      // Type the post content
      await postTextAreaMatch.element.click();
      await postTextAreaMatch.element.fill(postContent);

      console.log('Looking for Post button...');
      // Find and click the Post button
      const postButtons = await this.browser.page.$$('button');
      const postButtonMatch = await this.matcher.findBestMatch(
        "Find the button that says Post to submit the content",
        postButtons,
        this.browser
      );
      console.log('Post button found:', postButtonMatch.explanation);
      await postButtonMatch.element.click();

      // Wait for post to be published
      await this.browser.page.waitForTimeout(3000);
      console.log('Post published successfully');
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }
}

export const createPost = new CreatePost();
