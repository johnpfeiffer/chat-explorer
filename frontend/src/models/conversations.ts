import type {models} from '../../wailsjs/go/models';

export type ConversationEntry = models.ConversationEntry;

export type ConversationSort = 'name-asc' | 'name-desc' | 'created-asc' | 'created-desc';

export type ConversationThread = {
    conversationId: string;
    conversationName: string;
    conversationRawName: string;
    conversationCreatedAt: string;
    conversationCreatedAtUnixMilliseconds: number | null;
    messages: ConversationEntry[];
};

const untitledConversationName = 'Untitled conversation';
const sortOrder: ConversationSort[] = ['created-asc', 'created-desc', 'name-asc', 'name-desc'];
const nameCollator = new Intl.Collator(undefined, {
    usage: 'sort',
    sensitivity: 'base',
    numeric: true
});

export const defaultConversationSort: ConversationSort = 'created-asc';

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

function parseTimestamp(timestamp: string): number | null {
    const trimmedTimestamp = timestamp.trim();
    if (trimmedTimestamp === '') {
        return null;
    }

    const unixMilliseconds = Date.parse(trimmedTimestamp);
    if (Number.isNaN(unixMilliseconds)) {
        return null;
    }

    return unixMilliseconds;
}

function extractEntryConversationCreatedAt(entry: ConversationEntry): string {
    const modelEntry = entry as ConversationEntry & {conversationCreatedAt?: string};
    const entryConversationCreatedAt = (modelEntry.conversationCreatedAt ?? '').trim();
    if (entryConversationCreatedAt !== '') {
        return entryConversationCreatedAt;
    }

    return entry.messageTimestamp.trim();
}

function updateThreadCreatedAt(thread: ConversationThread, candidateTimestamp: string): void {
    const trimmedCandidateTimestamp = candidateTimestamp.trim();
    if (trimmedCandidateTimestamp === '') {
        return;
    }

    const candidateUnixMilliseconds = parseTimestamp(trimmedCandidateTimestamp);
    if (thread.conversationCreatedAt === '') {
        thread.conversationCreatedAt = trimmedCandidateTimestamp;
        thread.conversationCreatedAtUnixMilliseconds = candidateUnixMilliseconds;
        return;
    }

    const existingUnixMilliseconds = thread.conversationCreatedAtUnixMilliseconds;
    if (candidateUnixMilliseconds !== null && existingUnixMilliseconds === null) {
        thread.conversationCreatedAt = trimmedCandidateTimestamp;
        thread.conversationCreatedAtUnixMilliseconds = candidateUnixMilliseconds;
        return;
    }
    if (candidateUnixMilliseconds === null || existingUnixMilliseconds === null) {
        return;
    }
    if (candidateUnixMilliseconds < existingUnixMilliseconds) {
        thread.conversationCreatedAt = trimmedCandidateTimestamp;
        thread.conversationCreatedAtUnixMilliseconds = candidateUnixMilliseconds;
    }
}

function hasEmptyConversationName(thread: ConversationThread): boolean {
    return thread.conversationRawName.trim() === '';
}

function compareTieBreakerIDs(left: ConversationThread, right: ConversationThread): number {
    const leftID = left.conversationId.trim();
    const rightID = right.conversationId.trim();
    return nameCollator.compare(leftID, rightID);
}

function compareNamesAscending(left: ConversationThread, right: ConversationThread): number {
    const leftName = left.conversationRawName.trim();
    const rightName = right.conversationRawName.trim();
    const emptyLeftName = leftName === '';
    const emptyRightName = rightName === '';

    if (emptyLeftName && !emptyRightName) {
        return -1;
    }
    if (!emptyLeftName && emptyRightName) {
        return 1;
    }

    const nameComparison = nameCollator.compare(leftName, rightName);
    if (nameComparison !== 0) {
        return nameComparison;
    }

    return compareTieBreakerIDs(left, right);
}

function compareNamesDescending(left: ConversationThread, right: ConversationThread): number {
    const leftName = left.conversationRawName.trim();
    const rightName = right.conversationRawName.trim();
    const emptyLeftName = leftName === '';
    const emptyRightName = rightName === '';

    // Keep empty titles first regardless of lexical direction.
    if (emptyLeftName && !emptyRightName) {
        return -1;
    }
    if (!emptyLeftName && emptyRightName) {
        return 1;
    }

    const nameComparison = nameCollator.compare(rightName, leftName);
    if (nameComparison !== 0) {
        return nameComparison;
    }

    return compareTieBreakerIDs(left, right);
}

