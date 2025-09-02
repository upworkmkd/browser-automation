import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

export const nodeRouter = router({
  // Get all node templates
  getTemplates: publicProcedure.query(async ({ ctx }) => {
    // For now, return static node templates
    // Later this will come from the database
    return [
      {
        id: 'url-node',
        type: 'url',
        name: 'Open URL',
        description: 'Navigate to a specific URL',
        category: 'Navigation',
        icon: 'Globe',
        config: {
          url: {
            type: 'text',
            label: 'URL',
            placeholder: 'https://example.com',
            required: true,
          },
          waitForLoad: {
            type: 'boolean',
            label: 'Wait for page load',
            default: true,
          },
          timeout: {
            type: 'number',
            label: 'Timeout (ms)',
            default: 10000,
          },
        },
      },
      {
        id: 'click-node',
        type: 'click',
        name: 'Click Element',
        description: 'Click on an element',
        category: 'Interaction',
        icon: 'MousePointer',
        config: {
          selector: {
            type: 'text',
            label: 'Element Selector',
            placeholder: '#button, .class, or CSS selector',
            required: true,
          },
          selectorType: {
            type: 'select',
            label: 'Selector Type',
            options: [
              { value: 'css', label: 'CSS Selector' },
              { value: 'xpath', label: 'XPath' },
              { value: 'id', label: 'ID' },
              { value: 'class', label: 'Class Name' },
            ],
            default: 'css',
          },
          waitTimeout: {
            type: 'number',
            label: 'Wait Timeout (ms)',
            default: 5000,
          },
        },
      },
      {
        id: 'type-node',
        type: 'type',
        name: 'Type Text',
        description: 'Type text into an input field',
        category: 'Interaction',
        icon: 'Type',
        config: {
          selector: {
            type: 'text',
            label: 'Input Selector',
            placeholder: 'input[name="email"]',
            required: true,
          },
          text: {
            type: 'text',
            label: 'Text to Type',
            placeholder: 'Hello World',
            required: true,
          },
          clearFirst: {
            type: 'boolean',
            label: 'Clear field first',
            default: true,
          },
          typeDelay: {
            type: 'number',
            label: 'Typing delay (ms)',
            default: 100,
          },
        },
      },
      {
        id: 'wait-node',
        type: 'wait',
        name: 'Wait',
        description: 'Wait for a specified time or condition',
        category: 'Flow Control',
        icon: 'Clock',
        config: {
          waitType: {
            type: 'select',
            label: 'Wait Type',
            options: [
              { value: 'time', label: 'Fixed Time' },
              { value: 'element', label: 'Wait for Element' },
              { value: 'network', label: 'Wait for Network Idle' },
            ],
            default: 'time',
          },
          duration: {
            type: 'number',
            label: 'Duration (ms)',
            default: 2000,
          },
          selector: {
            type: 'text',
            label: 'Element Selector (if waiting for element)',
            placeholder: '.loading-complete',
          },
        },
      },
      {
        id: 'screenshot-node',
        type: 'screenshot',
        name: 'Take Screenshot',
        description: 'Capture a screenshot of the page or element',
        category: 'Data',
        icon: 'Camera',
        config: {
          type: {
            type: 'select',
            label: 'Screenshot Type',
            options: [
              { value: 'fullPage', label: 'Full Page' },
              { value: 'viewport', label: 'Viewport Only' },
              { value: 'element', label: 'Specific Element' },
            ],
            default: 'viewport',
          },
          selector: {
            type: 'text',
            label: 'Element Selector (if capturing element)',
            placeholder: '.content',
          },
          filename: {
            type: 'text',
            label: 'Filename',
            placeholder: 'screenshot.png',
          },
        },
      },
      {
        id: 'fill-form-node',
        type: 'fill-form',
        name: 'Fill Form Field',
        description: 'Smart form filling by label, placeholder, or name',
        category: 'Interaction',
        icon: 'Edit',
        config: {
          fieldLabel: {
            type: 'text',
            label: 'Field Label',
            placeholder: 'Email Address, Full Name, etc.',
          },
          fieldPlaceholder: {
            type: 'text',
            label: 'Field Placeholder',
            placeholder: 'Enter your email, Your name, etc.',
          },
          fieldName: {
            type: 'text',
            label: 'Field Name Attribute',
            placeholder: 'email, username, firstName, etc.',
          },
          value: {
            type: 'text',
            label: 'Value to Fill',
            placeholder: 'The text to enter in the field',
            required: true,
          },
          selector: {
            type: 'text',
            label: 'Fallback Selector (Optional)',
            placeholder: 'CSS selector as backup',
          },
        },
      },
      {
        id: 'login-form-node',
        type: 'login-form',
        name: 'Login Form',
        description: 'Automated login with username and password',
        category: 'Interaction',
        icon: 'LogIn',
        config: {
          username: {
            type: 'text',
            label: 'Username/Email',
            placeholder: 'user@example.com',
            required: true,
          },
          password: {
            type: 'password',
            label: 'Password',
            placeholder: 'Your password',
            required: true,
          },
          usernameField: {
            type: 'text',
            label: 'Username Field Hint',
            placeholder: 'email, username, login',
            default: 'email',
          },
          passwordField: {
            type: 'text',
            label: 'Password Field Hint',
            placeholder: 'password, pass, pwd',
            default: 'password',
          },
          submitButton: {
            type: 'text',
            label: 'Submit Button Text',
            placeholder: 'Login, Sign In, Submit',
            default: 'Login',
          },
        },
      },
      {
        id: 'submit-form-node',
        type: 'submit-form',
        name: 'Submit Form',
        description: 'Submit any form with smart button detection',
        category: 'Interaction',
        icon: 'Send',
        config: {
          buttonText: {
            type: 'text',
            label: 'Submit Button Text',
            placeholder: 'Submit, Send, Save, Continue',
            default: 'Submit',
          },
          buttonSelector: {
            type: 'text',
            label: 'Button Selector (Optional)',
            placeholder: 'CSS selector for submit button',
          },
          waitForResponse: {
            type: 'boolean',
            label: 'Wait for Response',
            default: true,
          },
          successSelector: {
            type: 'text',
            label: 'Success Indicator Selector',
            placeholder: '.success-message, .confirmation',
          },
        },
      },
    ]
  }),

  // Get node template by type
  getTemplate: publicProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ ctx, input }) => {
      // This would fetch from database in a real implementation
      const templates = await ctx.prisma.nodeTemplate.findMany({
        where: { type: input.type },
      })
      return templates[0] || null
    }),
})
