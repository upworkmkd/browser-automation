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
      
      // Generate unique content with timestamp and random elements
      const topics = [
        'AI and Machine Learning',
        'Web Automation',
        'Browser Testing',
        'DevOps Practices',
        'Software Architecture',
        'Cloud Computing',
        'API Design',
        'Performance Optimization'
      ];

      const insights = [
        'Reducing manual testing time by 80%',
        'Improving reliability with semantic matching',
        'Enhancing user experience through automation',
        'Streamlining deployment workflows',
        'Building scalable solutions',
        'Optimizing resource utilization',
        'Implementing best practices'
      ];

      const challenges = [
        'handling dynamic web content',
        'managing state across sessions',
        'ensuring cross-browser compatibility',
        'maintaining test stability',
        'scaling automated solutions',
        'optimizing performance',
        'reducing false positives'
      ];

      const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];
      const timestamp = new Date().toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: 'numeric',
        hour12: true 
      });

      const technicalContent = `🚀 ${randomElement(topics)} Update - ${timestamp}

Just tackled an interesting challenge in ${randomElement(topics).toLowerCase()}, focusing on ${randomElement(challenges)}!

Key Achievement: ${randomElement(insights)}

Technical Deep Dive:
• Implemented advanced ${randomElement(topics).toLowerCase()} patterns
• Leveraged modern async/await for better flow control
• Enhanced error handling with contextual recovery
• Added intelligent retry mechanisms
• Optimized resource management

Current Stack:
- Node.js with ES Modules
- Playwright for reliable automation
- OpenAI GPT for semantic understanding
- Custom middleware for session management

Learning: The key to robust automation is understanding the balance between speed and reliability.

What are your thoughts on ${randomElement(topics).toLowerCase()}? Share your experiences! 🤔

#${randomElement(topics).replace(/\s+/g, '')} #TechInnovation #SoftwareEngineering #${new Date().getFullYear()}Trends`;

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
