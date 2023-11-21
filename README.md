[![Main workflow](https://github.com/PatrikTrefil/pomodoro-timer-vscode/actions/workflows/main.yml/badge.svg)](https://github.com/PatrikTrefil/pomodoro-timer-vscode/actions/workflows/main.yml)

# pomodoro-timer

This extension is a pomodoro timer for VS Code. Besides providing a timer it
also creates a history of all your sessions with basic statistics.

## Usage

The extension is controlled by running commands using the command palette
(`Ctrl + Shift + P` (Windows/Linux) / `Command + Shift + P` (Mac)).

### Commands

- `pomodoro-timer.startTimerStandard` - Starts a timer with the default session
  duration.
- `pomodoro-timer.cancelTimer` - Cancels the current timer.
- `pomodoro-timer.startTimerCustom` - Starts a timer with a custom session
  duration.
- `pomodoro-timer.showPomodoroStats` - Shows the statistics of all sessions in a
  web view.
- `pomodoro-timer.exportPomodoroStats` - Exports the statistics of all sessions
  to a CSV file.
- `pomodoro-timer.clearPomodoroStats` - Clears the statistics of all sessions
  (irreversible action!).

### Extension Settings

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
