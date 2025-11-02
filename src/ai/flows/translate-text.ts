'use server';

/**
 * @fileOverview A flow for translating text into a specified language.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateTextInputSchema = z.object({
  texts: z.array(z.string()).describe('An array of texts to be translated.'),
  targetLanguage: z.string().describe('The target language for translation, e.g., "Hindi".'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translations: z.array(z.string()).describe('The array of translated texts.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: { schema: TranslateTextInputSchema },
  output: { schema: TranslateTextOutputSchema },
  prompt: `Translate the following array of texts into {{targetLanguage}}. Return the translated texts as an array in the same order.

Texts:
{{#each texts}}
- {{{this}}}
{{/each}}
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    if (input.texts.length === 0) {
      return { translations: [] };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
