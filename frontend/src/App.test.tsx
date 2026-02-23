import React from 'react';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import App from './App';
import {OpenConversationsFile} from '../wailsjs/go/main/App';
import {formatMessageTimestamp} from './utils/timestamps';

vi.mock('../wailsjs/go/main/App', () => ({
    OpenConversationsFile: vi.fn()
}));

const mockedOpenConversationsFile = vi.mocked(OpenConversationsFile);

describe('App happy path', () => {
    beforeEach(() => {
        mockedOpenConversationsFile.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it('shows the initial empty state', () => {
        render(<App />);

        expect(screen.getByText('No messages loaded.')).toBeTruthy();
        expect(screen.getByText('Choose a file to start exploring conversations.')).toBeTruthy();
    });

    it('loads conversations collapsed by default and expands on demand', async () => {
        mockedOpenConversationsFile.mockResolvedValue([
            {
                conversationId: 'conv-1',
                conversationName: 'Setup',
                speaker: 'human',
                message: 'How do I export data?',
                messageTimestamp: '2025-09-19T04:41:47.942021Z'
            },
            {
                conversationId: 'conv-1',
                conversationName: 'Setup',
                speaker: 'assistant',
                message: 'Open Settings and click Export data.',
                messageTimestamp: '2025-09-19T04:42:10.100000Z'
            },
            {
                conversationId: 'conv-2',
                conversationName: 'Another chat',
                speaker: 'assistant',
                message: 'Separate conversation.',
                messageTimestamp: '2025-09-19T05:01:00.000000Z'
            }
        ]);

        render(<App />);

        fireEvent.click(screen.getByRole('button', {name: 'Open conversations export'}));

        await waitFor(() => {
            expect(mockedOpenConversationsFile).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText('3 messages loaded across 2 conversations.')).toBeTruthy();
        });

        const setupAccordion = screen.getByRole('button', {name: /setup/i});
        expect(within(setupAccordion).getByText('2 messages')).toBeTruthy();
        expect(within(setupAccordion).getByText('+')).toBeTruthy();

        expect(screen.queryByText('How do I export data?')).toBeNull();
        fireEvent.click(setupAccordion);

        await waitFor(() => {
            expect(screen.getByText('How do I export data?')).toBeTruthy();
        });
        expect(within(setupAccordion).getByText('-')).toBeTruthy();
        expect(screen.getByText(formatMessageTimestamp('2025-09-19T04:41:47.942021Z'))).toBeTruthy();
        expect(screen.getByText('Open Settings and click Export data.')).toBeTruthy();

        // Check chip colors
        const humanChip = screen.getByText('human').closest('.MuiChip-root');
        expect(humanChip?.className).toContain('MuiChip-colorWarning');

        const assistantChip = screen.getByText('assistant').closest('.MuiChip-root');
        expect(assistantChip?.className).toContain('MuiChip-colorSuccess');
    });

    it('preserves the order of conversations as they appear in loaded entries', async () => {
        mockedOpenConversationsFile.mockResolvedValue([
            {
                conversationId: 'conv-b',
                conversationName: 'Second in alphabet',
                speaker: 'assistant',
                message: 'This appears first in the file.',
                messageTimestamp: '2025-09-19T04:50:00.000000Z'
            },
            {
                conversationId: 'conv-a',
                conversationName: 'First in alphabet',
                speaker: 'human',
                message: 'This appears second in the file.',
                messageTimestamp: '2025-09-19T04:51:00.000000Z'
            }
        ]);

        render(<App />);
        fireEvent.click(screen.getByRole('button', {name: 'Open conversations export'}));

        await waitFor(() => {
            expect(screen.getAllByTestId('conversation-title').length).toBe(2);
        });

        const conversationTitles = screen
            .getAllByTestId('conversation-title')
            .map((element) => element.textContent);

        expect(conversationTitles).toEqual([
            'Second in alphabet',
            'First in alphabet'
        ]);
    });

    it('displays error message when loading fails', async () => {
        mockedOpenConversationsFile.mockRejectedValue(new Error('Failed to read file'));

        render(<App />);

        fireEvent.click(screen.getByRole('button', {name: 'Open conversations export'}));

        await waitFor(() => {
            expect(mockedOpenConversationsFile).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to read file')).toBeTruthy();
        });

        // Ensure we still show the default empty state or at least not a crash
        expect(screen.getByText('No messages loaded.')).toBeTruthy();
    });

    it('indicates loading state and updates last loaded timestamp', async () => {
        let resolvePromise: (value: any) => void = () => {};
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        mockedOpenConversationsFile.mockReturnValue(promise as any);

        render(<App />);

        const button = screen.getByRole('button', {name: 'Open conversations export'}) as HTMLButtonElement;
        fireEvent.click(button);

        expect(button.disabled).toBe(true);
        expect(button.textContent).toBe('Loading...');

        resolvePromise!([
            {
                conversationId: 'conv-1',
                conversationName: 'Loaded',
                speaker: 'human',
                message: 'Content',
                messageTimestamp: '2025-09-19T04:41:47.942021Z'
            }
        ]);

        await waitFor(() => {
            expect(button.disabled).toBe(false);
        });
        
        expect(button.textContent).toBe('Open conversations export');
        expect(screen.getByText(/Last load:/)).toBeTruthy();
    });
});
