import React from 'react';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import App from './App';
import {OpenConversationsFile} from '../wailsjs/go/main/App';
import {formatConversationTimestamp, formatMessageTimestamp} from './utils/timestamps';
import type {models} from '../wailsjs/go/models';

vi.mock('../wailsjs/go/main/App', () => ({
    OpenConversationsFile: vi.fn()
}));

const mockedOpenConversationsFile = vi.mocked(OpenConversationsFile);

type ConversationEntry = models.ConversationEntry;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const sortableEntries: ConversationEntry[] = [
    {
        conversationId: 'conv-zulu',
        conversationName: 'Zulu',
        conversationCreatedAt: '2026-01-04T00:00:00Z',
        speaker: 'assistant',
        message: 'Message Zulu',
        messageTimestamp: '2026-01-04T00:00:00Z'
    },
    {
        conversationId: 'conv-empty',
        conversationName: '   ',
        conversationCreatedAt: '2026-01-01T00:00:00Z',
        speaker: 'assistant',
        message: 'Message Untitled',
        messageTimestamp: '2026-01-01T00:00:00Z'
    },
    {
        conversationId: 'conv-symbol',
        conversationName: '#Hash',
        conversationCreatedAt: '2026-01-02T00:00:00Z',
        speaker: 'assistant',
        message: 'Message Symbol',
        messageTimestamp: '2026-01-02T00:00:00Z'
    },
    {
        conversationId: 'conv-utf8',
        conversationName: 'Álpha',
        conversationCreatedAt: '2026-01-03T00:00:00Z',
        speaker: 'assistant',
        message: 'Message UTF8',
        messageTimestamp: '2026-01-03T00:00:00Z'
    }
];

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
                conversationCreatedAt: '2025-09-19T04:41:47.942021Z',
                speaker: 'human',
                message: 'How do I export data?',
                messageTimestamp: '2025-09-19T04:41:47.942021Z'
            },
            {
                conversationId: 'conv-1',
                conversationName: 'Setup',
                conversationCreatedAt: '2025-09-19T04:41:47.942021Z',
                speaker: 'assistant',
                message: 'Open Settings and click Export data.',
                messageTimestamp: '2025-09-19T04:42:10.100000Z'
            },
            {
                conversationId: 'conv-2',
                conversationName: 'Another chat',
                conversationCreatedAt: '2025-09-19T05:01:00.000000Z',
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
        expect(within(setupAccordion).getByText(`(${formatConversationTimestamp('2025-09-19T04:41:47.942021Z')})`)).toBeTruthy();

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

    it('defaults to created oldest sorting and cycles all sort modes', async () => {
        mockedOpenConversationsFile.mockResolvedValue(sortableEntries);

        render(<App />);
        fireEvent.click(screen.getByRole('button', {name: 'Open conversations export'}));

        await waitFor(() => {
            expect(screen.getAllByTestId('conversation-title').length).toBe(4);
        });

        const getConversationTitles = () => screen
            .getAllByTestId('conversation-title')
            .map((element) => element.textContent);

        const sortButton = screen.getByRole('button', {name: /sorted by/i});
        expect(sortButton.textContent).toBe('Sorted by Created (oldest)');
        expect(getConversationTitles()[0]).toBe('Untitled conversation');

        fireEvent.click(sortButton);
        expect(sortButton.textContent).toBe('Sorted by Created (newest)');
        expect(getConversationTitles()[0]).toBe('Zulu');

        fireEvent.click(sortButton);
        expect(sortButton.textContent).toBe('Sorted by Name (A-Z)');
        expect(getConversationTitles()[0]).toBe('Untitled conversation');

        fireEvent.click(sortButton);
        expect(sortButton.textContent).toBe('Sorted by Name (Z-A)');
        expect(getConversationTitles()[0]).toBe('Untitled conversation');

        fireEvent.click(sortButton);
        expect(sortButton.textContent).toBe('Sorted by Created (oldest)');
    });

    it.each(Array.from({length: 16}, (_, mask) => mask))(
        'keeps expanded states and visible messages when sorting (mask %s)',
        async (mask) => {
            mockedOpenConversationsFile.mockResolvedValue(sortableEntries);

            render(<App />);
            fireEvent.click(screen.getByRole('button', {name: 'Open conversations export'}));

            await waitFor(() => {
                expect(screen.getAllByTestId('conversation-title').length).toBe(4);
            });

            const titles = [
                'Untitled conversation',
                '#Hash',
                'Álpha',
                'Zulu'
            ];

            const messageByTitle: Record<string, string> = {
                'Untitled conversation': 'Message Untitled',
                '#Hash': 'Message Symbol',
                'Álpha': 'Message UTF8',
                'Zulu': 'Message Zulu'
            };

            for (let index = 0; index < titles.length; index += 1) {
                if (((mask >> index) & 1) === 1) {
                    fireEvent.click(
                        screen.getByRole('button', {name: new RegExp(escapeRegExp(titles[index]), 'i')})
                    );
                }
            }

            const expandedBeforeSort: Record<string, string | null> = {};
            for (const title of titles) {
                const header = screen.getByRole('button', {name: new RegExp(escapeRegExp(title), 'i')});
                expandedBeforeSort[title] = header.getAttribute('aria-expanded');
            }

            fireEvent.click(screen.getByRole('button', {name: /sorted by created \(oldest\)/i}));

            for (const title of titles) {
                const header = screen.getByRole('button', {name: new RegExp(escapeRegExp(title), 'i')});
                expect(header.getAttribute('aria-expanded')).toBe(expandedBeforeSort[title]);

                if (expandedBeforeSort[title] === 'true') {
                    expect(screen.getByText(messageByTitle[title])).toBeTruthy();
                    continue;
                }

                expect(screen.queryByText(messageByTitle[title])).toBeNull();
            }
        }
    );

    it('collapses all conversations again when a new file is loaded', async () => {
        mockedOpenConversationsFile
            .mockResolvedValueOnce(sortableEntries)
            .mockResolvedValueOnce([
                {
                    conversationId: 'conv-next',
                    conversationName: 'Next export',
                    conversationCreatedAt: '2026-02-01T00:00:00Z',
                    speaker: 'assistant',
                    message: 'Fresh message',
                    messageTimestamp: '2026-02-01T00:00:00Z'
                }
            ]);

        render(<App />);
        fireEvent.click(screen.getByRole('button', {name: 'Open conversations export'}));

        await waitFor(() => {
            expect(screen.getByRole('button', {name: /untitled conversation/i})).toBeTruthy();
        });
        fireEvent.click(screen.getByRole('button', {name: /untitled conversation/i}));
        expect(screen.getByText('Message Untitled')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', {name: 'Open conversations export'}));

        await waitFor(() => {
            expect(screen.getByRole('button', {name: /next export/i})).toBeTruthy();
        });

        const nextHeader = screen.getByRole('button', {name: /next export/i});
        expect(nextHeader.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('Fresh message')).toBeNull();
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
                conversationCreatedAt: '2025-09-19T04:41:47.942021Z',
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
