/**
 * Client bridge to the multi-agent backend (/api/agent).
 * The server runs the agent team on Vertex AI Gemini + Cloud SQL and
 * holds a real conversation — it suggests, collects the customer's name +
 * table number, then PLACES the order and returns an order number.
 */
export interface TraceStep { agent: string; [k: string]: any; }
export interface ChatTurn { role: 'user' | 'bot'; text: string; }
export interface AgentResult { reply: string; highlightIds?: string[]; trace?: TraceStep[]; placed?: boolean; orderNo?: string; }

export async function askBarista(message: string, history: ChatTurn[], userId?: string): Promise<AgentResult> {
  try {
    const r = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, userId }),
    });
    const d = await r.json();
    return { reply: d.reply || "Sorry, could you say that again? ☕", highlightIds: d.highlightIds || [], trace: d.trace || [], placed: d.placed, orderNo: d.orderNo };
  } catch {
    return { reply: 'My espresso machine hiccuped — try again in a sec ☕', trace: [] };
  }
}

export const STARTERS = [
  "Hi! What's good today?",
  'Something cold and strong',
  'I feel like a sweet treat',
  'Recommend me something',
];
