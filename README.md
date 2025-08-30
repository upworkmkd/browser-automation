# Browser Automation Service

A Node.js-based browser automation service that can post content to multiple social media platforms using Playwright and AI-powered semantic element matching.

## 🚀 Features

- **Multi-Platform Support**: LinkedIn, Quora, Reddit, Facebook (LinkedIn and Quora fully implemented)
- **AI-Powered Element Matching**: Uses OpenAI GPT API for intelligent element selection
- **Session Persistence**: Saves login sessions to avoid repeated authentication
- **Modular Architecture**: Easy to add new platforms and features
- **Robust Error Handling**: Comprehensive error handling with browser inspection on failure
- **Dynamic Content Generation**: Creates unique, timestamped content for each post

## 📋 Requirements

- **Node.js**: Version 16 or higher
- **npm**: Package manager
- **Playwright**: Browser automation framework
- **OpenAI API Key**: For AI-powered element matching
- **Platform Credentials**: Login credentials for each platform you want to use

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd browser-automation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

## ⚙️ Environment Configuration

Create a `.env` file in the root directory with the following variables:

### OpenAI Configuration
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

#### Available OpenAI Models

- **`gpt-4o-mini`** (Default): Fastest and most cost-effective, good for basic element matching
- **`gpt-4o`**: Balanced performance and cost, better reasoning capabilities
- **`gpt-4-turbo`**: Most capable model, best for complex element analysis (highest cost)

Choose based on your needs:
- **Development/Testing**: Use `gpt-4o-mini` for cost efficiency
- **Production**: Use `gpt-4o` or `gpt-4-turbo` for better accuracy
- **Budget Conscious**: Stick with `gpt-4o-mini` (default)

### LinkedIn Configuration
```env
LINKEDIN_USERNAME=your_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password
```

### Quora Configuration
```env
QUORA_EMAIL=your_email@example.com
QUORA_PASSWORD=your_quora_password
```

### Browser Settings (Optional)
```env
HEADLESS=false
SLOWMO=100
AUTO_CLOSE_BROWSER=false
```

### Browser Behavior Settings (Optional)
```env
# Set to 'true' to automatically close browser on success, 'false' to keep it open
AUTO_CLOSE_BROWSER=false
```

## 🎯 Usage

### Basic Usage

**Post to LinkedIn only**:
```bash
npm start -- --linkedin
```

**Post to Quora only**:
```bash
npm start -- --quora
```

**Post to multiple platforms**:
```bash
npm start -- --linkedin --quora
```

**Direct Node.js execution**:
```bash
node index.js --linkedin --quora
```

### Available Platforms

- `--linkedin`: Post to LinkedIn
- `--quora`: Create questions on Quora
- `--reddit`: Reddit automation (not yet implemented)
- `--facebook`: Facebook automation (not yet implemented)

## 🏗️ Project Structure

```
browser-automation/
├── index.js                 # Main entry point
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables (create from .env.example)
├── .env.example           # Environment variables template
├── auth.json              # Session storage (auto-generated)
├── helpers/               # Utility classes
│   ├── browser.js        # Browser management and navigation
│   └── aiMatcher.js      # AI-powered element matching
├── providers/             # Platform-specific implementations
│   ├── linkedin/         # LinkedIn automation
│   │   └── index.js      # LinkedIn provider
│   └── quora/            # Quora automation
│       └── index.js      # Quora provider
└── services/              # Shared services
    └── contentGenerator.js # Dynamic content generation
```

## 🔧 How It Works

### 1. Platform Selection
The service parses command-line arguments to determine which platforms to automate.

### 2. Browser Initialization
- Launches a Chromium browser instance
- Attempts to load existing session state from `auth.json`
- Creates new session if no saved state exists

### 3. Platform Processing
For each selected platform:
- **Login**: Authenticates using credentials from `.env`
- **Content Creation**: Generates unique, timestamped content
- **Posting**: Creates posts/questions using platform-specific logic
- **Session Saving**: Stores authentication state for future use

### 4. Error Handling
- Comprehensive error logging with emojis for visibility
- Browser stays open on failure for manual inspection
- Graceful shutdown handling

## 📝 Content Generation

The service automatically generates unique content for each post:

- **LinkedIn**: Professional insights with hashtags and timestamps
- **Quora**: Technical questions about programming, AI, databases, etc.
- **Dynamic Elements**: Random topic selection, varied question formats
- **Timestamps**: Each post includes generation timestamp

## 🔐 Session Management

- **Authentication Persistence**: Saves login sessions to `auth.json`
- **Automatic Reuse**: Reuses sessions on subsequent runs
- **Fallback Handling**: Creates new sessions if saved state is invalid
- **Security**: Session files contain only browser cookies, not passwords

## 🚨 Troubleshooting

### Common Issues

1. **Login Failures**:
   - Check credentials in `.env` file
   - Verify 2FA/verification requirements
   - Complete captchas manually if needed

2. **Element Not Found**:
   - Platform UI may have changed
   - Check browser console for detailed logs
   - Browser stays open for manual inspection

3. **Session Errors**:
   - Delete `auth.json` to start fresh
   - Check platform login requirements

### Debug Mode

The browser automatically stays open on errors, allowing you to:
- Inspect the current page state
- Check console logs
- Manually complete any required steps
- Press `Ctrl+C` when done

## 📝 Adding New Platforms

To add support for a new platform:

1. **Create provider directory**:
   ```bash
   mkdir providers/newplatform
   ```

2. **Implement provider class**:
   ```javascript
   // providers/newplatform/index.js
   class NewPlatformProvider {
     async login() { /* login logic */ }
     async createPost() { /* posting logic */ }
   }
   ```

3. **Add to main index.js**:
   ```javascript
   case 'newplatform':
     provider = new NewPlatformProvider(browserHelper);
     await provider.login();
     await provider.createPost();
     break;
   ```

4. **Update command-line parsing**:
   ```javascript
   if (args.includes('--newplatform')) platforms.push('newplatform');
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This tool is for educational and personal use only. Please:
- Respect platform terms of service
- Use responsibly and ethically
- Don't spam or abuse platforms
- Follow rate limits and guidelines
- Ensure compliance with applicable laws

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review console logs for error details
3. Ensure all environment variables are set correctly
4. Verify platform credentials are valid
5. Check if platforms have updated their UI
