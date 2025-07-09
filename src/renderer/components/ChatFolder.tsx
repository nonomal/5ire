import {
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Input,
} from '@fluentui/react-components';
import {
  bundleIcon,
  FolderFilled,
  FolderOpenFilled,
  FolderOpenRegular,
  FolderRegular,
  MoreVerticalFilled,
  MoreVerticalRegular,
} from '@fluentui/react-icons';
import { IChat, IChatFolder } from 'intellichat/types';
import { useDroppable } from '@dnd-kit/core';
import useChatStore from 'stores/useChatStore';
import { t } from 'i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import Mousetrap from 'mousetrap';
import useNav from 'hooks/useNav';
import { TEMP_CHAT_ID } from 'consts';
import ConfirmDialog from './ConfirmDialog';
import FolderSettingsDialog from './FolderSettingsDialog';
import ChatItem from './ChatItem';
import { useContextMenu } from './ContextMenuProvider';

const MoreVerticalIcon = bundleIcon(MoreVerticalFilled, MoreVerticalRegular);

export default function ChatFolder({
  folder,
  chats,
  collapsed,
}: {
  folder: IChatFolder;
  chats: IChat[];
  collapsed: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: folder.id,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNav();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [name, setName] = useState(folder.name);
  const [editable, setEditable] = useState(false);
  const openFolders = useChatStore((state) => state.openFolders);
  const selectedFolder = useChatStore((state) => state.folder);
  const chat = useChatStore((state) => state.chat);
  const { updateFolder, deleteFolder, markFolderAsOld, selectFolder } =
    useChatStore();
  const [folderSettingsOpen, setFolderSettingsOpen] = useState(false);
  const { registerHandler, unregisterHandler } = useContextMenu();

  const saveName = useCallback(() => {
    setEditable(false);
    const folderName = name.trim() || 'New Folder';
    updateFolder({
      id: folder.id,
      name: folderName,
    });
    setName(folderName);
    Mousetrap.unbind('esc');
  }, [name, folder.id, updateFolder]);

  const handleContextMenuCommand = useCallback(
    (command: string, params: any) => {
      if (command === 'delete-chat-folder') {
        setConfirmDialogOpen(true);
      } else if (command === 'folder-chat-settings') {
        selectFolder(folder.id);
        setFolderSettingsOpen(true);
      } else if (command === 'rename-chat-folder') {
        setEditable(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    },
    [folder.id, selectFolder],
  );

  useEffect(() => {
    registerHandler('chat-folder', folder.id, handleContextMenuCommand);
    return () => {
      unregisterHandler('chat-folder', folder.id);
    };
  }, [folder.id, handleContextMenuCommand, registerHandler, unregisterHandler]);

  // 右键菜单事件处理
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      window.electron.ipcRenderer.sendMessage('show-context-menu', {
        type: 'chat-folder',
        targetId: folder.id,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [folder.id],
  );

  useEffect(() => {
    Mousetrap.bind('esc', () => {
      setName(folder.name);
      setEditable(false);
    });
    return () => {
      Mousetrap.unbind('esc');
    };
  }, [editable, folder.name]);

  useEffect(() => {
    if (folder.isNew) {
      setEditable(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
    return () => {
      markFolderAsOld(folder.id);
    };
  }, [folder.isNew, folder.id, markFolderAsOld]);

  const icon = useCallback(
    (fld: IChatFolder) => {
      if (openFolders.includes(fld.id)) {
        return fld.id === selectedFolder?.id ? (
          <FolderOpenFilled className="w-5 h-5" />
        ) : (
          <FolderOpenRegular className="w-5 h-5" />
        );
      }
      return fld.id === selectedFolder?.id ? (
        <FolderFilled className="w-5 h-5" />
      ) : (
        <FolderRegular className="w-5 h-5" />
      );
    },
    [openFolders, selectedFolder],
  );

  return (
    <div ref={setNodeRef}>
      <AccordionItem
        value={folder.id}
        disabled={editable}
        id={folder.id}
        className="chat-folder"
        onContextMenu={handleContextMenu}
      >
        <div className="flex justify-between items-center">
          <AccordionHeader
            style={{ height: 28 }}
            className={collapsed ? 'collapsed' : 'px-1 flex-grow'}
            onDoubleClick={() => {
              if (!collapsed) {
                setEditable(true);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 0);
                Mousetrap.bind('esc', () => {
                  setName(folder.name);
                  setEditable(false);
                });
              }
            }}
            expandIcon={icon(folder)}
          >
            {editable ? (
              <Input
                ref={inputRef}
                value={name}
                appearance="underline"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveName();
                  }
                }}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                onBlur={saveName}
              />
            ) : (
              collapsed || folder.name
            )}
          </AccordionHeader>
          {!collapsed && (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <MenuButton
                  icon={
                    <MoreVerticalIcon className="text-gray-400 dark:text-gray-500" />
                  }
                  appearance="transparent"
                  size="small"
                />
              </MenuTrigger>
              <MenuPopover style={{ minWidth: '80px' }}>
                <MenuList>
                  <MenuItem
                    onClick={() => {
                      setEditable(true);
                      setTimeout(() => {
                        inputRef.current?.focus();
                      }, 0);
                    }}
                  >
                    <span className="text-xs">{t('Common.Action.Rename')}</span>
                  </MenuItem>
                  <MenuItem onClick={() => setConfirmDialogOpen(true)}>
                    <span className="text-xs">{t('Common.Delete')}</span>
                  </MenuItem>
                  <MenuItem
                    className="text-xs"
                    onClick={() => {
                      selectFolder(folder.id);
                      setFolderSettingsOpen(true);
                    }}
                  >
                    <span className="text-xs">{t('Common.Settings')}</span>
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
        </div>
        <AccordionPanel>
          {chats.length > 0 && (
            <div
              className={`pt-0.5 ${collapsed ? 'ml-0' : 'border-l border-gray-300 dark:border-zinc-700 ml-3'}`}
              style={{ paddingLeft: collapsed ? 0 : 4 }}
            >
              {chats.map((c) => (
                <ChatItem key={c.id} chat={c} collapsed={collapsed} />
              ))}
            </div>
          )}
        </AccordionPanel>
      </AccordionItem>
      <ConfirmDialog
        title={`${t('Chat.Confirmation.DeleteFolder')} [${folder.name}]`}
        message={t('Chat.DeleteConfirmation.DeleteFolderInfo')}
        open={confirmDialogOpen}
        setOpen={setConfirmDialogOpen}
        onConfirm={async () => {
          await deleteFolder(folder.id);
          // If the current chat is in the folder being deleted, navigate to the temp chat
          if (chat.folderId === folder.id) {
            navigate(`/chats/${TEMP_CHAT_ID}`);
          }
        }}
      />
      <FolderSettingsDialog
        open={folderSettingsOpen}
        setOpen={setFolderSettingsOpen}
      />
    </div>
  );
}
