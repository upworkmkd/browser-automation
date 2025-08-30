import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class AIMatcher {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async findBestMatch(instruction, elements, browserHelper) {
    const elementContexts = await Promise.all(
      elements.map(async (element) => ({
        element,
        context: await browserHelper.getElementContext(element)
      }))
    );

    // Create a prompt for the OpenAI API
    const prompt = this.createPrompt(instruction, elementContexts.map(e => e.context));

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "You are a specialized AI that matches web elements based on semantic meaning. Your task is to analyze web elements and their context to find the best match for a given instruction. Always respond in this exact format:\n\n" +
                   "Index: [number]\n" +
                   "Explanation: [detailed reason for choosing this element]\n\n" +
                   "Choose the element that best matches the instruction based on all available context (inner text, aria labels, placeholders, nearby text, etc). If no good match is found, explain why.\n\n" +
                   "IMPORTANT: When looking for action buttons (like submit, post, publish), prioritize buttons that perform the main action over buttons that control settings, visibility, or are part of dropdowns. Look for primary action buttons that complete the main task."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 150
      });

      const response = completion.choices[0].message.content;
      console.log('AI Response:', response); // Debug log

      // More flexible parsing of index
      let bestMatchIndex = -1;
      
      // Try different patterns
      const patterns = [
        /Index:\s*(\d+)/i,
        /Element\s*(\d+)/i,
        /Choose\s*element\s*(\d+)/i,
        /Select\s*element\s*(\d+)/i
      ];

      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          bestMatchIndex = parseInt(match[1]);
          break;
        }
      }

      // If no index found, try to find any number in the response
      if (bestMatchIndex === -1) {
        const numberMatch = response.match(/\b(\d+)\b/);
        if (numberMatch) {
          bestMatchIndex = parseInt(numberMatch[1]);
        }
      }

      if (bestMatchIndex === -1 || bestMatchIndex >= elementContexts.length) {
        console.error('Available elements:', elementContexts.map(e => e.context));
        throw new Error(`Could not determine best matching element. AI response: ${response}`);
      }

      // Extract explanation - be more flexible
      let explanation = 'No explanation provided';
      const explanationMatch = response.match(/Explanation:\s*(.*?)(?=\n|$)/s) || 
                             response.match(/Because:\s*(.*?)(?=\n|$)/s) ||
                             response.match(/Reason:\s*(.*?)(?=\n|$)/s);
      
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      } else {
        // Use everything after the index as explanation
        const afterIndex = response.split(/Index:\s*\d+/i)[1];
        if (afterIndex) {
          explanation = afterIndex.trim();
        }
      }

      return {
        element: elementContexts[bestMatchIndex].element,
        confidence: 0.8,
        explanation,
        index: bestMatchIndex // Added for debugging
      };
    } catch (error) {
      console.error('Error matching elements:', error);
      throw error;
    }
  }

  createPrompt(instruction, elementContexts) {
    return `Task: Find the best matching element for the following instruction:
"${instruction}"

Available elements (total: ${elementContexts.length}):
${elementContexts.map((ctx, i) => `
Element ${i}:
${ctx.innerText ? `• Text: "${ctx.innerText}"` : ''}
${ctx.ariaLabel ? `• Aria Label: "${ctx.ariaLabel}"` : ''}
${ctx.placeholder ? `• Placeholder: "${ctx.placeholder}"` : ''}
${ctx.type ? `• Type: "${ctx.type}"` : ''}
${ctx.role ? `• Role: "${ctx.role}"` : ''}
${ctx.name ? `• Name: "${ctx.name}"` : ''}
${ctx.id ? `• ID: "${ctx.id}"` : ''}
${ctx.nearbyText.length > 0 ? `• Nearby Text: "${ctx.nearbyText.join('", "')}"` : ''}
`).join('\n')}

Analyze the elements above and respond in exactly this format:
Index: [number]
Explanation: [detailed reason why this element best matches the instruction]

Important:
- Only include properties that are not empty/null
- Consider all available context (text, labels, placeholders, nearby text)
- If no good match is found, explain why`;
  }
}

export const aiMatcher = new AIMatcher();
