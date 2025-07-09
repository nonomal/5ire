import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Empty from 'renderer/components/Empty';
import TooltipIcon from 'renderer/components/TooltipIcon';
import useMCPStore from 'stores/useMCPStore';
import {
  Button,
  Menu,
  MenuButtonProps,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SplitButton,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowSyncCircleRegular,
  BuildingShopFilled,
  BuildingShopRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import { IMCPServer, MCPServerType } from 'types/mcp';
import useToast from 'hooks/useToast';
import ConfirmDialog from 'renderer/components/ConfirmDialog';
import HigressLogo from 'renderer/components/icons/HigressLogo';
import ComposioLogo from 'renderer/components/icons/ComposioLogo';
import LocalServerEditDialog from './LocalServerEditDialog';
import Grid from './Grid';
import DetailDialog from './DetailDialog';
import ToolInstallDialog from './InstallDialog';
import ToolMarketDrawer from './MarketDrawer';
import RemoteServerEditDialog from './RemoteServerEditDialog';

const BuildingShopIcon = bundleIcon(BuildingShopFilled, BuildingShopRegular);

export default function Tools() {
  const { t } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const [loading, setLoading] = useState(false);
  const [mktServer, setMktServer] = useState<IMCPServer | null>(null);
  const [server, setServer] = useState<IMCPServer | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [delConfirmDialogOpen, setDelConfirmDialogOpen] = useState(false);
  const [localServerEditDialogOpen, setLocalServerEditDialogOpen] =
    useState(false);
  const [remoteServerEditDialogOpen, setRemoteServerEditDialogOpen] =
    useState(false);
  const { config, loadConfig, deleteServer } = useMCPStore();

  const mcpServers = useMemo(() => {
    return Object.values(config.mcpServers);
  }, [config.mcpServers]);

  const editServer = useCallback((svr: IMCPServer) => {
    setServer(svr);
    if (svr.type === 'remote') {
      setRemoteServerEditDialogOpen(true);
    } else {
      setLocalServerEditDialogOpen(true);
    }
  }, []);

  const newServer = useCallback((type: MCPServerType) => {
    setServer(null);
    if (type === 'remote') {
      setRemoteServerEditDialogOpen(true);
    } else {
      setLocalServerEditDialogOpen(true);
    }
  }, []);

  const installServer = useCallback((svr: IMCPServer) => {
    setMktServer(svr);
    setInstallDialogOpen(true);
  }, []);

  const inspectServer = useCallback((svr: IMCPServer) => {
    setServer(svr);
    setDetailDialogOpen(true);
  }, []);

  const toDeleteServer = useCallback((svr: IMCPServer) => {
    setServer(svr);
    setDelConfirmDialogOpen(true);
  }, []);

  const onDeleteServer = useCallback(async () => {
    if (server) {
      const ok = await deleteServer(server.key);
      if (ok) {
        notifySuccess('Server deleted successfully');
      } else {
        notifyError('Failed to delete server');
      }
    }
  }, [server]);

  const loadMCPConfig = async (force: boolean, animate: boolean) => {
    try {
      if (animate) {
        setLoading(true);
      }
      await loadConfig(force);
    } catch (error) {
      console.error(error);
    } finally {
      if (animate) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMCPConfig(false, true);
  }, []);

  return (
    <div className="page h-full">
      <div className="page-top-bar" />
      <div className="page-header w-full">
        <div className="flex flex-col items-start w-full">
          <div className="flex justify-between items-baseline w-full">
            <h1 className="text-2xl flex-shrink-0 mr-6">{t('Common.Tools')}</h1>
            <div className="flex justify-end w-full items-center gap-2">
              <Button
                icon={
                  <ArrowSyncCircleRegular
                    className={loading ? 'animate-spin' : ''}
                  />
                }
                onClick={() => {
                  setLoading(true);
                  loadMCPConfig(true, false);
                  setTimeout(() => setLoading(false), 1000);
                }}
                appearance="subtle"
                title={t('Common.Action.Reload')}
              />
              <Menu positioning="below-end">
                <MenuTrigger disableButtonEnhancement>
                  {(triggerProps: MenuButtonProps) => (
                    <SplitButton
                      size="medium"
                      icon={<AddRegular />}
                      menuButton={triggerProps}
                      appearance="primary"
                      primaryActionButton={{
                        onClick: () => newServer('local'),
                      }}
                    >
                      {t('Common.Local')}
                    </SplitButton>
                  )}
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem onClick={() => newServer('remote')}>
                      {t('Common.Remote')}
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
              <Menu positioning="below-end">
                <MenuTrigger disableButtonEnhancement>
                  {(triggerProps: MenuButtonProps) => (
                    <SplitButton
                      size="medium"
                      icon={<BuildingShopIcon />}
                      menuButton={triggerProps}
                      primaryActionButton={{
                        onClick: () => setMarketOpen(true),
                      }}
                    >
                      {t('Tools.Market')}
                    </SplitButton>
                  )}
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem
                      icon={<HigressLogo />}
                      onClick={() =>
                        window.electron.openExternal('https://mcp.higress.ai')
                      }
                    >
                      Higress Market
                    </MenuItem>
                    <MenuItem
                      icon={<ComposioLogo />}
                      onClick={() =>
                        window.electron.openExternal(
                          'https://mcp.composio.dev/',
                        )
                      }
                    >
                      Composio Market
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </div>
          </div>
          <div className="tips flex justify-start items-center">
            {t('Common.MCPServers')}
            <TooltipIcon tip={t('Tools.PrerequisiteDescription')} />
          </div>
        </div>
      </div>
      <div className="mt-2.5 pb-12 h-full -mr-5 overflow-y-auto">
        {mcpServers.length === 0 ? (
          <Empty image="tools" text={t('Tool.Info.Empty')} />
        ) : (
          <Grid
            servers={mcpServers}
            onEdit={editServer}
            onDelete={toDeleteServer}
            onInspect={inspectServer}
          />
        )}
      </div>
      <LocalServerEditDialog
        open={localServerEditDialogOpen}
        setOpen={setLocalServerEditDialogOpen}
        server={server}
      />
      <RemoteServerEditDialog
        open={remoteServerEditDialogOpen}
        setOpen={setRemoteServerEditDialogOpen}
        server={server}
      />
      <ConfirmDialog
        open={delConfirmDialogOpen}
        setOpen={setDelConfirmDialogOpen}
        title={t('Tools.DeleteConfirmation')}
        message={t('Tools.DeleteConfirmationInfo')}
        onConfirm={onDeleteServer}
      />
      {server && (
        <DetailDialog
          open={detailDialogOpen}
          setOpen={setDetailDialogOpen}
          server={server}
        />
      )}
      {mktServer && (
        <ToolInstallDialog
          server={mktServer}
          open={installDialogOpen}
          setOpen={setInstallDialogOpen}
        />
      )}
      <ToolMarketDrawer
        open={marketOpen}
        setOpen={setMarketOpen}
        onInstall={installServer}
      />
    </div>
  );
}
