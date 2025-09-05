import { capitalize } from 'lodash';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IMCPServer } from 'types/mcp';

export default function ToolCapabilityTag(
  props: {
    server: IMCPServer;
    capability: 'prompts' | 'tools' | 'resources';
  } & any,
) {
  const { server, capability } = props;

  const support = useMemo(() => {
    return server.capabilities?.includes(capability) || false;
  }, [capability]);

  const { t } = useTranslation();

  const tagColorCls = useMemo<string>(() => {
    return (
      {
        resources:
          'bg-teal-50 dark:bg-teal-900 text-teal-600 dark:text-teal-300',
        tools:
          'bg-[#d8e6f1] dark:bg-[#365065] text-[#546576] dark:text-[#e3e9e5]',
        prompts:
          'bg-[#e6ddee] dark:bg-[#4e3868] text-[#9e7ebd] dark:text-[#d9d4de]',
      } as { [key: string]: string }
    )[capability];
  }, [capability]);

  return support ? (
    <div
      style={{ fontSize: '12px' }}
      className={`flex text-center justify-start gap-1 items-center rounded-full text-xs px-2 py-[2px] ${tagColorCls}`}
    >
      <span className="-mt-0.5">{t(`Tags.${capitalize(capability)}`)}</span>
    </div>
  ) : null;
}
