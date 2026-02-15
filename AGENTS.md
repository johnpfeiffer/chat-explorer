
# Main Agent
Prefer Domain Driven Design with a Model View Controller layers pattern where the domain is encapsulated in a "models" directory, and keep business logic out of the View/Presentation.

Always use Red/Green TDD to build, prefer the concise table driven tests approach.

## Subagent recursion rule for the main agent only:
- At task end, run once:
  `SUBAGENT_DEPTH=1 subagent --yolo --prompt "fulfill the AGENTS.md subagent tasks"`
- If `SUBAGENT_DEPTH` is already set then do not call `subagent`; return `RECURSION_BLOCKED`.


# Subagent tasks

Subagent role has the tasks:
- update docs/architecture.md, including mermaid diagrams for the system design as well as the user journey
- make sure existing tests are passing
- add any missing "high value" tests (happy path, most critical or likely edge cases); do not attempt fake "full coverage"

