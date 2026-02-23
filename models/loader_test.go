package models

import (
	"os"
	"runtime"
	"testing"
)

func TestLoadConversationEntries(t *testing.T) {
	tmpDir := t.TempDir()
	goldenConversationsJSON := loadGoldenConversationsJSON(t)
	goldenEntries := expectedGoldenEntries()

	tests := []struct {
		name            string
		path            string
		wantEntries     []ConversationEntry
		wantErrContains string
	}{
		{
			name:        "loads direct json export",
			path:        writeJSONFixture(t, tmpDir, "conversations.json", goldenConversationsJSON),
			wantEntries: goldenEntries,
		},
		{
			name:        "loads zip export with conversations json",
			path:        writeZipFixture(t, tmpDir, "export.zip", map[string]string{"conversations.json": goldenConversationsJSON}),
			wantEntries: goldenEntries,
		},
		{
			name:        "loads zip export with conversations json nested in folder",
			path:        writeZipFixture(t, tmpDir, "nested-export.zip", map[string]string{"data/conversations.json": goldenConversationsJSON}),
			wantEntries: goldenEntries,
		},
		{
			name:            "returns error when zip has no conversations json",
			path:            writeZipFixture(t, tmpDir, "missing-conversations.zip", map[string]string{"projects.json": `[]`}),
			wantErrContains: "conversations.json not found",
		},
		{
			name:            "returns error when path is empty",
			path:            "   ",
			wantErrContains: "path is required",
		},
		{
			name:            "returns error for invalid zip file",
			path:            writeJSONFixture(t, tmpDir, "broken.zip", "{not a zip}"),
			wantErrContains: "open zip archive",
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			entries, err := LoadConversationEntries(testCase.path)
			if testCase.wantErrContains != "" {
				assertErrorContains(t, err, testCase.wantErrContains)
				return
			}

			if err != nil {
				t.Fatalf("LoadConversationEntries returned error: %v", err)
			}

			assertConversationEntries(t, entries, testCase.wantEntries)
		})
	}
}

func TestLoadConversationEntriesPermissionDenied(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("permission mode checks are unreliable on windows")
	}
	if os.Geteuid() == 0 {
		t.Skip("permission-denied checks are unreliable when running as root")
	}

	tmpDir := t.TempDir()
	goldenConversationsJSON := loadGoldenConversationsJSON(t)

	tests := []struct {
		name string
		path string
	}{
		{
			name: "json file without read permissions",
			path: writeJSONFixture(t, tmpDir, "no-read.json", goldenConversationsJSON),
		},
		{
			name: "zip file without read permissions",
			path: writeZipFixture(t, tmpDir, "no-read.zip", map[string]string{"conversations.json": goldenConversationsJSON}),
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			if err := os.Chmod(testCase.path, 0); err != nil {
				t.Fatalf("failed to remove read permissions: %v", err)
			}
			t.Cleanup(func() {
				_ = os.Chmod(testCase.path, 0o600)
			})

			_, err := LoadConversationEntries(testCase.path)
			assertPermissionError(t, err)
		})
	}
}
