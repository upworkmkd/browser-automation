import 'dotenv/config';
import { BrowserHelper } from './helpers/browser.js';
import LinkedInProvider from './providers/linkedin/index.js';
import QuoraProvider from './providers/quora/index.js';
import ContentGenerator from './services/contentGenerator.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const platforms = [];
  let quoraAction = 'question'; // Default to question creation
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--linkedin') {
      platforms.push('linkedin');
    } else if (arg === '--quora') {
      platforms.push('quora');
      // Check if next argument specifies the action
      if (i + 1 < args.length && args[i + 1] === '--question') {
        quoraAction = 'question';
        i++; // Skip the next argument
      } else if (i + 1 < args.length && args[i + 1] === '--post') {
        quoraAction = 'post';
        i++; // Skip the next argument
      }
    } else if (arg === '--reddit') {
      platforms.push('reddit');
    } else if (arg === '--facebook') {
      platforms.push('facebook');
    }
  }
  
  if (platforms.length === 0) {
    console.log('🚀 Browser Automation Service');
    console.log('Usage: npm start -- --linkedin --quora --reddit --facebook');
    console.log('Or: node index.js --linkedin --quora');
    console.log('For Quora: npm start -- --quora --question (default) or npm start -- --quora --post');
    console.log('\nAvailable platforms: linkedin, quora, reddit, facebook');
    process.exit(0);
  }
  
  return { platforms, quoraAction };
}

async function postToPlatform(platform, browserHelper) {
  try {
    console.log(`\n📱 Processing ${platform.toUpperCase()}...`);
    
    let provider;
    switch (platform) {
      case 'linkedin':
        provider = new LinkedInProvider(browserHelper);
        await provider.login();
        await provider.createPost();
        break;
      case 'quora':
        provider = new QuoraProvider(browserHelper);
        await provider.login();
        await provider.addQuestion();
        break;
      case 'reddit':
        console.log('⚠️  Reddit automation not yet implemented');
        break;
      case 'facebook':
        console.log('⚠️  Facebook automation not yet implemented');
        break;
      default:
        console.log(`⚠️  Unknown platform: ${platform}`);
    }
    
    console.log(`✅ ${platform.toUpperCase()} completed successfully!`);
    
  } catch (error) {
    console.error(`❌ ${platform.toUpperCase()} failed:`, error.message);
    throw error;
  }
}

async function main() {
  let browserHelper;
  let results = [];
  
  try {
    console.log('🚀 Starting Browser Automation Service...');
    
    // Initialize browser
    browserHelper = new BrowserHelper();
    await browserHelper.init();
    
    // Parse command line arguments
    const { platforms, quoraAction } = parseArgs();
    console.log(`📋 Platforms to process: ${platforms.join(', ')}`);
    if (platforms.includes('quora')) {
      console.log(`📝 Quora action: ${quoraAction}`);
    }
    
    // Process platforms sequentially
    for (const platform of platforms) {
      try {
        if (platform === 'quora') {
          console.log('📱 Processing QUORA...');
          const quoraProvider = new QuoraProvider(browserHelper);
          
          // Login first
          await quoraProvider.login();
          
          // Check if we should create a question or post
          if (quoraAction === 'post') {
            await quoraProvider.createPost();
          } else {
            // Default to question creation (existing functionality)
            await quoraProvider.addQuestion();
          }
          
          results.push({ platform: 'quora', success: true });
        } else {
          await postToPlatform(platform, browserHelper);
          results.push({ platform, status: 'success' });
        }
      } catch (error) {
        console.error(`❌ Failed to process ${platform}:`, error.message);
        results.push({ platform, status: 'failed', error: error.message });
      }
    }
    
    // Summary
    console.log('\n📊 Automation Summary:');
    results.forEach(result => {
      if (result.platform === 'quora') {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.platform.toUpperCase()}: ${result.success ? 'success' : 'failed'}`);
      } else {
        const status = result.status === 'success' ? '✅' : '❌';
        console.log(`${status} ${result.platform.toUpperCase()}: ${result.status}`);
      }
    });
    
    const allSuccess = results.every(r => r.success || r.status === 'success');
    if (allSuccess) {
      console.log('\n🎉 All platforms completed successfully!');
      
      // Check if auto-close is enabled
      const autoCloseBrowser = process.env.AUTO_CLOSE_BROWSER === 'true';
      if (autoCloseBrowser) {
        console.log('🔒 Auto-close enabled, closing browser...');
        await browserHelper.close();
      } else {
        console.log('🔍 Auto-close disabled, browser will stay open for inspection.');
        console.log('Press Ctrl+C when done.');
        await new Promise(() => {}); // Keep browser open indefinitely
      }
    } else {
      console.log('\n⚠️  Some platforms failed. Browser will stay open for inspection.');
      console.log('Press Ctrl+C when done.');
      await new Promise(() => {}); // Keep browser open indefinitely
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('\n🔍 Browser will stay open for inspection.');
    console.log('Press Ctrl+C when done.');
    await new Promise(() => {}); // Keep browser open indefinitely
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
