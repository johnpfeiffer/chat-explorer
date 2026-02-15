# chat-explorer

A desktop app for visualizing and exploring the data conversations exported from an LLM chat app like Claude.

<https://support.claude.com/en/articles/9450526-how-can-i-export-my-claude-data>


## TODO

- support a ChatGPT export

# Technical Details

The project leverages "Wails" for a Golang native desktop app with embedded frontend.

The project uses React + Typescript + Material-UI

You can configure the project by editing `wails.json`. More info about settings at https://wails.io/docs/reference/project-config

## Development

`wails dev` to run in live development mode (vite dev server with very fast hot reload)


Incrementally you can check things with:

**/frontend**

- `npm run build`
- `npm run test`

**/backend**

- `go test -v ./...`

# Building

`wails build` to create the output binary


# AI Agents

to make this more self contained here are ai dev tools:

**codex** 
- `brew install --cask codex`
- <https://github.com/openai/codex>
- <https://developers.openai.com/codex/app>

**gemini**
- `brew install gemini-cli`
- <https://github.com/google-gemini/gemini-cli>

`echo "alias subagent='gemini'" >> ~/.zshenv`

