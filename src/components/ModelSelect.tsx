import React, { useContext, useEffect, useMemo, useState } from 'react';
import Select, { ActionMeta, MultiValue, SingleValue, StylesConfig } from 'react-select';
import { AIModel } from '../providers/types';
import { discoverProviderModels } from '../service/ModelDiscoveryService';
import { useTranslation } from 'react-i18next';
// import { DEFAULT_MODEL } from '../constants/appConstants';
import './ModelSelect.css';
import { UserContext } from '../UserContext';
import { ProviderManager } from '../providers/ProviderManager';

interface ModelSelectProps {
  onModelSelect?: (value: string | null) => void;
  models?: AIModel[];
  className?: string;
  value?: string | null;
}

type SelectOption = { label: string; value: string; info?: string; image_support?: boolean };

const ModelSelect: React.FC<ModelSelectProps> = ({ onModelSelect, models: externalModels, className, value = null }) => {
  const { userSettings } = useContext(UserContext);
  const { t } = useTranslation();

  const [models, setModels] = useState<AIModel[]>([]);
  const [selected, setSelected] = useState<SelectOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  const MORE = 'more';
  const LESS = 'less';

  const hasProvider = Boolean(userSettings.activeProvider);

  useEffect(() => {
    if (externalModels && externalModels.length) {
      setModels(externalModels);
      return;
    }
    if (!hasProvider) {
      setModels([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const providerConfig = userSettings.providerConfigs.find(
          (p) => p.name === userSettings.activeProvider
        );
        if (!providerConfig) {
          setModels([]);
          setLoading(false);
          return;
        }
        const list = await discoverProviderModels(userSettings.activeProvider, providerConfig);
        setModels(list);
      } catch (e) {
        console.error('Error fetching models', e);
        setModels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [externalModels, hasProvider, userSettings.activeProvider, userSettings.providerConfigs]);

  const preferred = useMemo(() => models.filter(m => m.preferred && !m.deprecated), [models]);
  const allNonDeprecated = useMemo(() => models.filter(m => !m.deprecated), [models]);

  const toOption = (m: AIModel): SelectOption => ({
    value: m.id,
    label: m.id,
    info: `${Math.round(m.contextWindow / 1000)}k`,
    image_support: m.imageSupport,
  });

  const compactOptions = useMemo<SelectOption[]>(() => {
    const opts = preferred.map(toOption);
    if (allNonDeprecated.length > preferred.length) {
      opts.push({ value: MORE, label: t('show-more-models') || 'Show more…' });
    }
    return opts;
  }, [preferred, allNonDeprecated.length, t]);

  const fullOptions = useMemo<SelectOption[]>(() => {
    const opts = allNonDeprecated.map(toOption);
    if (preferred.length && allNonDeprecated.length > preferred.length) {
      opts.push({ value: LESS, label: t('show-fewer-models') || 'Show fewer' });
    }
    return opts;
  }, [preferred.length, allNonDeprecated, t]);

  const [options, setOptions] = useState<SelectOption[]>(compactOptions);
  useEffect(() => setOptions(compactOptions), [compactOptions]);

  useEffect(() => {
    if (!models.length) {
      setSelected(null);
      return;
    }
  const target = value || preferred[0]?.id || allNonDeprecated[0]?.id || null;
    if (!target) {
      setSelected(null);
      return;
    }
    const found = models.find(m => m.id === target);
    setSelected(found ? toOption(found) : toOption(models[0]));
  }, [models, value, preferred, allNonDeprecated]);

  const isDark = userSettings.userTheme === 'dark';
  const customStyles: StylesConfig<SelectOption, false> = {
    option: (provided, state) => ({
      ...provided,
      color: state.data.value === MORE || state.data.value === LESS ? 'var(--primary)' : isDark ? 'white' : 'black',
      backgroundColor: isDark
        ? state.isSelected
          ? '#4A5568'
          : state.isFocused
            ? '#2D3748'
            : '#1A202C'
        : state.isSelected
          ? '#edf2f7'
          : state.isFocused
            ? '#F2F2F2'
            : provided.backgroundColor,
    }),
    control: (p) => ({
      ...p,
      backgroundColor: isDark ? '#2D3748' : 'white',
      borderColor: isDark ? '#4A5568' : '#E2E8F0',
    }),
    singleValue: (p) => ({ ...p, color: isDark ? 'white' : 'black' }),
    menu: (p) => ({ ...p, backgroundColor: isDark ? '#1A202C' : p.backgroundColor }),
  };

  const onChange = (opt: SingleValue<SelectOption> | MultiValue<SelectOption>, _meta: ActionMeta<SelectOption>) => {
    if (!opt || Array.isArray(opt)) return;
    const choice = opt as SelectOption;
    if (choice.value === MORE) {
      setOptions(fullOptions);
      setMenuIsOpen(true);
      return;
    }
    if (choice.value === LESS) {
      setOptions(compactOptions);
      setMenuIsOpen(true);
      return;
    }
    setSelected(choice);
    onModelSelect?.(choice.value);
  };

  if (!hasProvider) {
    return (
      <div className={className}>
        <Select
          isDisabled
          className="model-toggle-select"
          options={[]}
          placeholder={t('select-provider-first') || 'Please select a provider first.'}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Select
        className="model-toggle-select"
        options={options}
        value={selected}
        onChange={onChange}
        isSearchable
        isLoading={loading}
        placeholder={t('select-a-model') || 'Select a model'}
        styles={customStyles}
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => setMenuIsOpen(false)}
      />
    </div>
  );
};

export default ModelSelect;
