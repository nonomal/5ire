import { Button, Input } from '@fluentui/react-components';
import { IChat } from 'intellichat/types';
import useChatStore from 'stores/useChatStore';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useRef, useState } from 'react';
import Mousetrap from 'mousetrap';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from './ConfirmDialog';
import useDeleteChat from 'hooks/useDeleteChat';
import ChatIcon from './ChatIcon';
import { useContextMenu } from './ContextMenuProvider'; // 修改这里

export default function ChatItem({
  chat,
  collapsed,
}: {
  chat: IChat;
  collapsed: boolean;
}) {
  const { t } = useTranslation();
  const curChat = useChatStore((state) => state.chat);
  const [name, setName] = useState(chat.name || '');
  const [editable, setEditable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: chat.id,
    data: { folderId: chat.folderId || null },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const updateChat = useChatStore((state) => state.updateChat);
  const {
    delConfirmDialogOpen,
    setDelConfirmDialogOpen,
    showDeleteConfirmation,
    onDeleteChat,
    cancelDelete,
  } = useDeleteChat();
  const { registerHandler, unregisterHandler } = useContextMenu(); // 修改这里

  useEffect(() => {
    Mousetrap.bind('esc', () => {
      setName(chat.name);
      setEditable(false);
    });
    return () => {
      Mousetrap.unbind('esc');
    };
  }, [editable, chat.name]);

  const updateChatName = useCallback(
    async (newName: string) => {
      if (newName !== chat.name && newName.trim().length > 0) {
        await updateChat({ id: chat.id, name: newName.trim() });
      }
      setEditable(false);
    },
    [chat.id, chat.name, updateChat],
  );

  const handleContextMenuCommand = useCallback(
    (command: string, params: any) => {
      if (command === 'delete-chat') {
        showDeleteConfirmation(chat);
      } else if (command === 'rename-chat') {
        setEditable(true);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
      }
    },
    [chat, showDeleteConfirmation],
  );

  useEffect(() => {
    registerHandler('chat', chat.id, handleContextMenuCommand); // 修改这里
    return () => {
      unregisterHandler('chat', chat.id); // 修改这里
    };
  }, [chat.id, handleContextMenuCommand, registerHandler, unregisterHandler]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      window.electron.ipcRenderer.sendMessage('show-context-menu', {
        type: 'chat',
        targetId: chat.id,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [chat.id],
  );

  return (
    <div
      className="chat"
      id={chat.id}
      key={chat.id}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => {
        if (!collapsed) {
          setEditable(true);
          setTimeout(() => {
            inputRef.current?.focus();
          }, 0);
          Mousetrap.bind('esc', () => {
            setName(chat.name);
            setEditable(false);
          });
        }
      }}
    >
      {editable ? (
        <div className="px-2 py-1">
          <Input
            ref={inputRef}
            size="small"
            value={name || ''}
            autoFocus
            placeholder={t('Input.Hint.EnterSubmitEscCancel')}
            className="w-full"
            appearance="underline"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateChatName(name);
                setEditable(false);
              }
            }}
            onChange={(e) => {
              setName(e.target.value);
            }}
            onBlur={() => updateChatName(name)}
          />
        </div>
      ) : (
        <div className="relative">
          <Button
            style={style}
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            icon={
              <ChatIcon
                chat={chat}
                isActive={curChat && curChat.id === chat.id}
              />
            }
            appearance="subtle"
            className="w-full justify-start latin"
          >
            {collapsed ? null : (
              <div className="text-sm truncate ...">
                {chat.name?.trim() ||
                  chat.summary
                    ?.substring(0, 40)
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')}
              </div>
            )}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={delConfirmDialogOpen}
        setOpen={setDelConfirmDialogOpen}
        title={t('Chat.DeleteConfirmation')}
        message={t('Chat.DeleteConfirmationInfo')}
        onConfirm={onDeleteChat}
        onCancel={cancelDelete}
      />
    </div>
  );
}
