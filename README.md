# chat-explorer
Explore the data in a Claude or ChatGPT export



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

- `go test -v .`

# Building

`wails build` to create the output binary


