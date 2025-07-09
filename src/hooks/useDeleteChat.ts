import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useChatStore from 'stores/useChatStore';
import useNav from 'hooks/useNav';
import useToast from 'hooks/useToast';
import { TEMP_CHAT_ID } from 'consts';
import { IChat } from 'intellichat/types';

export default function useDeleteChat() {
  const { t } = useTranslation();
  const { notifySuccess } = useToast();
  const navigate = useNav();
  const deleteChat = useChatStore((state) => state.deleteChat);
  const [delConfirmDialogOpen, setDelConfirmDialogOpen] = useState<boolean>(false);
  const [chatToDelete, setChatToDelete] = useState<IChat | null>(null);

  const showDeleteConfirmation = (chat?: IChat) => {
    setChatToDelete(chat || null);
    setDelConfirmDialogOpen(true);
  };

  const onDeleteChat = async () => {
    if (chatToDelete) {
      await deleteChat(chatToDelete.id);
      const activeChat = useChatStore.getState().chat;
      if (activeChat?.id === chatToDelete.id) {
        navigate(`/chats/${TEMP_CHAT_ID}`);
      }
    } else {
      await deleteChat();
      navigate(`/chats/${TEMP_CHAT_ID}`);
    }
    notifySuccess(t('Chat.Notification.Deleted'));
    setDelConfirmDialogOpen(false);
    setChatToDelete(null);
  };

  const cancelDelete = () => {
    setDelConfirmDialogOpen(false);
    setChatToDelete(null);
  };

  return {
    delConfirmDialogOpen,
    setDelConfirmDialogOpen,
    showDeleteConfirmation,
    onDeleteChat,
    cancelDelete,
    chatToDelete,
  };
}
