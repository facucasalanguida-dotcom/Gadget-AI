export interface ConversationResult {
  responseText: string;
  toolCalls: Array<{ name: string; input: unknown }>;
}

export type ConversationRunner = (
  userText: string,
  maxToolIterations?: number
) => Promise<ConversationResult>;
