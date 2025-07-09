import {
  Button,
  Field,
  SpinButton,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  SpinButtonChangeEvent,
  SpinButtonOnChangeData,
  PopoverProps,
} from '@fluentui/react-components';
import Mousetrap from 'mousetrap';
import {
  bundleIcon,
  NumberSymbolSquare20Filled,
  NumberSymbolSquare20Regular,
} from '@fluentui/react-icons';
// import Debug from 'debug';
import { IChat, IChatContext } from 'intellichat/types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useChatStore from 'stores/useChatStore';
import { str2int } from 'utils/util';
import { DEFAULT_MAX_TOKENS, MAX_TOKENS } from 'consts';

// const debug = Debug('5ire:pages:chat:Editor:Toolbar:MaxTokensCtrl');

const NumberSymbolSquareIcon = bundleIcon(
  NumberSymbolSquare20Filled,
  NumberSymbolSquare20Regular,
);

export default function MaxTokensCtrl({
  ctx,
  chat,
  onConfirm,
  disabled,
}: {
  ctx: IChatContext;
  chat: IChat;
  onConfirm: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const editStage = useChatStore((state) => state.editStage);

  const modelMaxTokens = useMemo(() => {
    const model = ctx.getModel();
    if (model && model.maxTokens) {
      return model.maxTokens;
    }
    return MAX_TOKENS;
  }, [chat.model]);

  const curMaxTokens = useMemo<number>(() => {
    return Math.min(chat.maxTokens || MAX_TOKENS, modelMaxTokens);
  }, [chat.id, chat.model]);

  const [maxTokens, setMaxTokens] = useState<number>(curMaxTokens);

  useEffect(() => {
    Mousetrap.bind('mod+shift+4', () => {
      setOpen((prevOpen) => {
        return !prevOpen;
      });
    });
    setMaxTokens(curMaxTokens || DEFAULT_MAX_TOKENS);
    return () => {
      Mousetrap.unbind('mod+shift+4');
    };
  }, [chat.id, curMaxTokens]);

  const handleOpenChange: PopoverProps['onOpenChange'] = (e, data) =>
    setOpen(data.open || false);

  const updateMaxTokens = async (
    ev: SpinButtonChangeEvent,
    data: SpinButtonOnChangeData,
  ) => {
    const value = data.value
      ? data.value
      : str2int(data.displayValue as string);
    console.log('updateMaxTokens>>>>>>>>>>>>>', value);
    const $maxToken = Math.max(Math.min(value as number, modelMaxTokens), 1);
    await editStage(chat.id, { maxTokens: $maxToken });
    setMaxTokens($maxToken);
    onConfirm();
    window.electron.ingestEvent([{ app: 'modify-max-tokens' }]);
  };

  return (
    <Popover open={open} trapFocus withArrow onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <Button
          disabled={disabled}
          size="small"
          title={`${t('Common.MaxTokens')}(Mod+Shift+4)`}
          aria-label={t('Common.MaxTokens')}
          appearance="subtle"
          onClick={() => setOpen((prevOpen) => !prevOpen)}
          icon={<NumberSymbolSquareIcon />}
          className={`justify-start text-color-secondary flex-shrink-0 ${disabled ? 'opacity-50' : ''}`}
          style={{
            padding: 1,
            minWidth: 20,
            borderColor: 'transparent',
            boxShadow: 'none',
          }}
        >
          {maxTokens || null}
        </Button>
      </PopoverTrigger>
      <PopoverSurface aria-labelledby="max tokens">
        <div className="w-64">
          <Field
            label={`${t('Common.MaxTokens')}(≤${modelMaxTokens})`}
            style={{ borderColor: 'transparent', boxShadow: 'none' }}
          >
            <SpinButton
              precision={0}
              step={1}
              min={1}
              max={modelMaxTokens}
              value={maxTokens}
              id="maxTokens"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
              placeholder={`${
                t('Common.NoMoreThan') as string
              } ${modelMaxTokens}`}
              onChange={updateMaxTokens}
            />
          </Field>
          <div className="mt-1.5 text-xs tips">
            {t(`Toolbar.Tip.MaxTokens`)}
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
}
