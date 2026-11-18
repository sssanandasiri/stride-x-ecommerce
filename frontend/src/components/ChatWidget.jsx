import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBotReply } from "../lib/chatbotEngine";

const welcomeMessage = {
  from: "bot",
  text: "Hi! I'm the StrideX assistant. Ask me about stock, prices, new drops, or sales.",
  products: [],
};

/*
  Floating chat button, bottom-right — same open/close + backdrop pattern
  as CartDrawer/SearchOverlay, just anchored in a corner instead of an
  edge. Messages live in local component state (they don't need to be
  shared anywhere else, unlike cart/wishlist/products), so no Context
  needed here.
*/
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMessage = { from: "user", text, products: [] };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    // the server (Django + Claude) answers; we pass recent messages for context
    const reply = await getBotReply(text, messages);
    setMessages((prev) => [...prev, { from: "bot", text: reply.text, products: reply.products }]);
    setSending(false);
  };

  return (
    <>
      <button
        className="chat-fab"
        aria-label={isOpen ? "Close chat" : "Open chat"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <i className={isOpen ? "fas fa-xmark" : "fas fa-comment-dots"}></i>
      </button>

      {isOpen && (
        <div className="chat-panel" role="dialog" aria-label="StrideX assistant">
          <div className="chat-panel-header">
            <div>
              <strong>StrideX Assistant</strong>
              <span>Ask about stock, price, or new drops</span>
            </div>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((message, i) => (
              <div key={i} className={`chat-bubble chat-bubble-${message.from}`}>
                <p>{message.text}</p>
                {message.products.length > 0 && (
                  <div className="chat-product-list">
                    {message.products.map((product) => (
                      <Link
                        to={`/product/${product.id}`}
                        className="chat-product-row"
                        key={product.id}
                        onClick={() => setIsOpen(false)}
                      >
                        <img src={product.image} alt={product.name} />
                        <div>
                          <span className="pro-brand">{product.brand}</span>
                          <p>{product.name}</p>
                        </div>
                        <strong>{(product.salePrice ?? product.price).toFixed(2)} LKR</strong>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble chat-bubble-bot"><p>Typing…</p></div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={sendMessage}>
            <input
              type="text"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" aria-label="Send message">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
