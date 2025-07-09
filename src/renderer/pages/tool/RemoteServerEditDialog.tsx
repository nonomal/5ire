import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogTrigger,
  DialogBody,
  Button,
  Field,
  Input,
  DialogActions,
  InputOnChangeData,
  InfoLabel,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import {
  AddCircleRegular,
  Dismiss24Regular,
  SubtractCircleRegular,
} from '@fluentui/react-icons';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import 'highlight.js/styles/atom-one-light.css';
import { IMCPServer } from 'types/mcp';
import useMarkdown from 'hooks/useMarkdown';
import { isValidHttpHRL, isValidMCPServerKey } from 'utils/validators';
import useMCPStore from 'stores/useMCPStore';
import useToast from 'hooks/useToast';

export default function ToolEditDialog(options: {
  server: IMCPServer | null;
  open: boolean;
  setOpen: Function;
}) {
  const { t } = useTranslation();
  const { render } = useMarkdown();
  const { notifySuccess, notifyError } = useToast();
  const { server, open, setOpen } = options;
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [headerName, setHeaderName] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [headers, setHeaders] = useState<{ [key: string]: string }>({});
  const { addServer, updateServer } = useMCPStore();

  const [keyValidationState, setKeyValidationState] = useState<
    'none' | 'error'
  >('none');
  const [urlValidationState, setUrlValidationState] = useState<
    'none' | 'error'
  >('none');

  const config: IMCPServer = useMemo(() => {
    const payload: any = {};
    if (name.trim() !== '') {
      payload.name = name;
    }
    if (key.trim() !== '') {
      payload.key = key;
    }
    if (description.trim() !== '') {
      payload.description = description;
    }
    if (url) {
      payload.url = url;
    }
    if (Object.keys(headers).length > 0) {
      payload.headers = headers;
    }
    if (headerName.trim() !== '' && headerValue.trim() !== '') {
      payload.headers = { ...headers, [headerName.trim()]: headerValue.trim() };
    }
    return payload;
  }, [name, key, description, url, headers, headerName, headerValue]);

  const addHeader = useCallback(() => {
    if (headerName.trim() === '' || headerValue.trim() === '') {
      return;
    }
    setHeaders((_headers) => ({
      ..._headers,
      [headerName.trim()]: headerValue.trim(),
    }));
    setHeaderName('');
    setHeaderValue('');
  }, [headerName, headerValue]);

  const submit = useCallback(async () => {
    let isValid = true;
    if (!isValidMCPServerKey(key)) {
      setKeyValidationState('error');
      isValid = false;
    } else {
      setKeyValidationState('none');
    }
    if (!isValidHttpHRL(url)) {
      setUrlValidationState('error');
      isValid = false;
    } else {
      setUrlValidationState('none');
    }
    if (!isValid) {
      return;
    }
    const upset = server ? updateServer : addServer;
    config.type = 'remote';
    const ok = await upset(config);
    if (ok) {
      setOpen(false);
      notifySuccess('Server saved successfully');
    } else {
      notifyError(server ? 'Cannot update server' : 'Server already exists');
    }
  }, [name, key, description, url, headers, headerName, headerValue, server]);

  useEffect(() => {
    if (open && server) {
      setName(server.name || '');
      setKey(server.key);
      setDescription(server.description || '');
      setUrl(server.url || '');
      setHeaders(server.headers || {});
    }

    return () => {
      setName('');
      setKey('');
      setDescription('');
      setUrl('');
      setHeaderName('');
      setHeaderValue('');
      setHeaders({});
    };
  }, [open, server]);

  return (
    <div>
      <Dialog open={open}>
        <DialogSurface mountNode={document.body.querySelector('#portal')}>
          <DialogBody>
            <DialogTitle
              action={
                <DialogTrigger action="close">
                  <Button
                    onClick={() => setOpen(false)}
                    appearance="subtle"
                    aria-label="close"
                    icon={<Dismiss24Regular />}
                  />
                </DialogTrigger>
              }
            >
              <div className="flex flex-start justify-start items-baseline gap-2">
                <span>{server ? t('Tools.Edit') : t('Tools.New')}</span>
                <span className="text-sm text-gray-500">
                  ({t('Tools.RemoteServer')})
                </span>
              </div>
            </DialogTitle>
            <DialogContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Field
                    validationState={keyValidationState}
                    validationMessage={
                      keyValidationState === 'none'
                        ? ''
                        : t('Tools.InvalidMCPServerKey')
                    }
                  >
                    <InfoLabel
                      className="mb-[7px]"
                      info={
                        server ? t('Tools.KeyCannotUpdate') : t('Tools.KeyHint')
                      }
                    >
                      {t('Tools.Key')}
                    </InfoLabel>
                    <Input
                      disabled={!!server}
                      className="w-full min-w-fit"
                      placeholder={t('Common.Required')}
                      value={key}
                      onChange={(
                        _: ChangeEvent<HTMLInputElement>,
                        data: InputOnChangeData,
                      ) => {
                        setKey(data.value);
                        if (!data.value || isValidMCPServerKey(data.value)) {
                          setKeyValidationState('none');
                        } else {
                          setKeyValidationState('error');
                        }
                      }}
                    />
                  </Field>
                </div>
                <div>
                  <Field label={t('Tools.Name')}>
                    <Input
                      className="w-full min-w-fit"
                      placeholder={t('Common.Optional')}
                      value={name}
                      onChange={(
                        _: ChangeEvent<HTMLInputElement>,
                        data: InputOnChangeData,
                      ) => {
                        setName(data.value);
                      }}
                    />
                  </Field>
                </div>
              </div>
              <div>
                <Field label={t('Common.Description')}>
                  <Input
                    className="w-full min-w-fit"
                    placeholder={t('Common.Optional')}
                    value={description}
                    onChange={(
                      _: ChangeEvent<HTMLInputElement>,
                      data: InputOnChangeData,
                    ) => {
                      setDescription(data.value);
                    }}
                  />
                </Field>
              </div>
              <div>
                <Field
                  label={t('Common.URL')}
                  validationMessage={
                    urlValidationState === 'none'
                      ? ''
                      : `${t('Tools.Hint.UrlIsRequired')}`
                  }
                  validationState={urlValidationState}
                >
                  <Input
                    className="w-full min-w-fit"
                    placeholder={t('Common.Required')}
                    value={url}
                    onInput={(event: ChangeEvent<HTMLInputElement>) => {
                      const val = event.target.value;
                      setUrl(val);
                      if (val.trim() === '') {
                        setUrlValidationState('error');
                      } else {
                        setUrlValidationState('none');
                      }
                    }}
                  />
                </Field>
              </div>
              <div>
                <Field label={t('Common.HttpHeaders')}>
                  <div className="bg-gray-50 dark:bg-neutral-800 border rounded border-base">
                    <div className="flex flex-start items-center border-b border-base px-1 py-1">
                      <div className="w-5/12">{t('Common.Name')}</div>
                      <div className="w-6/12">{t('Common.Value')}</div>
                      <div />
                    </div>
                    <div className="flex flex-start items-center border-b border-base px-1 p-1">
                      <div className="w-5/12 px-1">
                        <Input
                          className="w-full"
                          size="small"
                          value={headerName || ''}
                          onChange={(
                            _: ChangeEvent<HTMLInputElement>,
                            data: InputOnChangeData,
                          ) => {
                            setHeaderName(data.value);
                          }}
                        />
                      </div>
                      <div className="w-6/12 px-1">
                        <Input
                          className="w-full"
                          size="small"
                          value={headerValue || ''}
                          onChange={(
                            _: ChangeEvent<HTMLInputElement>,
                            data: InputOnChangeData,
                          ) => {
                            setHeaderValue(data.value);
                          }}
                        />
                      </div>
                      <div>
                        <Button
                          appearance="subtle"
                          onClick={addHeader}
                          icon={<AddCircleRegular />}
                          size="small"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto min-h-6 max-h-40 flex flex-col">
                      {Object.keys(headers).map((envKey: string) => (
                        <div
                          key={envKey}
                          className="flex flex-start items-center [&:not(:last-child)]:border-b px-1"
                        >
                          <div className="w-[215px] mx-1.5 text-xs overflow-hidden text-nowrap truncate flex-grow-0">
                            {envKey}
                          </div>
                          <div className="w-[261px] mx-1 text-xs overflow-hidden text-nowrap truncate flex-grow-0">
                            {headers[envKey]}
                          </div>
                          <div>
                            <Button
                              appearance="subtle"
                              icon={<SubtractCircleRegular />}
                              size="small"
                              onClick={() => {
                                const newEnv = { ...headers };
                                delete newEnv[envKey];
                                setHeaders(newEnv);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Field>
              </div>
              <div>
                <Field label={t('Tools.ConfigPreview')} hint="in JSON format">
                  <div
                    className="border rounded border-base text-xs"
                    dangerouslySetInnerHTML={{
                      __html: render(
                        `\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``,
                      ),
                    }}
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="subtle" onClick={() => setOpen(false)}>
                {t('Common.Cancel')}
              </Button>
              <Button type="submit" appearance="primary" onClick={submit}>
                {t('Common.Save')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
