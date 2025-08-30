import 'dotenv/config';
import { BrowserHelper } from './helpers/browser.js';
import LinkedInProvider from './providers/linkedin/index.js';
import QuoraProvider from './providers/quora/index.js';
import ContentGenerator from './services/contentGenerator.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const platforms = [];
  
  if (args.includes('--linkedin')) platforms.push('linkedin');
  if (args.includes('--quora')) platforms.push('quora');
  if (args.includes('--reddit')) platforms.push('reddit');
  if (args.includes('--facebook')) platforms.push('facebook');
  
  if (platforms.length === 0) {
    console.log('🚀 Browser Automation Service');
    console.log('Usage: npm start -- --linkedin --quora --reddit --facebook');
    console.log('Or: node index.js --linkedin --quora');
    console.log('\nAvailable platforms: linkedin, quora, reddit, facebook');
    process.exit(0);
  }
  
  return platforms;
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
    const platforms = parseArgs();
    console.log(`📋 Platforms to process: ${platforms.join(', ')}`);
    
    // Process platforms sequentially
    for (const platform of platforms) {
      try {
        await postToPlatform(platform, browserHelper);
        results.push({ platform, status: 'success' });
      } catch (error) {
        console.error(`❌ Failed to process ${platform}:`, error.message);
        results.push({ platform, status: 'failed', error: error.message });
      }
    }
    
    // Summary
    console.log('\n📊 Automation Summary:');
    results.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${result.platform.toUpperCase()}: ${result.status}`);
    });
    
    const allSuccess = results.every(r => r.status === 'success');
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
