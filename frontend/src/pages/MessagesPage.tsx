import { Link } from 'react-router-dom';
import { messagesApi } from '../api/messages';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';
import { formatRelative } from '../utils/format';

const MessagesPage = () => {
  const { data: conversations, loading, error } = useAsyncData(() => messagesApi.listConversations(), []);

  if (loading) return <LoadingSpinner label="Loading conversations…" />;

  return (
    <div className="page stack-lg fade-in">
      <section className="stack-md">
        {(conversations || []).map((conversation) => (
          <Link key={conversation.bookingId} className="card conversation-row" to={`/customer/messages/${conversation.bookingId}`}>
            <div>
              <h3>{conversation.participantName || conversation.booking?.provider?.name || 'Conversation'}</h3>
              <p className="muted-text">Booking #{conversation.bookingId.slice(0, 8)}</p>
            </div>
            <div className="conversation-meta">
              <p>{conversation.lastMessage?.content || 'No messages yet'}</p>
              <span className="muted-text">{formatRelative(conversation.lastMessage?.createdAt)}</span>
            </div>
          </Link>
        ))}
      </section>
      {error ? <div className="banner error">{error}</div> : null}
      {!conversations?.length ? <div className="empty-state card">You don&apos;t have any conversations yet.</div> : null}
    </div>
  );
};

export default MessagesPage;
