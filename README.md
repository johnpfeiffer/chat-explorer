# chat-explorer

If you are concerned about Privacy, you can export your data from OpenAI or Anthropic and then delete the conversations.

Additionally removing extraneous or older conversations, and possibly manually updating the "Memory", can make Claude or ChatGPT more focused and effective.

This is a desktop app for visualizing and exploring the Conversations exported from an LLM chat application like Claude or ChatGPT.

*Note that private data stays private with an open source, entirely local, desktop app.*

- <https://support.claude.com/en/articles/9450526-how-can-i-export-my-claude-data>

- <https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data>

- <https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data>

- <https://help.openai.com/en/articles/8983778-chat-and-file-retention-policies-in-chatgpt>

# Technical Details

The project leverages "Wails" for a Golang native desktop app with embedded frontend.

The project uses React + Typescript + Material-UI

You can configure the Wails project by editing `wails.json`. More info about settings at https://wails.io/docs/reference/project-config

## Architecture

<https://github.com/johnpfeiffer/chat-explorer/blob/main/docs/architecture.md>


## Development

`wails dev` to run in live development mode (vite dev server with very fast hot reload)


Incrementally you can check things with:

**/frontend**

- `npm run build`
- `npm run test`

**/backend**

- `go test -v ./...`

# Building

`wails build` to create the output binary (for MacOS, Windows, or Linux)

<https://wails.io/docs/guides/manual-builds/>

# AI Agents

to make this more self contained here are ai dev tools:

**codex** 
- `brew install --cask codex`
- <https://github.com/openai/codex>
- <https://developers.openai.com/codex/app>


