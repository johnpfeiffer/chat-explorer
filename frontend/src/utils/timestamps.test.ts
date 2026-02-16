import {describe, expect, it} from 'vitest';

import {formatMessageTimestamp} from './timestamps';

function getExpectedTimezoneLabel(date: Date): string {
    const parts = new Intl.DateTimeFormat(undefined, {timeZoneName: 'short'}).formatToParts(date);
    const timezonePart = parts.find((part) => part.type === 'timeZoneName');
    if (timezonePart === undefined) {
        return '';
    }
    return timezonePart.value.trim();
}

function formatExpectedLocalTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const pad2 = (value: number) => String(value).padStart(2, '0');
    const timezoneLabel = getExpectedTimezoneLabel(date);

    const localTime = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    if (timezoneLabel === '') {
        return localTime;
    }

    return `${localTime} ${timezoneLabel}`;
}

describe('formatMessageTimestamp', () => {
    it('returns unknown label for empty timestamps', () => {
        expect(formatMessageTimestamp('')).toBe('Unknown time');
        expect(formatMessageTimestamp('   ')).toBe('Unknown time');
        expect(formatMessageTimestamp(undefined)).toBe('Unknown time');
    });

    it('returns original value when timestamp is not parseable', () => {
        expect(formatMessageTimestamp('not-a-date')).toBe('not-a-date');
    });

    it('formats valid timestamps into local time to second precision', () => {
        const input = '2025-09-19T04:41:47.942021Z';
        expect(formatMessageTimestamp(input)).toBe(formatExpectedLocalTimestamp(input));
    });
});
