# AI-Powered Browser Automation

This project uses AI to perform semantic element matching for browser automation. Instead of relying on brittle selectors like IDs or class names, it uses natural language processing to understand and match elements based on their context and meaning.

## Features

- AI-powered element matching using OpenAI's GPT API
- Semantic understanding of page elements
- Context-aware element selection
- Modular design for easy extension
- Built-in retry logic and error handling
- Detailed logging for debugging

## Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- LinkedIn account (for demo purposes)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

## Configuration

Edit the `.env` file with your credentials:

```env
OPENAI_API_KEY=sk-your-api-key-here
LINKEDIN_USERNAME=your_email_here
LINKEDIN_PASSWORD=your_password_here
HEADLESS=false
SLOWMO=50
```

### Handling Authentication

The system uses session persistence to avoid repeated verification codes:

1. First Login:
   - Run the automation normally
   - When verification is required, the system will pause
   - Complete the verification manually (enter code from email/phone)
   - The authenticated session will be saved automatically

2. Subsequent Runs:
   - The system will reuse the saved authentication
   - No verification code needed
   - If the session expires, you'll need to verify again

The authenticated session is stored in `auth.json` in the project root.

## Usage

Run the automation with a natural language instruction:

```bash
node index.js "Go to https://www.linkedin.com and login with credentials from .env"
```

## Project Structure

- `index.js`: Main runner script
- `helpers/`
  - `aiMatcher.js`: OpenAI-powered element matching
  - `browser.js`: Playwright setup & utilities
- `actions/`
  - `login.js`: LinkedIn login automation
  
## How It Works

1. The system takes a natural language instruction
2. It uses Playwright to interact with the browser
3. For each interaction, it:
   - Gathers context about available elements
   - Uses OpenAI to match the instruction to the best element
   - Performs the requested action
   - Provides detailed logging about decisions made

## Extending

To add support for new sites or actions:

1. Create a new action file in the `actions/` directory
2. Implement the action class with an `execute()` method
3. Add support for the new instruction in `index.js`

## Error Handling

The system includes:
- Automatic retries for failed element matches
- Detailed error logging
- Graceful cleanup of browser resources

## Contributing

Feel free to submit issues and enhancement requests!
