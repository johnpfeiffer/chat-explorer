import {describe, expect, it} from 'vitest';

import {
    defaultConversationSort,
    getConversationSortLabel,
    groupConversationEntries,
    nextConversationSort,
    sortConversations,
    type ConversationEntry,
    type ConversationSort
} from './conversations';

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
        conversationCreatedAt: '',
        speaker: 'human',
        message: '',
        messageTimestamp: '',
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
        },
        {
            name: 'groups by name when conversation id is missing',
            entries: [
                entry({conversationId: '', conversationName: 'Same Name', message: 'Msg 1'}),
                entry({conversationId: '   ', conversationName: 'Same Name', message: 'Msg 2'})
            ],
            expectedConversationIDs: [''],
            expectedConversationNames: ['Same Name'],
            expectedMessageCounts: [2],
            expectedFirstConversationMessages: ['Msg 1', 'Msg 2']
        },
        {
            name: 'groups untitled conversations together when id is missing',
            entries: [
                entry({conversationId: '', conversationName: '', message: 'Msg 1'}),
                entry({conversationId: '', conversationName: '   ', message: 'Msg 2'})
            ],
            expectedConversationIDs: [''],
            expectedConversationNames: ['Untitled conversation'],
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

    it('uses the oldest message timestamp as conversation created timestamp when grouping', () => {
        const grouped = groupConversationEntries([
            entry({
                conversationId: 'id-1',
                conversationName: 'Timeline',
                message: 'newer',
                messageTimestamp: '2026-01-02T00:00:00Z'
            }),
            entry({
                conversationId: 'id-1',
                conversationName: 'Timeline',
                message: 'older',
                messageTimestamp: '2026-01-01T00:00:00Z'
            })
        ]);

        expect(grouped[0].conversationCreatedAt).toBe('2026-01-01T00:00:00Z');
    });
});

describe('conversation sorting', () => {
    const sortModes: ConversationSort[] = [
        'name-asc',
        'name-desc',
        'created-asc',
        'created-desc'
    ];

    it('cycles through sort modes in a fixed order', () => {
        expect(defaultConversationSort).toBe('created-asc');
        expect(nextConversationSort('created-asc')).toBe('created-desc');
        expect(nextConversationSort('created-desc')).toBe('name-asc');
        expect(nextConversationSort('name-asc')).toBe('name-desc');
        expect(nextConversationSort('name-desc')).toBe('created-asc');
    });

    it.each([
        ['name-asc', 'Sorted by Name (A-Z)'],
        ['name-desc', 'Sorted by Name (Z-A)'],
        ['created-asc', 'Sorted by Created (oldest)'],
        ['created-desc', 'Sorted by Created (newest)']
    ] as const)('returns the correct label for %s', (sortMode, expectedLabel) => {
        expect(getConversationSortLabel(sortMode)).toBe(expectedLabel);
    });

    it.each(sortModes)('sorts deterministically for %s', (sortMode) => {
        const grouped = groupConversationEntries([
            entry({
                conversationId: 'id-same-2',
                conversationName: 'Same',
                message: 'same 2',
                messageTimestamp: '2026-02-02T00:00:00Z'
            }),
            entry({
                conversationId: 'id-empty',
                conversationName: '   ',
                message: 'empty title',
                messageTimestamp: '2026-02-01T00:00:00Z'
            }),
            entry({
                conversationId: 'id-alpha',
                conversationName: 'Alpha',
                message: 'alpha',
                messageTimestamp: '2026-02-02T00:00:00Z'
            }),
            entry({
                conversationId: 'id-same-1',
                conversationName: 'Same',
                message: 'same 1',
                messageTimestamp: '2026-02-02T00:00:00Z'
            }),
            entry({
                conversationId: 'id-omega',
                conversationName: 'Ωmega',
                message: 'omega',
                messageTimestamp: '2026-03-01T00:00:00Z'
            })
        ]);

        const sorted = sortConversations(grouped, sortMode);
        expect(sorted).toHaveLength(5);

        if (sortMode === 'name-asc' || sortMode === 'name-desc') {
            expect(sorted[0].conversationId).toBe('id-empty');
        }

        const sameTitleIDs = sorted
            .filter((conversation) => conversation.conversationName === 'Same')
            .map((conversation) => conversation.conversationId);
        expect(sameTitleIDs).toEqual(['id-same-1', 'id-same-2']);
    });

    it('uses created tie-break order as name then uuid for oldest and newest', () => {
        const grouped = groupConversationEntries([
            entry({
                conversationId: 'id-same-2',
                conversationName: 'Same',
                message: 'same 2',
                messageTimestamp: '2026-02-02T00:00:00Z'
            }),
            entry({
                conversationId: 'id-empty',
                conversationName: '   ',
                message: 'empty title',
                messageTimestamp: '2026-02-01T00:00:00Z'
            }),
            entry({
                conversationId: 'id-alpha',
                conversationName: 'Alpha',
                message: 'alpha',
                messageTimestamp: '2026-02-02T00:00:00Z'
            }),
            entry({
                conversationId: 'id-same-1',
                conversationName: 'Same',
                message: 'same 1',
                messageTimestamp: '2026-02-02T00:00:00Z'
            }),
            entry({
                conversationId: 'id-omega',
                conversationName: 'Ωmega',
                message: 'omega',
                messageTimestamp: '2026-03-01T00:00:00Z'
            })
        ]);

        const oldest = sortConversations(grouped, 'created-asc').map((conversation) => conversation.conversationId);
        expect(oldest).toEqual([
            'id-empty',
            'id-alpha',
            'id-same-1',
            'id-same-2',
            'id-omega'
        ]);

        const newest = sortConversations(grouped, 'created-desc').map((conversation) => conversation.conversationId);
        expect(newest).toEqual([
            'id-omega',
            'id-alpha',
            'id-same-1',
            'id-same-2',
            'id-empty'
        ]);
    });

    it('handles edge cases with one and zero conversations', () => {
        const oneConversation = groupConversationEntries([
            entry({
                conversationId: 'id-one',
                conversationName: 'Single',
                message: 'only',
                messageTimestamp: '2026-01-01T00:00:00Z'
            })
        ]);
        expect(sortConversations(oneConversation, 'name-asc').map((conversation) => conversation.conversationId)).toEqual(['id-one']);

        expect(sortConversations([], 'created-asc')).toEqual([]);
    });

    it('sorts 1001 short conversations under 100ms', () => {
        const entries: ConversationEntry[] = [];
        for (let index = 0; index < 1001; index += 1) {
            entries.push(entry({
                conversationId: `id-${index}`,
                conversationName: `Conversation ${index}`,
                message: `m${index}`,
                messageTimestamp: `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}Z`
            }));
        }

        const grouped = groupConversationEntries(entries);
        const start = performance.now();
        const sorted = sortConversations(grouped, 'created-desc');
        const durationMilliseconds = performance.now() - start;

        expect(sorted).toHaveLength(1001);
        expect(durationMilliseconds).toBeLessThan(100);
    });
});
