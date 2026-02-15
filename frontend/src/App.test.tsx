import React from 'react';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import App from './App';
import {OpenConversationsFile} from '../wailsjs/go/main/App';

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
                message: 'How do I export data?'
            },
            {
                conversationId: 'conv-1',
                conversationName: 'Setup',
                speaker: 'assistant',
                message: 'Open Settings and click Export data.'
            },
            {
                conversationId: 'conv-2',
                conversationName: 'Another chat',
                speaker: 'assistant',
                message: 'Separate conversation.'
            }
        ]);

        render(<App />);

        fireEvent.click(screen.getByRole('button', {name: 'Open conversations.json'}));

        await waitFor(() => {
            expect(mockedOpenConversationsFile).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText('3 messages loaded across 2 conversations.')).toBeTruthy();
        });

        const setupAccordion = screen.getByRole('button', {name: /setup/i});
        expect(within(setupAccordion).getByText('2 messages')).toBeTruthy();

        expect(screen.queryByText('How do I export data?')).toBeNull();
        fireEvent.click(setupAccordion);

        await waitFor(() => {
            expect(screen.getByText('How do I export data?')).toBeTruthy();
        });
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
                message: 'This appears first in the file.'
            },
            {
                conversationId: 'conv-a',
                conversationName: 'First in alphabet',
                speaker: 'human',
                message: 'This appears second in the file.'
            }
        ]);

        render(<App />);
        fireEvent.click(screen.getByRole('button', {name: 'Open conversations.json'}));

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

        fireEvent.click(screen.getByRole('button', {name: 'Open conversations.json'}));

        await waitFor(() => {
            expect(mockedOpenConversationsFile).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText('Failed to read file')).toBeTruthy();
        });

        // Ensure we still show the default empty state or at least not a crash
        expect(screen.getByText('No messages loaded.')).toBeTruthy();
    });
});
