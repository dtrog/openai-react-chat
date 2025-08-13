import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ModelSelect from '../ModelSelect';
import { UserContext } from '../../UserContext';
import type { AIModel } from '../../providers/types';

function renderWithUser(ctxValue: any, ui: React.ReactElement) {
  return render(
    <UserContext.Provider value={ctxValue}>{ui}</UserContext.Provider>
  );
}

const baseCtx = {
  userSettings: {
    userTheme: 'light',
    theme: 'light',
    model: null,
    instructions: '',
    speechModel: 'tts-1',
    speechVoice: 'echo',
    speechSpeed: 1.0,
    activeProvider: '',
    providerConfigs: {}
  },
  setUserSettings: () => {}
};

const sampleModels: AIModel[] = [
  { id: 'alpha', name: 'alpha', provider: 'x', contextWindow: 8000, knowledgeCutoff: '', imageSupport: false, preferred: true, deprecated: false },
  { id: 'beta', name: 'beta', provider: 'x', contextWindow: 16000, knowledgeCutoff: '', imageSupport: false, preferred: false, deprecated: false },
];

describe('ModelSelect', () => {
  it('is disabled and shows provider-first hint when no provider selected', () => {
    renderWithUser(baseCtx, <ModelSelect />);
    // Disabled select rendered
    expect(screen.getByText(/select a model/i)).toBeInTheDocument();
    expect(screen.getByText(/provider first/i)).toBeInTheDocument();
  });

  it('renders preferred models and allows show more/less toggling', async () => {
    const ctx = {
      ...baseCtx,
      userSettings: { ...baseCtx.userSettings, activeProvider: 'xai' }
    };

    renderWithUser(ctx, <ModelSelect models={sampleModels} />);

    // Preferred option visible (alpha) + Show more…
    expect(await screen.findByText('alpha')).toBeInTheDocument();
    const showMore = screen.getByText(/show more/i);
    fireEvent.mouseDown(screen.getByText(/select a model/i));
    fireEvent.click(showMore);

    // After show more, both alpha and beta should be present
    await waitFor(() => expect(screen.getByText('beta')).toBeInTheDocument());

    // Show fewer
    const showFewer = screen.getByText(/show fewer/i);
    fireEvent.click(showFewer);
    await waitFor(() => expect(screen.queryByText('beta')).not.toBeInTheDocument());
  });

  it('calls onModelSelect when a model is chosen', async () => {
    const onModelSelect = vi.fn();
    const ctx = {
      ...baseCtx,
      userSettings: { ...baseCtx.userSettings, activeProvider: 'xai' }
    };

    renderWithUser(ctx, <ModelSelect models={sampleModels} onModelSelect={onModelSelect} />);

    // open menu and choose alpha
    fireEvent.mouseDown(screen.getByText(/select a model/i));
    fireEvent.click(await screen.findByText('alpha'));

    await waitFor(() => expect(onModelSelect).toHaveBeenCalledWith('alpha'));
  });
});