function compareCreatedAscending(left: ConversationThread, right: ConversationThread): number {
    const leftCreatedAt = left.conversationCreatedAtUnixMilliseconds;
    const rightCreatedAt = right.conversationCreatedAtUnixMilliseconds;

    if (leftCreatedAt !== null && rightCreatedAt !== null && leftCreatedAt !== rightCreatedAt) {
        return leftCreatedAt - rightCreatedAt;
    }
    if (leftCreatedAt === null && rightCreatedAt !== null) {
        return 1;
    }
    if (leftCreatedAt !== null && rightCreatedAt === null) {
        return -1;
    }

    const nameComparison = compareNamesAscending(left, right);
    if (nameComparison !== 0) {
        return nameComparison;
    }

    return compareTieBreakerIDs(left, right);
}

function compareCreatedDescending(left: ConversationThread, right: ConversationThread): number {
    const leftCreatedAt = left.conversationCreatedAtUnixMilliseconds;
    const rightCreatedAt = right.conversationCreatedAtUnixMilliseconds;

    if (leftCreatedAt !== null && rightCreatedAt !== null && leftCreatedAt !== rightCreatedAt) {
        return rightCreatedAt - leftCreatedAt;
    }
    if (leftCreatedAt === null && rightCreatedAt !== null) {
        return 1;
    }
    if (leftCreatedAt !== null && rightCreatedAt === null) {
        return -1;
    }

    const nameComparison = compareNamesAscending(left, right);
    if (nameComparison !== 0) {
        return nameComparison;
    }

    return compareTieBreakerIDs(left, right);
}

export function groupConversationEntries(entries: ConversationEntry[]): ConversationThread[] {
    const threads: ConversationThread[] = [];
    const threadIndexByKey = new Map<string, number>();

    for (const entry of entries) {
        const key = buildConversationKey(entry);
        const existingThreadIndex = threadIndexByKey.get(key);
        const entryRawConversationName = entry.conversationName.trim();
        const entryConversationName = normalizeConversationName(entry.conversationName);
        const entryConversationCreatedAt = extractEntryConversationCreatedAt(entry);

        if (existingThreadIndex === undefined) {
            threadIndexByKey.set(key, threads.length);
            const thread: ConversationThread = {
                conversationId: entry.conversationId.trim(),
                conversationRawName: entryRawConversationName,
                conversationName: entryConversationName,
                conversationCreatedAt: '',
                conversationCreatedAtUnixMilliseconds: null,
                messages: [entry]
            };
            updateThreadCreatedAt(thread, entryConversationCreatedAt);
            threads.push(thread);
            continue;
        }

        const existingThread = threads[existingThreadIndex];
        if (hasEmptyConversationName(existingThread) && entryConversationName !== untitledConversationName) {
            existingThread.conversationRawName = entryRawConversationName;
            existingThread.conversationName = entryConversationName;
        }
        existingThread.messages.push(entry);
        updateThreadCreatedAt(existingThread, entryConversationCreatedAt);
    }

    return threads;
}

export function sortConversations(conversations: ConversationThread[], sortBy: ConversationSort): ConversationThread[] {
    const sortedConversations = [...conversations];

    switch (sortBy) {
    case 'name-asc':
        return sortedConversations.sort(compareNamesAscending);
    case 'name-desc':
        return sortedConversations.sort(compareNamesDescending);
    case 'created-desc':
        return sortedConversations.sort(compareCreatedDescending);
    case 'created-asc':
    default:
        return sortedConversations.sort(compareCreatedAscending);
    }
}

export function nextConversationSort(currentSort: ConversationSort): ConversationSort {
    const currentSortIndex = sortOrder.indexOf(currentSort);
    if (currentSortIndex === -1) {
        return defaultConversationSort;
    }

    return sortOrder[(currentSortIndex + 1) % sortOrder.length];
}

export function getConversationSortLabel(sortBy: ConversationSort): string {
    switch (sortBy) {
    case 'name-asc':
        return 'Sorted by Name (A-Z)';
    case 'name-desc':
        return 'Sorted by Name (Z-A)';
    case 'created-desc':
        return 'Sorted by Created (newest)';
    case 'created-asc':
    default:
        return 'Sorted by Created (oldest)';
    }
}
