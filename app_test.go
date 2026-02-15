package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConversationsFromPath(t *testing.T) {
	app := NewApp()

	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "conversations.json")

	content := `[
		{
			"uuid": "conv-1",
			"name": "Example",
			"chat_messages": [
				{ "sender": "assistant", "text": "Hello from export." }
			]
		}
	]`

	if err := os.WriteFile(filePath, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write test fixture: %v", err)
	}

	entries, err := app.LoadConversationsFromPath(filePath)
	if err != nil {
		t.Fatalf("LoadConversationsFromPath returned error: %v", err)
	}

	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}

	if entries[0].Speaker != "assistant" {
		t.Fatalf("expected speaker assistant, got %q", entries[0].Speaker)
	}

	if entries[0].Message != "Hello from export." {
		t.Fatalf("expected message from fixture, got %q", entries[0].Message)
	}
}

func TestLoadConversationsFromPathMissingFile(t *testing.T) {
	app := NewApp()

	_, err := app.LoadConversationsFromPath("/missing/conversations.json")
	if err == nil {
		t.Fatal("expected error when file is missing, got nil")
	}
}
