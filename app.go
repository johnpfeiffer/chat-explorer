package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"chat-explorer/models"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) OpenConversationsFile() ([]models.ConversationEntry, error) {
	if a.ctx == nil {
		return nil, fmt.Errorf("application is not initialized")
	}

	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:           "Open conversations.json",
		DefaultFilename: "conversations.json",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON Files (*.json)",
				Pattern:     "*.json",
			},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("open file dialog: %w", err)
	}

	if strings.TrimSpace(path) == "" {
		return []models.ConversationEntry{}, nil
	}

	return a.LoadConversationsFromPath(path)
}

func (a *App) LoadConversationsFromPath(path string) ([]models.ConversationEntry, error) {
	if strings.TrimSpace(path) == "" {
		return nil, fmt.Errorf("path is required")
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer file.Close()

	entries, err := models.ParseConversationsJSON(file)
	if err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}

	return entries, nil
}
