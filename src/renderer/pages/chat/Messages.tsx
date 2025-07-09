import { IChatMessage } from 'intellichat/types';
import { memo } from 'react';
import Message from './Message';

const MemoizedMessage = memo(Message, (prevProps, nextProps) => {
  const prev = prevProps.message;
  const next = nextProps.message;

  return (
    prev.id === next.id &&
    prev.reply === next.reply &&
    prev.reasoning === next.reasoning &&
    prev.isActive === next.isActive &&
    prev.citedFiles === next.citedFiles &&
    prev.citedChunks === next.citedChunks
  );
});

export default function Messages({ messages }: { messages: IChatMessage[] }) {
  return (
    <div id="messages">
      {messages.map((msg: IChatMessage) => (
        <MemoizedMessage message={msg} key={msg.id} />
      ))}
      <div className="h-10">&nbsp;</div>
    </div>
  );
}
