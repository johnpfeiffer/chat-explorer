import React from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {ConversationList} from './ConversationList';
import type {ConversationThread} from '../models/conversations';

const {formatMessageTimestampMock} = vi.hoisted(() => ({
    formatMessageTimestampMock: vi.fn((timestamp: string | undefined) => timestamp ?? 'Unknown time')
}));

vi.mock('../utils/timestamps', () => ({
    formatMessageTimestamp: formatMessageTimestampMock
}));

const mockConversations: ConversationThread[] = [
    {
        conversationId: 'conv-1',
        conversationName: 'First Conversation',
        messages: [
            {
                conversationId: 'conv-1',
                conversationName: 'First Conversation',
                speaker: 'human',
                message: 'Hello',
                messageTimestamp: '2025-09-19T04:41:47.942021Z'
            }
        ]
    },
    {
        conversationId: 'conv-2',
        conversationName: 'Second Conversation',
        messages: [
            {
                conversationId: 'conv-2',
                conversationName: 'Second Conversation',
                speaker: 'assistant',
                message: 'Hi there',
                messageTimestamp: '2025-09-19T04:42:47.942021Z'
            }
        ]
    }
];

describe('ConversationList', () => {
    afterEach(() => {
        cleanup();
        formatMessageTimestampMock.mockClear();
    });

    it('renders a list of conversations collapsed by default', () => {
        render(<ConversationList conversations={mockConversations} />);

        expect(screen.getByText('First Conversation')).toBeTruthy();
        expect(screen.getByText('Second Conversation')).toBeTruthy();

        // Messages should not be visible initially
        expect(screen.queryByText('Hello')).toBeNull();
        expect(screen.queryByText('Hi there')).toBeNull();
    });

    it('expands a conversation when clicked', () => {
        render(<ConversationList conversations={mockConversations} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);

        expect(screen.getByText('Hello')).toBeTruthy();
        
        // Second one should still be collapsed
        expect(screen.queryByText('Hi there')).toBeNull();
    });

    it('collapses an expanded conversation when clicked again', () => {
        render(<ConversationList conversations={mockConversations} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);
        expect(screen.getByText('Hello')).toBeTruthy();

        fireEvent.click(firstHeader);
        // Wait for collapse transition or check visibility. 
        // MUI Accordion might keep content in DOM but hidden.
        // However, we can check if the button aria-expanded is false.
        expect(firstHeader.getAttribute('aria-expanded')).toBe('false');
    });

    it('resets expansion state when conversations prop changes', () => {
        const {rerender} = render(<ConversationList conversations={mockConversations} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);
        expect(firstHeader.getAttribute('aria-expanded')).toBe('true');

        // Update props with new conversations (simulating loading a new file)
        const newConversations: ConversationThread[] = [
            {
                conversationId: 'conv-3',
                conversationName: 'Third Conversation',
                messages: []
            }
        ];

        rerender(<ConversationList conversations={newConversations} />);

        // The old conversation should be gone
        expect(screen.queryByText('First Conversation')).toBeNull();
        
        // The new one should be present and collapsed
        const thirdHeader = screen.getByRole('button', {name: /Third Conversation/i});
        expect(thirdHeader.getAttribute('aria-expanded')).toBe('false');
    });
    
    it('resets expansion state even if conversations look similar but are new objects', () => {
         const {rerender} = render(<ConversationList conversations={mockConversations} />);

        const firstHeader = screen.getByRole('button', {name: /First Conversation/i});
        fireEvent.click(firstHeader);
        expect(firstHeader.getAttribute('aria-expanded')).toBe('true');

        // Pass a new array with same content (simulating reload)
        rerender(<ConversationList conversations={[...mockConversations]} />);

        // Should be collapsed again because of useEffect dependency on [conversations]
        // Note: verify if [conversations] dependency treats new array as change. Yes it should.
        
        // Actually, React equality check might depend on reference. 
        // If we pass a new array, it should trigger useEffect.
        
        const reRenderedHeader = screen.getByRole('button', {name: /First Conversation/i});
        expect(reRenderedHeader.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders speaker chips with correct semantic colors', () => {
        render(<ConversationList conversations={mockConversations} />);

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
            {
                conversationId: 'conv-chatgpt',
                conversationName: 'ChatGPT Conversation',
                messages: [
                    {
                        conversationId: 'conv-chatgpt',
                        conversationName: 'ChatGPT Conversation',
                        speaker: 'user',
                        message: 'ChatGPT user message',
                        messageTimestamp: '2025-09-19T04:41:47.942021Z'
                    }
                ]
            }
        ];

        render(<ConversationList conversations={chatGPTConversation} />);

        const header = screen.getByRole('button', {name: /ChatGPT Conversation/i});
        fireEvent.click(header);

        const userChip = screen.getByText('user').closest('.MuiChip-root');
        expect(userChip).toBeTruthy();
        expect(userChip?.className).toContain('MuiChip-colorWarning');
    });

    it('does not reformat timestamps for an already-expanded conversation when toggling another conversation', () => {
        render(<ConversationList conversations={mockConversations} />);

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
});
