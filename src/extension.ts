import * as vscode from "vscode";
import HistoryManager from "./historyManager";
import SessionManager from "./sessionManager";
import { CommandFactory } from "./commandFactory";

/**
 * Cleanup function that is called when the extension is deactivated.
 */
let cleanupFunction: (() => void) | null;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "pomodoro-timer" is now active!'
  );

  let pomodoroStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  const historyManager = new HistoryManager(context.workspaceState);

  const sessionManager = new SessionManager(
    pomodoroStatusBarItem,
    historyManager
  );

  const commandFactory = new CommandFactory(
    context,
    historyManager,
    sessionManager
  );

  cleanupFunction = () => {
    sessionManager.endCurrentSession();
  };

  // Register all commands
  const startTimerDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.startTimerStandard",
    commandFactory.createStartTimerCommand()
  );

  const cancelTimerDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.cancelTimer",
    commandFactory.createCancelTimerCommand()
  );

  const startCustomTimerDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.startTimerCustom",
    commandFactory.createStartTimerCommand()
  );

  const showStatsDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.showPomodoroStats",
    commandFactory.createShowStatsCommand()
  );

  const exportStatsDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.exportPomodoroStats",
    commandFactory.createExportStatsCommand()
  );

  const clearPomodoroStarts = vscode.commands.registerCommand(
    "pomodoro-timer.clearPomodoroStats",
    commandFactory.createClearStatsCommand()
  );

  pomodoroStatusBarItem.show();

  context.subscriptions.push(pomodoroStatusBarItem);
  context.subscriptions.push(startTimerDisposable);
  context.subscriptions.push(cancelTimerDisposable);
  context.subscriptions.push(startCustomTimerDisposable);
  context.subscriptions.push(showStatsDisposable);
  context.subscriptions.push(exportStatsDisposable);
  context.subscriptions.push(clearPomodoroStarts);
}

// This method is called when your extension is deactivated
export function deactivate(context: vscode.ExtensionContext) {
  console.log("Deactivating pomodoro-timer");

  if (cleanupFunction !== null) {
    cleanupFunction();
  }
}
