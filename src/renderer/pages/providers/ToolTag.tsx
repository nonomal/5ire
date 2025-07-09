import { Tooltip } from '@fluentui/react-components';
import { isUndefined } from 'lodash';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useProviderStore from 'stores/useProviderStore';
import useSettingsStore from 'stores/useSettingsStore';

export default function ToolTag(
  props: {
    providerName: string;
    modelName: string;
  } & any,
) {
  const { providerName, modelName, ...rest } = props;
  const { getToolState } = useSettingsStore();
  const { providers } = useProviderStore();

  const originalSupport = useMemo(() => {
    const provider = providers[providerName];
    if (!provider) return false;
    const model = provider.models.find((m) => m.name === modelName);
    if (!model) return false;
    return !!model.capabilities?.tools || false;
  }, [providerName, modelName]);

  const actualSupport = useMemo(() => {
    let toolState = getToolState(providerName, modelName);
    if (isUndefined(toolState)) {
      toolState = originalSupport;
    }
    return toolState;
  }, [providerName, modelName, originalSupport]);

  const { t } = useTranslation();
  const tip = t(actualSupport ? 'Tool.Supported' : 'Tool.NotSupported');

  return (
    <Tooltip
      content={{
        children: tip,
      }}
      positioning="above-start"
      withArrow
      relationship="label"
      {...rest}
    >
      <div className="flex text-center justify-start gap-1 items-center rounded-lg text-xs text-gray-800 dark:text-gray-400 bg-gray-100 dark:bg-stone-800 pl-1.5 pr-1">
        {t('Tags.Tools')}
        <span
          className={
            actualSupport
              ? 'text-green-400 dark:text-green-700'
              : 'text-gray-400 dark:text-gray-600'
          }
        >
          ●
        </span>
      </div>
    </Tooltip>
  );
}
