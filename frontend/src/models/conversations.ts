import type {models} from '../../wailsjs/go/models';

export type ConversationEntry = models.ConversationEntry;

export type ConversationThread = {
    conversationId: string;
    conversationName: string;
    messages: ConversationEntry[];
};

const untitledConversationName = 'Untitled conversation';

function normalizeConversationName(name: string): string {
    const trimmed = name.trim();
    if (trimmed === '') {
        return untitledConversationName;
    }
    return trimmed;
}

function buildConversationKey(entry: ConversationEntry): string {
    const trimmedID = entry.conversationId.trim();
    if (trimmedID !== '') {
        return `id:${trimmedID}`;
    }

    return `name:${normalizeConversationName(entry.conversationName)}`;
}

export function groupConversationEntries(entries: ConversationEntry[]): ConversationThread[] {
    const threads: ConversationThread[] = [];
    const threadIndexByKey = new Map<string, number>();

    for (const entry of entries) {
        const key = buildConversationKey(entry);
        const existingThreadIndex = threadIndexByKey.get(key);
        const entryConversationName = normalizeConversationName(entry.conversationName);

        if (existingThreadIndex === undefined) {
            threadIndexByKey.set(key, threads.length);
            threads.push({
                conversationId: entry.conversationId.trim(),
                conversationName: entryConversationName,
                messages: [entry]
            });
            continue;
        }

        const existingThread = threads[existingThreadIndex];
        if (existingThread.conversationName === untitledConversationName && entryConversationName !== untitledConversationName) {
            existingThread.conversationName = entryConversationName;
        }
        existingThread.messages.push(entry);
    }

    return threads;
}
