import React, {useCallback, useEffect, useState} from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Chip,
    Paper,
    Stack,
    Typography
} from '@mui/material';

import type {ConversationThread} from '../models/conversations';
import {formatConversationTimestamp, formatMessageTimestamp} from '../utils/timestamps';

type ConversationListProps = {
    conversations: ConversationThread[];
    conversationSetVersion: number;
};

type ConversationPanelProps = {
    conversation: ConversationThread;
    conversationIndex: number;
    panelKey: string;
    isExpanded: boolean;
    onToggle: (panelKey: string, isExpanded: boolean) => void;
};

function getSpeakerChipColor(speaker: string): 'default' | 'success' | 'warning' {
    const normalizedSpeaker = speaker.toLowerCase();
    if (normalizedSpeaker === 'assistant') {
        return 'success';
    }
    if (normalizedSpeaker === 'human' || normalizedSpeaker === 'user') {
        return 'warning';
    }
    return 'default';
}

function buildPanelKey(conversationID: string, conversationRawName: string): string {
    if (conversationID !== '') {
        return `id:${conversationID}`;
    }
    return `name:${conversationRawName}`;
}

const ConversationPanel = React.memo(function ConversationPanel({
    conversation,
    conversationIndex,
    panelKey,
    isExpanded,
    onToggle
}: ConversationPanelProps) {
    const handleToggle = useCallback(
        (_: React.SyntheticEvent, nextExpanded: boolean) => {
            onToggle(panelKey, nextExpanded);
        },
        [onToggle, panelKey]
    );

    return (
        <Accordion
            expanded={isExpanded}
            onChange={handleToggle}
            variant="outlined"
            disableGutters
            TransitionProps={{unmountOnExit: true}}
            sx={{backgroundColor: '#fcfcf9'}}
        >
            <AccordionSummary
                aria-controls={`conversation-panel-${conversationIndex}`}
                id={`conversation-header-${conversationIndex}`}
                expandIcon={
                    <Typography variant="caption" sx={{fontWeight: 700}}>
                        {isExpanded ? '-' : '+'}
                    </Typography>
                }
            >
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={1}
                    useFlexGap
                    sx={{width: '100%', alignItems: {sm: 'center'}}}
                >
                    <Typography
                        data-testid="conversation-title"
                        variant="subtitle2"
                        sx={{fontWeight: 700}}
                    >
                        {conversation.conversationName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {conversation.messages.length} {conversation.messages.length === 1 ? 'message' : 'messages'}
                    </Typography>
                    {conversation.conversationId && (
                        <Typography variant="caption" color="text.secondary">
                            {conversation.conversationId}
                        </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                        ({formatConversationTimestamp(conversation.conversationCreatedAt)})
                    </Typography>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={1.5} role="list" aria-label={`${conversation.conversationName} messages`}>
                    {conversation.messages.map((entry, messageIndex) => (
                        <Paper
                            variant="outlined"
                            role="listitem"
                            key={`${entry.conversationId}-${entry.speaker}-${messageIndex}`}
                            sx={{p: 1.5, backgroundColor: '#ffffff'}}
                        >
                            <Stack direction={{xs: 'column', sm: 'row'}} spacing={1} useFlexGap sx={{mb: 1}}>
                                <Chip
                                    label={entry.speaker}
                                    size="small"
                                    variant="outlined"
                                    color={getSpeakerChipColor(entry.speaker)}
                                    sx={{alignSelf: {xs: 'flex-start', sm: 'center'}}}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{alignSelf: {xs: 'flex-start', sm: 'center'}}}>
                                    {formatMessageTimestamp(entry.messageTimestamp)}
                                </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>
                                {entry.message}
                            </Typography>
                        </Paper>
                    ))}
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
});

export function ConversationList({conversations, conversationSetVersion}: ConversationListProps) {
    const [expandedConversationPanels, setExpandedConversationPanels] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setExpandedConversationPanels({});
    }, [conversationSetVersion]);

    const handleConversationToggle = useCallback((panelKey: string, isExpanded: boolean): void => {
        setExpandedConversationPanels((previousPanels) => ({
            ...previousPanels,
            [panelKey]: isExpanded
        }));
    }, []);

    return (
        <Stack spacing={1.5}>
            {conversations.map((conversation, conversationIndex) => {
                const panelKey = buildPanelKey(
                    conversation.conversationId,
                    conversation.conversationRawName
                );
                const isExpanded = expandedConversationPanels[panelKey] ?? false;

                return (
                    <ConversationPanel
                        key={panelKey}
                        conversation={conversation}
                        conversationIndex={conversationIndex}
                        panelKey={panelKey}
                        isExpanded={isExpanded}
                        onToggle={handleConversationToggle}
                    />
                );
            })}
        </Stack>
    );
}
