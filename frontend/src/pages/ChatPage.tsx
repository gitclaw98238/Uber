import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatBubble from '../components/ChatBubble';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useWebSocketContext } from '../context/WebSocketContext';
import { useChatStore } from '../store/chatStore';

const ChatPage = () => {
  const { bookingId = '' } = useParams();
  const { user } = useAuth();
  const { status } = useWebSocketContext();
  const { messagesByBooking, fetchConversation, sendMessage, isLoading, error } = useChatStore();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (bookingId) {
      void fetchConversation(bookingId);
    }
  }, [bookingId, fetchConversation]);

  const messages = useMemo(() => messagesByBooking[bookingId] || [], [bookingId, messagesByBooking]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim()) return;
    await sendMessage(bookingId, content.trim());
    setContent('');
  };

  return (
    <div className="page chat-page fade-in">
      <section className="card row-between wrap">
        <div>
          <h2>Booking chat</h2>
          <p className="muted-text">Booking #{bookingId.slice(0, 8)}</p>
        </div>
        <span className="status-chip">Socket: {status}</span>
      </section>

      <section className="card chat-thread">
        {isLoading && !messages.length ? <LoadingSpinner label="Loading messages…" /> : null}
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} own={message.senderId === user?.id} />
        ))}
        {!messages.length && !isLoading ? <div className="empty-state">Start the conversation with your provider.</div> : null}
      </section>

      <form className="card chat-compose" onSubmit={handleSubmit}>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Type your message" rows={3} />
        <button className="button primary" type="submit">
          Send
        </button>
      </form>
      {error ? <div className="banner error">{error}</div> : null}
    </div>
  );
};

export default ChatPage;
