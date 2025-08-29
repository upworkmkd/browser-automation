import { browserHelper } from './helpers/browser.js';
import { linkedInLogin } from './actions/login.js';
import { createPost } from './actions/createPost.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const instruction = process.argv[2];
  if (!instruction) {
    console.error('Please provide an instruction as a command line argument');
    process.exit(1);
  }

  try {
    // Initialize browser
    await browserHelper.init();

    // Parse instruction and execute appropriate action
    if (instruction.toLowerCase().includes('linkedin') && instruction.toLowerCase().includes('login')) {
      await linkedInLogin.execute();
    } else if (instruction.toLowerCase().includes('post')) {
      // First ensure we're logged in
      await linkedInLogin.execute();
      
      // Generate some technical content for the post
      const technicalContent = `🚀 Tech Insight of the Day:

Just implemented a fascinating AI-powered browser automation solution using Playwright and OpenAI! 

Key features:
• Semantic element matching using LLMs
• Context-aware automation
• Session persistence for auth
• Robust error handling

Tech stack:
- Node.js
- Playwright
- OpenAI GPT
- Modern async/await patterns

What's next? Exploring ways to make web automation more intelligent and maintainable. 

#TechInnovation #AI #Automation #WebDevelopment #JavaScript`;

      // Create the post
      await createPost.execute(technicalContent);
    } else {
      console.error('Unsupported instruction:', instruction);
    }
  } catch (error) {
    console.error('Error executing instruction:', error);
  } finally {
    await browserHelper.close();
  }
}

main();
