function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

function getLocalTimezoneLabel(date: Date): string {
    const parts = new Intl.DateTimeFormat(undefined, {timeZoneName: 'short'}).formatToParts(date);
    const timezonePart = parts.find((part) => part.type === 'timeZoneName');
    if (timezonePart !== undefined && timezonePart.value.trim() !== '') {
        return timezonePart.value.trim();
    }

    const resolvedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolvedTimezone !== undefined && resolvedTimezone.trim() !== '') {
        return resolvedTimezone.trim();
    }

    return '';
}

export function formatMessageTimestamp(timestamp: string | undefined): string {
    const trimmedTimestamp = (timestamp ?? '').trim();
    if (trimmedTimestamp === '') {
        return 'Unknown time';
    }

    const parsedTimestamp = new Date(trimmedTimestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
        return trimmedTimestamp;
    }

    const year = parsedTimestamp.getFullYear();
    const month = pad2(parsedTimestamp.getMonth() + 1);
    const day = pad2(parsedTimestamp.getDate());
    const hours = pad2(parsedTimestamp.getHours());
    const minutes = pad2(parsedTimestamp.getMinutes());
    const seconds = pad2(parsedTimestamp.getSeconds());
    const timezoneLabel = getLocalTimezoneLabel(parsedTimestamp);

    const localTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    if (timezoneLabel === '') {
        return localTime;
    }
    return `${localTime} ${timezoneLabel}`;
}
