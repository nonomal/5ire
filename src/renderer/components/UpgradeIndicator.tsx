import { useEffect, useState } from 'react';
import { t } from 'i18next';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
} from '@fluentui/react-components';
import { CheckmarkCircle16Regular } from '@fluentui/react-icons';
import Spinner from './Spinner';

export default function UpgradeIndicator() {
  const [completed, setCompleted] = useState<boolean>(false);
  const [upgrading, setUpgrading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // on windows. event will be sent before the listener is added, so we need to check if there is an update info
    const info = window.electron.store.get('updateInfo');
    if (info) {
      setUpgrading(info.isDownloading);
      setCompleted(!info.isDownloading);
      setVersion(info.version);
    }
    window.electron.ipcRenderer.on('app-upgrade-start', (data: any) => {
      if (data) {
        setUpgrading(true);
        setCompleted(false);
        setVersion(data.version);
      }
    });
    window.electron.ipcRenderer.on('app-upgrade-not-available', () => {
      setVersion('');
      setCompleted(false);
      setUpgrading(false);
    });
    window.electron.ipcRenderer.on('app-upgrade-end', () => {
      setUpgrading(false);
      setCompleted(true);
    });
    window.electron.ipcRenderer.on('app-upgrade-error', () => {
      setError(true);
    });

    return () => {
      window.electron.ipcRenderer.unsubscribeAll('app-upgrade-start');
      window.electron.ipcRenderer.unsubscribeAll('app-upgrade-not-available');
      window.electron.ipcRenderer.unsubscribeAll('app-upgrade-end');
      window.electron.ipcRenderer.unsubscribeAll('app-upgrade-error');
    };
  }, []);

  if (error) {
    return (
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <button
            type="button"
            className="upgrade-indicator flex justify-center items-center rounded-full px-2 py-0.5 bg-red-200 dark:bg-red-900 text-red-800  dark:text-red-400 text-xs"
            style={{ paddingBottom: 3 }}
          >
            <span>{t('Upgrade.Failed')}</span>
          </button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{t('Upgrade.Failed')}</DialogTitle>
            <DialogContent>{t('Upgrade.FailedInfo')}</DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">
                  {t('Common.Action.Close')}
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={() => window.electron.openExternal('https://5ire.app')}
              >
                {t('Common.Action.GoWebsite')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  }
  if (version) {
    if (upgrading) {
      return (
        <div className="upgrade-indicator flex justify-center items-center rounded-full pl-1 pr-2 py-0.5 bg-indigo-100 dark:bg-slate-600/50 text-indigo-800 dark:text-indigo-200 text-xs">
          <Spinner size={14} className="mr-2" />
          <span>v{version}</span>
        </div>
      );
    }
    return completed ? (
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <button
            type="button"
            className="upgrade-indicator flex justify-center items-center rounded-full pl-1 pr-2 py-0.5 bg-[#dbe9da] dark:bg-[#2b5239] text-green-800 dark:text-[#cad4cd] text-xs text-nowrap"
          >
            <CheckmarkCircle16Regular className="mr-1" />
            <span>
              v{version} {t('Upgrade.Ready')}
            </span>
          </button>
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              v{version} {t('Upgrade.Ready')}
            </DialogTitle>
            <DialogContent>{t('Upgrade.QuitAndInstall')}</DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">
                  {t('Common.Action.Close')}
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={() => window.electron.upgrade()}
              >
                {t('Upgrade.Install')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    ) : null;
  }
  return null;
}
