/**
 * @author Cursor
 */

export interface GitLabIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: "opened" | "closed";
  web_url: string;
  /** Extracted from web_url, e.g. "group/project" */
  projectName: string;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface IssueTimerState {
  issueId: number;
  /** Non-null when the timer is currently running (epoch ms). */
  startTime: number | null;
  /** Total ms accumulated from completed (stopped) sessions. */
  accumulatedMs: number;
  isRunning: boolean;
}
