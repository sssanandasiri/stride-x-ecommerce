import { api } from "../api";

export async function getBotReply(message, history = []) {
  try {
    // the widget's welcome message has no products and isn't real context
    const turns = history.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    return await api.chat(message, turns);
  } catch (err) {
    return {
      text: err.status === 429
        ? "You're sending messages very quickly — give me a moment and try again."
        : "Sorry, I can't reach the assistant right now. Please try again in a bit.",
      products: [],
    };
  }
}
