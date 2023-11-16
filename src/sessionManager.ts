import * as vscode from "vscode";
import HistoryManager from "./historyManager";

type Session = {
  startDateTime: Date;
  endDateTime: Date;
  updateIntervalId: NodeJS.Timeout;
  durationInMins: number;
};

/**
 * Manages running pomodoro session. The state is stored in memory. The state is lost when vscode is closed.
 * Unfinished or cancelled sessions are not saved to history.
 */
export default class SessionManager {
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
      startDateTime: newStartDateTime,
      endDateTime: newEndDateTime,
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

    const isSessionFinished = this.session.endDateTime < new Date();
    if (isSessionFinished) {
      this.historyManager.saveSession({
        duration: this.session.durationInMins,
        workspaceName: vscode.workspace.name ?? "unknown",
        startDateTime: this.session.startDateTime,
        endDateTime: this.session.endDateTime,
      });
    }

    this.session = null;
  }
}
