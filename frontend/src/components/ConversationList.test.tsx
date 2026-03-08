import React from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ConversationList} from './ConversationList';
import type {ConversationThread} from '../models/conversations';

const {formatConversationTimestampMock, formatMessageTimestampMock} = vi.hoisted(() => ({
    formatConversationTimestampMock: vi.fn((timestamp: string | undefined) => `created:${timestamp ?? 'Unknown time'}`),
    formatMessageTimestampMock: vi.fn((timestamp: string | undefined) => timestamp ?? 'Unknown time')
}));

vi.mock('../utils/timestamps', () => ({
    formatConversationTimestamp: formatConversationTimestampMock,
    formatMessageTimestamp: formatMessageTimestampMock
}));

function conversationThread(overrides: Partial<ConversationThread>): ConversationThread {
    const conversationName = overrides.conversationName ?? '';
    const conversationCreatedAt = overrides.conversationCreatedAt ?? '';

    return {
        conversationId: overrides.conversationId ?? '',
        conversationName,
        conversationRawName: overrides.conversationRawName ?? conversationName.trim(),
        conversationCreatedAt,
        conversationCreatedAtUnixMilliseconds: overrides.conversationCreatedAtUnixMilliseconds ?? null,
        messages: overrides.messages ?? []
    };
}

const mockConversations: ConversationThread[] = [
    conversationThread({
        conversationId: 'conv-1',
        conversationName: 'First Conversation',
        conversationCreatedAt: '2025-09-19T04:41:47.942021Z',
        conversationCreatedAtUnixMilliseconds: Date.parse('2025-09-19T04:41:47.942021Z'),
        messages: [
            {
                conversationId: 'conv-1',
                conversationName: 'First Conversation',
                speaker: 'human',
                message: 'Hello',
                messageTimestamp: '2025-09-19T04:41:47.942021Z'
            }
        ]
    }),
    conversationThread({
        conversationId: 'conv-2',
        conversationName: 'Second Conversation',
        conversationCreatedAt: '2025-09-19T04:42:47.942021Z',
        conversationCreatedAtUnixMilliseconds: Date.parse('2025-09-19T04:42:47.942021Z'),
        messages: [
            {
                conversationId: 'conv-2',
                conversationName: 'Second Conversation',
                speaker: 'assistant',
                message: 'Hi there',
                messageTimestamp: '2025-09-19T04:42:47.942021Z'
            }
        ]
    })
];

