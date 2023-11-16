import * as vscode from "vscode";

type HistoryItem = {
  duration: number;
  workspaceName: string;
  startDateTime: Date;
  endDateTime: Date;
};
type History = HistoryItem[];

/**
 * Manages history of pomodoro sessions using vscode global state.
 */
export default class HistoryManager {
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
