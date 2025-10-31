'use server';

/**
 * @fileOverview An AI agent for flagging anomalous visits based on defined criteria.
 *
 * - flagAnomalousVisit - A function that handles the flagging of anomalous visits.
 * - FlagAnomalousVisitInput - The input type for the flagAnomalousVisit function.
 * - FlagAnomalousVisitOutput - The return type for the flagAnomalousVisit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlagAnomalousVisitInputSchema = z.object({
  visitDetails: z.string().describe('Details of the visit, including user, outlet, and timestamps.'),
  criteria: z.string().describe('The criteria to check against, e.g., \'duration exceeds 2 hours\'.'),
});
export type FlagAnomalousVisitInput = z.infer<typeof FlagAnomalousVisitInputSchema>;

const FlagAnomalousVisitOutputSchema = z.object({
  isAnomalous: z.boolean().describe('Whether the visit is anomalous based on the criteria.'),
  reason: z.string().describe('The reason why the visit is flagged as anomalous.'),
});
export type FlagAnomalousVisitOutput = z.infer<typeof FlagAnomalousVisitOutputSchema>;

export async function flagAnomalousVisit(input: FlagAnomalousVisitInput): Promise<FlagAnomalousVisitOutput> {
  return flagAnomalousVisitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'flagAnomalousVisitPrompt',
  input: {schema: FlagAnomalousVisitInputSchema},
  output: {schema: FlagAnomalousVisitOutputSchema},
  prompt: `You are an expert in detecting anomalous visits based on defined criteria.\n\nYou will receive visit details and criteria to check against. You will determine if the visit is anomalous based on the criteria and provide a reason for your determination.\n\nVisit Details: {{{visitDetails}}}\nCriteria: {{{criteria}}}`,
});

const flagAnomalousVisitFlow = ai.defineFlow(
  {
    name: 'flagAnomalousVisitFlow',
    inputSchema: FlagAnomalousVisitInputSchema,
    outputSchema: FlagAnomalousVisitOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