describe('ConversationList', () => {
    afterEach(() => {
        cleanup();
        formatConversationTimestampMock.mockClear();
        formatMessageTimestampMock.mockClear();
    });

    it('renders a list of conversations collapsed by default', () => {
        render(<ConversationList conversations={mockConversations} conversationSetVersion={0} />);

        expect(screen.getByText('First Conversation')).toBeTruthy();
        expect(screen.getByText('Second Conversation')).toBeTruthy();
        expect(screen.getByText('(created:2025-09-19T04:41:47.942021Z)')).toBeTruthy();
        expect(screen.getByText('(created:2025-09-19T04:42:47.942021Z)')).toBeTruthy();
        expect(formatConversationTimestampMock).toHaveBeenCalledWith('2025-09-19T04:41:47.942021Z');
        expect(formatConversationTimestampMock).toHaveBeenCalledWith('2025-09-19T04:42:47.942021Z');

        // Messages should not be visible initially
        expect(screen.queryByText('Hello')).toBeNull();
        expect(screen.queryByText('Hi there')).toBeNull();
    });

    it('expands a conversation when clicked', () => {
        render(<ConversationList conversations={mockConversations} conversationSetVersion={0} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);

        expect(screen.getByText('Hello')).toBeTruthy();
        
        // Second one should still be collapsed
        expect(screen.queryByText('Hi there')).toBeNull();
    });

    it('collapses an expanded conversation when clicked again', () => {
        render(<ConversationList conversations={mockConversations} conversationSetVersion={0} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);
        expect(screen.getByText('Hello')).toBeTruthy();

        fireEvent.click(firstHeader);
        // Wait for collapse transition or check visibility. 
        // MUI Accordion might keep content in DOM but hidden.
        // However, we can check if the button aria-expanded is false.
        expect(firstHeader.getAttribute('aria-expanded')).toBe('false');
    });

    it('resets expansion state when conversation set version changes', () => {
        const {rerender} = render(<ConversationList conversations={mockConversations} conversationSetVersion={1} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);
        expect(firstHeader.getAttribute('aria-expanded')).toBe('true');

        // Update props with new conversations (simulating loading a new file)
        const newConversations: ConversationThread[] = [
            conversationThread({
                conversationId: 'conv-3',
                conversationName: 'Third Conversation',
                conversationRawName: 'Third Conversation',
                messages: []
            })
        ];

        rerender(<ConversationList conversations={newConversations} conversationSetVersion={2} />);

        // The old conversation should be gone
        expect(screen.queryByText('First Conversation')).toBeNull();
        
        // The new one should be present and collapsed
        const thirdHeader = screen.getByRole('button', {name: /Third Conversation/i});
        expect(thirdHeader.getAttribute('aria-expanded')).toBe('false');
    });
    
    it('preserves expansion state when conversations are re-ordered with the same set version', () => {
         const {rerender} = render(<ConversationList conversations={mockConversations} conversationSetVersion={1} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);
        expect(firstHeader.getAttribute('aria-expanded')).toBe('true');

        rerender(<ConversationList conversations={[...mockConversations].reverse()} conversationSetVersion={1} />);

        const reRenderedHeader = screen.getByRole('button', {name: /First Conversation/i});
        expect(reRenderedHeader.getAttribute('aria-expanded')).toBe('true');
    });

    it('renders speaker chips with correct semantic colors', () => {
        render(<ConversationList conversations={mockConversations} conversationSetVersion={0} />);

        // Expand first conversation (human)
        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);

        // Find the chip for "human"
        // Note: We use getByText to find the chip label. 
        // We need to ensure we get the chip, not just text.
        // The Chip component renders a div with class MuiChip-root.
        const humanChip = screen.getByText('human').closest('.MuiChip-root');
        expect(humanChip).toBeTruthy();
        expect(humanChip?.className).toContain('MuiChip-colorWarning');

        // Expand second conversation (assistant)
        const secondHeader = screen.getByRole('button', {name: /Second Conversation/i});
        fireEvent.click(secondHeader);

        const assistantChip = screen.getByText('assistant').closest('.MuiChip-root');
        expect(assistantChip).toBeTruthy();
        expect(assistantChip?.className).toContain('MuiChip-colorSuccess');
    });

    it('treats chatgpt user role chip as warning color', () => {
        const chatGPTConversation: ConversationThread[] = [
            conversationThread({
                conversationId: 'conv-chatgpt',
                conversationName: 'ChatGPT Conversation',
                conversationRawName: 'ChatGPT Conversation',
                conversationCreatedAt: '2025-09-19T04:41:47.942021Z',
                conversationCreatedAtUnixMilliseconds: Date.parse('2025-09-19T04:41:47.942021Z'),
                messages: [
                    {
                        conversationId: 'conv-chatgpt',
                        conversationName: 'ChatGPT Conversation',
                        speaker: 'user',
                        message: 'ChatGPT user message',
                        messageTimestamp: '2025-09-19T04:41:47.942021Z'
                    }
                ]
            })
        ];

        render(<ConversationList conversations={chatGPTConversation} conversationSetVersion={0} />);

        const header = screen.getByRole('button', {name: /ChatGPT Conversation/i});
        fireEvent.click(header);

        const userChip = screen.getByText('user').closest('.MuiChip-root');
        expect(userChip).toBeTruthy();
        expect(userChip?.className).toContain('MuiChip-colorWarning');
    });

    it('does not reformat timestamps for an already-expanded conversation when toggling another conversation', () => {
        render(<ConversationList conversations={mockConversations} conversationSetVersion={0} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        const secondHeader = screen.getByRole('button', {name: /Second Conversation/i});
        const firstTimestamp = '2025-09-19T04:41:47.942021Z';
        const secondTimestamp = '2025-09-19T04:42:47.942021Z';

        fireEvent.click(firstHeader);
        formatMessageTimestampMock.mockClear();

        fireEvent.click(secondHeader);
        const callArguments = formatMessageTimestampMock.mock.calls.map(([timestamp]) => timestamp);
        expect(callArguments).toContain(secondTimestamp);
        expect(callArguments).not.toContain(firstTimestamp);
    });

    it('collapses a short conversation in under 100ms', () => {
        const shortConversation: ConversationThread[] = [
            conversationThread({
                conversationId: 'conv-latency',
                conversationName: 'Latency',
                conversationRawName: 'Latency',
                conversationCreatedAt: '2026-01-01T00:00:00Z',
                conversationCreatedAtUnixMilliseconds: Date.parse('2026-01-01T00:00:00Z'),
                messages: Array.from({length: 8}, (_, index) => ({
                    conversationId: 'conv-latency',
                    conversationName: 'Latency',
                    speaker: index % 2 === 0 ? 'human' : 'assistant',
                    message: `message-${index}`,
                    messageTimestamp: `2026-01-01T00:00:0${index}Z`
                }))
            })
        ];

        render(<ConversationList conversations={shortConversation} conversationSetVersion={0} />);
        const header = screen.getByRole('button', {name: /Latency/i});

        fireEvent.click(header);
        expect(screen.getByText('message-0')).toBeTruthy();

        const start = performance.now();
        fireEvent.click(header);
        const durationMilliseconds = performance.now() - start;

        expect(header.getAttribute('aria-expanded')).toBe('false');
        expect(durationMilliseconds).toBeLessThan(100);
    });
});
