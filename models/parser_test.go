package models

import (
	"strings"
	"testing"
)

func TestParseConversationsJSON(t *testing.T) {
	t.Run("flattens conversations into speaker/message entries", func(t *testing.T) {
		input := `[
			{
				"uuid": "conv-1",
				"name": "Setup",
				"chat_messages": [
					{ "sender": "human", "text": "How do I export data?" },
					{ "sender": "assistant", "text": "Open Settings and click Export data." }
				]
			},
			{
				"uuid": "conv-2",
				"name": "Multiline",
				"chat_messages": [
					{
						"sender": "assistant",
						"content": [
							{ "text": "Line one" },
							{ "text": "Line two" }
						]
					}
				]
			}
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 3 {
			t.Fatalf("expected 3 entries, got %d", len(entries))
		}

		first := entries[0]
		if first.ConversationID != "conv-1" {
			t.Fatalf("expected first conversation id conv-1, got %q", first.ConversationID)
		}
		if first.ConversationName != "Setup" {
			t.Fatalf("expected first conversation name Setup, got %q", first.ConversationName)
		}
		if first.Speaker != "human" {
			t.Fatalf("expected first speaker human, got %q", first.Speaker)
		}
		if first.Message != "How do I export data?" {
			t.Fatalf("expected first message to match text field, got %q", first.Message)
		}

		last := entries[2]
		if last.Message != "Line one\nLine two" {
			t.Fatalf("expected content field to be joined with newlines, got %q", last.Message)
		}
	})

	t.Run("returns error for invalid json", func(t *testing.T) {
		_, err := ParseConversationsJSON(strings.NewReader("{"))
		if err == nil {
			t.Fatal("expected error for invalid json, got nil")
		}
	})

	t.Run("handles edge cases", func(t *testing.T) {
		input := `[
			{
				"uuid": "empty-conv",
				"name": "Empty",
				"chat_messages": []
			},
			{
				"uuid": "missing-sender",
				"name": "No Sender",
				"chat_messages": [
					{ "text": "Who sent this?" }
				]
			},
			{
				"uuid": "complex-content",
				"name": "Complex",
				"chat_messages": [
					{
						"sender": "system",
						"content": [
							{ "text": "    Trimmed    " },
							{ "unexpected": "ignored" },
							{ "text": 123 },
							{ "type": "wrapper", "content": [{ "text": "Deep" }] }
						]
					}
				]
			}
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 2 {
			t.Fatalf("expected 2 entries, got %d", len(entries))
		}

		// Check missing sender behavior
		noSender := entries[0]
		if noSender.Speaker != "unknown" {
			t.Errorf("expected unknown speaker, got %q", noSender.Speaker)
		}

		// Check complex content behavior
		complex := entries[1]
		expectedMessage := "Trimmed\nDeep"
		if complex.Message != expectedMessage {
			t.Errorf("expected message %q, got %q", expectedMessage, complex.Message)
		}
	})
}
