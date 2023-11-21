import * as vscode from "vscode";
import HistoryManager from "./historyManager";
import SessionManager from "./sessionManager";
import papaparse from "papaparse";
import fs from "fs";

export class CommandFactory {
  historyManager: HistoryManager;
  sessionManager: SessionManager;
  context: vscode.ExtensionContext;

  constructor(
    context: vscode.ExtensionContext,
    historyManager: HistoryManager,
    sessionManager: SessionManager
  ) {
    this.historyManager = historyManager;
    this.sessionManager = sessionManager;
    this.context = context;
  }

  createStartTimerCommand() {
    return () => {
      const defaultSessionDurationInMins = vscode.workspace
        .getConfiguration("pomodoro-timer")
        .get<number>("defaultSessionDuration");

      if (defaultSessionDurationInMins === undefined) {
        vscode.window.showErrorMessage(
          "Pomodoro timer extension is not configured. Please set pomodoro-timer.defaultSessionDuration in your settings."
        );
        return;
      }

      try {
        this.sessionManager.startNewSession(defaultSessionDurationInMins);
      } catch (e) {
        if (e instanceof Error) {
          vscode.window.showErrorMessage(e.message);
        }
        return;
      }
      vscode.window.showInformationMessage(
        `Pomodoro timer started (${defaultSessionDurationInMins} min)`
      );
    };
  }

  createCancelTimerCommand() {
    return () => {
      if (this.sessionManager.session !== null) {
        vscode.window.showInformationMessage("Pomodoro timer ended");
        this.sessionManager.endCurrentSession();
      } else {
        vscode.window.showErrorMessage("Pomodoro timer not started");
      }
    };
  }

  createStartCustomTimerCommand() {
    return async () => {
      if (this.sessionManager.session !== null) {
        vscode.window.showErrorMessage(
          "Pomodoro timer already started. Cancel the current session before starting a new one."
        );
        return;
      }
      let sessionDuration: number | undefined = undefined;
      while (sessionDuration === undefined) {
        const newSessionDurationString = await vscode.window.showInputBox({
          prompt: "Enter session duration in mins",
          placeHolder: "e.g. 10",
        });
        if (newSessionDurationString === undefined) {
          vscode.window.showErrorMessage(
            "You need to provide a session duration. Sesssion start cancelled."
          );
          return;
        }
        const newSessionDurationNumber = Number(newSessionDurationString);
        if (isNaN(newSessionDurationNumber) === false) {
          sessionDuration = newSessionDurationNumber;
        } else {
          vscode.window.showErrorMessage(
            "You provided an invalid number. Try again or cancel. Example valid values are: 10, 25, 30"
          );
        }
      }
      this.sessionManager.startNewSession(sessionDuration);
      vscode.window.showInformationMessage(
        `Pomodoro timer started (${sessionDuration} min)`
      );
    };
  }

  createShowStatsCommand() {
    const generateStatsPageHtml = () => {
      return `
      <html>
        <head>
          <style>
            table, th, td {
              border-style: solid;
              border-collapse: collapse;
            }
            th, td {
              padding: 5px;
            }
          </style>
        </head>
        <body>
          <h1>Pomodoro stats</h1>
          <ul>
            <li>Total number of sessions: ${
              this.historyManager.getHistory().length
            }</li>
          </ul>
          <table>
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Duration (mins)</th>
                <th>Start date</th>
                <th>End date</th>
              </tr>
            </thead>
            <tbody>
              ${this.historyManager.getHistory().map(
                (historyItem) =>
                  `
                  <tr>
                    <td>${historyItem.workspaceName}</td>
                    <td>${historyItem.duration}</td>
                    <td>${historyItem.startDateTime.toLocaleString()}</td>
                    <td>${historyItem.endDateTime.toLocaleString()}</td>
                  </tr>`
              )}
            </tbody>
          </table>
        </body>
      </html>
      `;
    };
    return () => {
      const panel = vscode.window.createWebviewPanel(
        "pomodoroStats",
        "Pomodoro Stats",
        vscode.ViewColumn.One,
        {}
      );
      panel.webview.html = generateStatsPageHtml();

      // periodically regenerate the page so the stats are up to date
      const regenPageIntervalId = setInterval(() => {
        console.debug("Regenerating stats page");
        panel.webview.html = generateStatsPageHtml();
      }, 1000 * 30);

      panel.onDidDispose(
        () => {
          clearInterval(regenPageIntervalId);
        },
        null,
        this.context.subscriptions
      );
    };
  }

  createExportStatsCommand() {
    return async () => {
      const folderToExportTo = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "Select folder to export stats to",
      });
      if (folderToExportTo === undefined) {
        vscode.window.showErrorMessage("No folder selected");
        return;
      }
      const fileNameInput = await vscode.window.showInputBox({
        prompt: "Enter file name without extension (leave empty for deafult)",
        placeHolder: "e.g. pomodoro-stats",
      });
      const fileName =
        fileNameInput === undefined || fileNameInput === ""
          ? "pomodoro-stats.csv"
          : fileNameInput + ".csv";

      fs.writeFileSync(
        `${folderToExportTo[0].fsPath}/${fileName}`,
        papaparse.unparse(this.historyManager.getHistory())
      );
    };
  }

  createClearStatsCommand() {
    return () => {
      this.historyManager.clearHistory();
      vscode.window.showInformationMessage("Pomodoro stats cleared");
    };
  }
}
