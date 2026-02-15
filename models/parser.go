package models

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

type ConversationEntry struct {
	ConversationID   string `json:"conversationId"`
	ConversationName string `json:"conversationName"`
	Speaker          string `json:"speaker"`
	Message          string `json:"message"`
}

type rawConversation struct {
	UUID         string           `json:"uuid"`
	Name         string           `json:"name"`
	ChatMessages []rawChatMessage `json:"chat_messages"`
}

type rawChatMessage struct {
	Sender  string `json:"sender"`
	Text    string `json:"text"`
	Content any    `json:"content"`
}

func ParseConversationsJSON(input io.Reader) ([]ConversationEntry, error) {
	var conversations []rawConversation

	decoder := json.NewDecoder(input)
	if err := decoder.Decode(&conversations); err != nil {
		return nil, fmt.Errorf("decode conversations json: %w", err)
	}

	entries := make([]ConversationEntry, 0, len(conversations))
	for _, conversation := range conversations {
		for _, chatMessage := range conversation.ChatMessages {
			message := extractMessageText(chatMessage)
			if message == "" {
				continue
			}

			speaker := strings.TrimSpace(chatMessage.Sender)
			if speaker == "" {
				speaker = "unknown"
			}

			entries = append(entries, ConversationEntry{
				ConversationID:   conversation.UUID,
				ConversationName: conversation.Name,
				Speaker:          speaker,
				Message:          message,
			})
		}
	}

	return entries, nil
}

func extractMessageText(chatMessage rawChatMessage) string {
	if text := strings.TrimSpace(chatMessage.Text); text != "" {
		return text
	}

	parts := make([]string, 0, 2)
	collectText(chatMessage.Content, &parts)
	return strings.Join(parts, "\n")
}

func collectText(node any, parts *[]string) {
	switch value := node.(type) {
	case string:
		text := strings.TrimSpace(value)
		if text != "" {
			*parts = append(*parts, text)
		}
	case []any:
		for _, item := range value {
			collectText(item, parts)
		}
	case map[string]any:
		if text, ok := value["text"].(string); ok {
			trimmed := strings.TrimSpace(text)
			if trimmed != "" {
				*parts = append(*parts, trimmed)
			}
		}

		if content, ok := value["content"]; ok {
			collectText(content, parts)
		}
	}
}
