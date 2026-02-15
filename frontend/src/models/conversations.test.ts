import {describe, expect, it} from 'vitest';

import {groupConversationEntries, type ConversationEntry} from './conversations';

type GroupTestCase = {
    name: string;
    entries: ConversationEntry[];
    expectedConversationIDs: string[];
    expectedConversationNames: string[];
    expectedMessageCounts: number[];
    expectedFirstConversationMessages: string[];
};

function entry(overrides: Partial<ConversationEntry>): ConversationEntry {
    return {
        conversationId: '',
        conversationName: '',
        speaker: 'human',
        message: '',
        ...overrides
    };
}

describe('groupConversationEntries', () => {
    it.each<GroupTestCase>([
        {
            name: 'groups by conversation id and preserves first-seen conversation order',
            entries: [
                entry({conversationId: 'conv-2', conversationName: 'Second', message: 'Second first'}),
                entry({conversationId: 'conv-1', conversationName: 'First', message: 'First only'}),
                entry({conversationId: 'conv-2', conversationName: 'Second', message: 'Second second'})
            ],
            expectedConversationIDs: ['conv-2', 'conv-1'],
            expectedConversationNames: ['Second', 'First'],
            expectedMessageCounts: [2, 1],
            expectedFirstConversationMessages: ['Second first', 'Second second']
        },
        {
            name: 'uses untitled fallback conversation name when source name is blank',
            entries: [
                entry({conversationId: 'conv-untitled', conversationName: '   ', message: 'Hello there'})
            ],
            expectedConversationIDs: ['conv-untitled'],
            expectedConversationNames: ['Untitled conversation'],
            expectedMessageCounts: [1],
            expectedFirstConversationMessages: ['Hello there']
        },
        {
            name: 'keeps conversations with same name but different ids separate',
            entries: [
                entry({conversationId: 'id-1', conversationName: 'Same Name', message: 'Msg 1'}),
                entry({conversationId: 'id-2', conversationName: 'Same Name', message: 'Msg 2'})
            ],
            expectedConversationIDs: ['id-1', 'id-2'],
            expectedConversationNames: ['Same Name', 'Same Name'],
            expectedMessageCounts: [1, 1],
            expectedFirstConversationMessages: ['Msg 1']
        },
        {
            name: 'updates conversation name from untitled if a later entry has a name',
            entries: [
                entry({conversationId: 'id-1', conversationName: '   ', message: 'Msg 1'}),
                entry({conversationId: 'id-1', conversationName: 'Real Name', message: 'Msg 2'})
            ],
            expectedConversationIDs: ['id-1'],
            expectedConversationNames: ['Real Name'],
            expectedMessageCounts: [2],
            expectedFirstConversationMessages: ['Msg 1', 'Msg 2']
        },
        {
            name: 'does not overwrite existing name with a new name for same conversation id',
            entries: [
                entry({conversationId: 'id-1', conversationName: 'First Name', message: 'Msg 1'}),
                entry({conversationId: 'id-1', conversationName: 'Second Name', message: 'Msg 2'})
            ],
            expectedConversationIDs: ['id-1'],
            expectedConversationNames: ['First Name'],
            expectedMessageCounts: [2],
            expectedFirstConversationMessages: ['Msg 1', 'Msg 2']
        }
    ])('$name', ({entries, expectedConversationIDs, expectedConversationNames, expectedMessageCounts, expectedFirstConversationMessages}) => {
        const grouped = groupConversationEntries(entries);

        expect(grouped.map((conversation) => conversation.conversationId)).toEqual(expectedConversationIDs);
        expect(grouped.map((conversation) => conversation.conversationName)).toEqual(expectedConversationNames);
        expect(grouped.map((conversation) => conversation.messages.length)).toEqual(expectedMessageCounts);
        expect(grouped[0].messages.map((message) => message.message)).toEqual(expectedFirstConversationMessages);
    });
});
