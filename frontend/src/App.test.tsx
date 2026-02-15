import React from 'react';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
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
        expect(screen.getByText('Choose a file to start exploring messages.')).toBeTruthy();
    });

    it('loads and renders messages after opening conversations.json', async () => {
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
            }
        ]);

        render(<App />);

        fireEvent.click(screen.getByRole('button', {name: 'Open conversations.json'}));

        await waitFor(() => {
            expect(mockedOpenConversationsFile).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(screen.getByText('2 messages loaded.')).toBeTruthy();
        });

        expect(screen.getByText('How do I export data?')).toBeTruthy();
        expect(screen.getByText('Open Settings and click Export data.')).toBeTruthy();
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
