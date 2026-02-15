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
			},
			{
				"uuid": "mixed-types",
				"name": "Mixed",
				"chat_messages": [
					{
						"sender": "bot",
						"content": [
							123,
							true,
							{ "text": "Valid text" },
							null
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

		// Check mixed/ignored types in content
		mixed := entries[2] // This is the new entry we will add to the input
		if mixed.Message != "Valid text" {
			t.Errorf("expected message 'Valid text', got %q", mixed.Message)
		}
	})

	t.Run("prioritizes text field over content", func(t *testing.T) {
		input := `[
			{
				"uuid": "precedence",
				"name": "Precedence",
				"chat_messages": [
					{
						"sender": "bot",
						"text": "Top level text",
						"content": [ { "text": "Ignored content" } ]
					}
				]
			}
		]`

		entries, err := ParseConversationsJSON(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(entries))
		}

		if entries[0].Message != "Top level text" {
			t.Errorf("expected message 'Top level text', got %q", entries[0].Message)
		}
	})

	t.Run("handles deeply nested content", func(t *testing.T) {
		// Construct a deeply nested JSON structure
		depth := 100
		var sb strings.Builder
		sb.WriteString(`[{"uuid": "nested", "name": "Nested", "chat_messages": [{"sender": "me", "content": `)
		for i := 0; i < depth; i++ {
			sb.WriteString(`{"type": "wrapper", "content": [`)
		}
		sb.WriteString(`{"text": "Deepest"}`)
		for i := 0; i < depth; i++ {
			sb.WriteString(`]}`)
		}
		sb.WriteString(`}]}]`)

		entries, err := ParseConversationsJSON(strings.NewReader(sb.String()))
		if err != nil {
			t.Fatalf("ParseConversationsJSON returned error: %v", err)
		}

		if len(entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(entries))
		}

		if entries[0].Message != "Deepest" {
			t.Errorf("expected message 'Deepest', got %q", entries[0].Message)
		}
	})
}
