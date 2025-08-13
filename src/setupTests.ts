// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock i18next/react-i18next so components can call useTranslation in tests
vi.mock('react-i18next', async () => {
	const actual = await vi.importActual<any>('react-i18next');
	return {
		...actual,
		useTranslation: () => ({
			t: (key: string) => key,
			i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
		}),
		initReactI18next: { type: '3rdParty', init: () => {} },
		Trans: ({ children }: any) => children,
	};
});

// jsdom doesn't implement matchMedia reliably; provide a minimal mock
if (typeof window.matchMedia !== 'function') {
	// @ts-ignore
	window.matchMedia = (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	});
}

// Mock ResizeObserver used by Radix UI
class MockResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
// @ts-ignore
global.ResizeObserver = global.ResizeObserver || MockResizeObserver as any;

// No Radix mocks needed now that components avoid Tooltip in tests
