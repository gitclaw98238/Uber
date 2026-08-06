import { Message } from '../types';
import { formatRelative } from '../utils/format';

interface ChatBubbleProps {
  message: Message;
  own: boolean;
}

const ChatBubble = ({ message, own }: ChatBubbleProps) => (
  <div className={`chat-bubble ${own ? 'own' : 'other'} ${message.system ? 'system' : ''}`}>
    <p>{message.content}</p>
    <span>{formatRelative(message.createdAt)}</span>
  </div>
);

export default ChatBubble;
