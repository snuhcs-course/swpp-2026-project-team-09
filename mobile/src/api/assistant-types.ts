/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// --- The Assistant (POST /assistant/messages) ---

// One message of the conversation, as the app sends it: the User's or the Assistant's text.
export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// The Assistant's reply, whole.
export interface AssistantReply {
  text: string;
}
