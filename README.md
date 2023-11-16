[![Main workflow](https://github.com/PatrikTrefil/pomodoro-timer-vscode/actions/workflows/main.yml/badge.svg)](https://github.com/PatrikTrefil/pomodoro-timer-vscode/actions/workflows/main.yml)

# pomodoro-timer

This extension is a pomodoro timer for VS Code. Besides providing a timer it
also creates a history of all your sessions with basic statistics.

## Extension Settings

- `pomodoro-timer.defaultSessionDuration`: The default duration of a session in
  minutes. Default is 25 minutes. It is used by the
  `pomodoro-timer.startTimerStandard` command.

## Release notes

All notable changes are documented in the [CHANGELOG.md](CHANGELOG.md) file.

## Development

### Debugging

Open this project in Visual Studio Code and press F5.

### Tests

```
pnpm run test
```
