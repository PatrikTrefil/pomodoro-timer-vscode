import * as vscode from "vscode";
import papaparse from "papaparse";
import fs from "fs";

type HistoryItem = { duration: number; workspaceName: string };
type History = HistoryItem[];

/**
 * Manages history of pomodoro sessions using vscode global state.
 */
class HistoryManager {
  globalStateKey = "stats";
  globalState: vscode.Memento;

  /**
   * @param globalState memento to which pomodoro sessions are saved
   */
  constructor(globalState: vscode.Memento) {
    this.globalState = globalState;
  }

  /**
   * Save a pomodoro session to vscode global state.
   * @param historyItem represents a pomodoro session that is to be saved
   */
  saveSession(historyItem: HistoryItem): void {
    const currentHistory =
      this.globalState.get<History>(this.globalStateKey) ?? [];
    currentHistory.push(historyItem);
    console.debug("Saving session to global state");
    this.globalState.update(this.globalStateKey, currentHistory);
  }

  /**
   * @returns history saved in vscode global state
   */
  getHistory(): History {
    return this.globalState.get<History>(this.globalStateKey) ?? [];
  }

  /**
   * Clear history saved in vscode global state.
   */
  clearHistory(): void {
    this.globalState.update(this.globalStateKey, []);
  }
}

type Session = {
  endTime: Date;
  updateIntervalId: NodeJS.Timeout;
  durationInMins: number;
};

/**
 * Manages running pomodoro session. The state is stored in memory. The state is lost when vscode is closed.
 * Unfinished or cancelled sessions are not saved to history.
 */
class SessionManager {
  session: Session | null = null;
  statusBarItem: vscode.StatusBarItem;
  historyManager: HistoryManager;

  /**
   * @param statusBarItem status bar item to display remaining time in session
   * @param historyManager history manager to save finished sessions
   */
  constructor(
    statusBarItem: vscode.StatusBarItem,
    historyManager: HistoryManager
  ) {
    this.statusBarItem = statusBarItem;
    this.historyManager = historyManager;
  }

  /**
   * Start a new pomodoro session.
   * @param durationInMins duration of the session in minutes
   * @throws {Error} if there is already a running session
   */
  startNewSession(durationInMins: number) {
    if (this.session !== null) {
      throw new Error("There is already a running session");
    }

    const newStartDateTime = new Date();
    const newEndDateTime = new Date(newStartDateTime);
    newEndDateTime.setMinutes(newEndDateTime.getMinutes() + durationInMins);

    // Finish session after durationInMins
    setTimeout(() => {
      this.endCurrentSession();
      vscode.window.showInformationMessage("Pomodoro session finished!");
    }, durationInMins * 60 * 1000);

    this.statusBarItem.text = `Pomodoro Timer: ${durationInMins} min`;

    // Update status bar periodically
    let updateIntervalId = setInterval(() => {
      const diffInMs = newEndDateTime.getTime() - new Date().getTime();
      const diffInS = diffInMs / 1000;
      const diffInMins = Math.ceil(diffInS / 60);

      console.debug("Update status bar item");
      this.statusBarItem.text = `Pomodoro Timer: ${
        diffInMins < 0 ? 0 : diffInMins
      } min`;
    }, 1000 * 10);
    this.session = {
      endTime: newEndTime,
      updateIntervalId,
      durationInMins: durationInMins,
    };
  }

  /**
   * End the current pomodoro session.
   * If the current session is finished, the session is saved to history.
   * @throws {Error} if there is no running session
   */
  endCurrentSession(): void {
    if (this.session === null) {
      throw new Error("There is no running session");
    }

    clearInterval(this.session.updateIntervalId);
    this.statusBarItem.hide();

    const isSessionFinished = this.session.endTime < new Date();
    if (isSessionFinished) {
      this.historyManager.saveSession({
        duration: this.session.durationInMins,
        workspaceName: vscode.workspace.name ?? "unknown",
      });
    }

    this.session = null;
  }
}

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

  cleanupFunction = () => {
    sessionManager.endCurrentSession();
  };

  const startTimerDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.startTimerStandard",
    () => {
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
        sessionManager.startNewSession(defaultSessionDurationInMins);
      } catch (e) {
        if (e instanceof Error) {
          vscode.window.showErrorMessage(e.message);
        }
        return;
      }
      vscode.window.showInformationMessage(
        `Pomodoro timer started (${defaultSessionDurationInMins} min)`
      );
    }
  );

  const cancelTimerDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.cancelTimer",
    () => {
      if (sessionManager.session !== null) {
        vscode.window.showInformationMessage("Pomodoro timer ended");
        sessionManager.endCurrentSession();
      } else {
        vscode.window.showErrorMessage("Pomodoro timer not started");
      }
    }
  );

  const startCustomTimerDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.startTimerCustom",
    async () => {
      if (sessionManager.session !== null) {
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
      sessionManager.startNewSession(sessionDuration);
      vscode.window.showInformationMessage(
        `Pomodoro timer started (${sessionDuration} min)`
      );
    }
  );

  function generateStatsPageHtml() {
    return `
      <html>
        <body>
          <h1>Pomodoro stats</h1>
          <ul>
            <li>Total number of sessions: ${
              historyManager.getHistory().length
            }</li>
          </ul>
          <table>
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Duration (mins)</th>
              </tr>
            </thead>
            <tbody>
              ${historyManager.getHistory().map(
                (historyItem) =>
                  `
                  <tr>
                    <td>${historyItem.workspaceName}</td>
                    <td>${historyItem.duration}</td>
                  </tr>`
              )}
            </tbody>
          </table>
        </body>
      </html>
      `;
  }

  const showStatsDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.showPomodoroStats",
    () => {
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
      }, 1000 * 60 * 1);

      panel.onDidDispose(
        () => {
          clearInterval(regenPageIntervalId);
        },
        null,
        context.subscriptions
      );
    }
  );

  const exportStatsDisposable = vscode.commands.registerCommand(
    "pomodoro-timer.exportPomodoroStats",
    async () => {
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
        papaparse.unparse(historyManager.getHistory())
      );
    }
  );

  const clearPomodoroStarts = vscode.commands.registerCommand(
    "pomodoro-timer.clearPomodoroStats",
    () => {
      historyManager.clearHistory();
      vscode.window.showInformationMessage("Pomodoro stats cleared");
    }
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
