/**
 * @author Cursor
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Settings, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AttendanceBar } from "@/components/AttendanceBar";
import type { AttendanceStatus } from "@/components/AttendanceBar";
import { IssueSearchBar } from "@/components/IssueSearchBar";
import { IssueTable } from "@/components/IssueTable";
import { TokenWarningBanner } from "@/components/TokenWarningBanner";
import { SettingsDialog } from "@/components/SettingsDialog";
import type { GitLabIssue, IssueTimerState } from "@/types/gitlab";
import {
  getSettingValue,
  setSettingValue,
  saveTimerStates,
  loadTimerStates,
  SETTINGS_KEYS,
} from "@/lib/store";
import {
  fetchAssignedIssues,
  addSpentTime,
  GitLabApiError,
} from "@/lib/gitlab-api";
import { formatDurationForGitLab } from "@/lib/duration";

function stopAllRunning(
  map: Map<number, IssueTimerState>
): Map<number, IssueTimerState> {
  const next = new Map(map);
  for (const [id, state] of next) {
    if (state.isRunning && state.startTime !== null) {
      next.set(id, {
        ...state,
        accumulatedMs: state.accumulatedMs + (Date.now() - state.startTime),
        startTime: null,
        isRunning: false,
      });
    }
  }
  return next;
}

function finalizeMs(state: IssueTimerState): number {
  return (
    state.accumulatedMs +
    (state.isRunning && state.startTime !== null
      ? Date.now() - state.startTime
      : 0)
  );
}

function parseAttendanceStatus(value: string | null): AttendanceStatus | null {
  if (
    value === "not_started" ||
    value === "working" ||
    value === "on_break" ||
    value === "finished"
  ) {
    return value;
  }
  return null;
}

function parseNumber(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function App() {
  const [token, setToken] = useState("");
  const [gitlabUrl, setGitlabUrl] = useState("https://gitlab.com");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>("not_started");
  const [timerStates, setTimerStates] = useState<Map<number, IssueTimerState>>(
    () => new Map()
  );
  const [posting, setPosting] = useState(false);
  const persistRef = useRef(false);

  const [issues, setIssues] = useState<GitLabIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  const hasToken = token.trim().length > 0;
  const isWorking = attendanceStatus === "working";
  const isTimerDisabled = !hasToken || !isWorking;

  // --- Persist timer states on every change ---
  useEffect(() => {
    if (!persistRef.current) return;
    saveTimerStates(timerStates);
  }, [timerStates]);

  useEffect(() => {
    if (!persistRef.current) return;
    void setSettingValue(SETTINGS_KEYS.ATTENDANCE_STATUS, attendanceStatus);
  }, [attendanceStatus]);

  useEffect(() => {
    if (!persistRef.current || attendanceStatus !== "working") return;

    void setSettingValue(SETTINGS_KEYS.LAST_ALIVE_AT, String(Date.now()));
    const id = setInterval(() => {
      void setSettingValue(SETTINGS_KEYS.LAST_ALIVE_AT, String(Date.now()));
    }, 5000);

    return () => {
      clearInterval(id);
      void setSettingValue(SETTINGS_KEYS.LAST_ALIVE_AT, String(Date.now()));
    };
  }, [attendanceStatus]);

  // --- Load settings + timer states on mount ---
  const loadIssues = useCallback(
    async (currentToken: string, currentUrl: string) => {
      if (!currentToken.trim()) return;
      setIssuesLoading(true);
      try {
        const fetched = await fetchAssignedIssues(currentUrl, currentToken);
        setIssues(fetched);
        if (fetched.length === 0) {
          toast.info("アサインされている Issue はありません。");
        }
      } catch (err) {
        if (err instanceof GitLabApiError) {
          toast.error(err.message);
        } else if (err instanceof Error) {
          toast.error(`通信エラー: ${err.message}`);
        } else {
          toast.error("Issue の取得に失敗しました。");
        }
        setIssues([]);
      } finally {
        setIssuesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    async function init() {
      const savedToken = await getSettingValue(SETTINGS_KEYS.GITLAB_TOKEN);
      const savedUrl = await getSettingValue(SETTINGS_KEYS.GITLAB_URL);
      const savedAttendance = parseAttendanceStatus(
        await getSettingValue(SETTINGS_KEYS.ATTENDANCE_STATUS)
      );
      const savedLastActiveIssueId = parseNumber(
        await getSettingValue(SETTINGS_KEYS.LAST_ACTIVE_ISSUE_ID)
      );
      const savedLastAliveAt = parseNumber(
        await getSettingValue(SETTINGS_KEYS.LAST_ALIVE_AT)
      );
      const resolvedToken = savedToken ?? "";
      const resolvedUrl = savedUrl ?? "https://gitlab.com";
      setToken(resolvedToken);
      setGitlabUrl(resolvedUrl);
      if (savedAttendance) {
        setAttendanceStatus(savedAttendance);
      }

      const restored = await loadTimerStates();
      if (restored.size > 0) {
        let nextStates = restored;
        const hasRunning = Array.from(restored.values()).some(
          (s) => s.isRunning
        );

        // App was killed during working, but no running timer was persisted.
        // Resume from the last operated task.
        if (!hasRunning && savedAttendance === "working") {
          const resumeIssueId = savedLastActiveIssueId;

          if (resumeIssueId !== null) {
            const resumed = new Map(restored);
            const target = resumed.get(resumeIssueId);
            if (target && target.accumulatedMs > 0) {
              const now = Date.now();
              const downtimeMs =
                savedLastAliveAt !== null
                  ? Math.max(0, now - savedLastAliveAt)
                  : 0;

              resumed.set(resumeIssueId, {
                ...target,
                accumulatedMs: target.accumulatedMs + downtimeMs,
                startTime: now,
                isRunning: true,
              });
              nextStates = resumed;
              toast.info(
                `前回の勤務状態を復元し、最後のタスク Issue #${resumeIssueId} を再開しました。`
              );
            }
          }
        }

        setTimerStates(nextStates);

        if (hasRunning || savedAttendance === "working") {
          setAttendanceStatus("working");
        }
      }

      persistRef.current = true;
      setLoaded(true);

      if (resolvedToken.trim()) {
        loadIssues(resolvedToken, resolvedUrl);
      }
    }
    init();
  }, [loadIssues]);

  // --- Timer toggle (start / stop, exclusive) ---
  const handleToggleTimer = useCallback((issueId: number) => {
    void setSettingValue(SETTINGS_KEYS.LAST_ACTIVE_ISSUE_ID, String(issueId));
    void setSettingValue(SETTINGS_KEYS.LAST_ALIVE_AT, String(Date.now()));

    setTimerStates((prev) => {
      const current = prev.get(issueId);

      if (current?.isRunning) {
        const next = new Map(prev);
        next.set(issueId, {
          ...current,
          accumulatedMs: finalizeMs(current),
          startTime: null,
          isRunning: false,
        });
        return next;
      }

      const next = stopAllRunning(prev);
      const now = Date.now();
      const existing = next.get(issueId);
      next.set(issueId, {
        issueId,
        startTime: now,
        accumulatedMs: existing?.accumulatedMs ?? 0,
        isRunning: true,
      });
      return next;
    });
  }, []);

  // --- Attendance handlers ---
  const handleClockIn = useCallback(() => {
    setAttendanceStatus("working");
  }, []);

  const handleToggleBreak = useCallback(() => {
    setAttendanceStatus((prev) =>
      prev === "on_break" ? "working" : "on_break"
    );
    setTimerStates((prev) => {
      const hasRunning = Array.from(prev.values()).some((t) => t.isRunning);
      if (!hasRunning) return prev;
      return stopAllRunning(prev);
    });
  }, []);

  // --- Clock out: stop all timers, POST to GitLab, reset ---
  const handleClockOut = useCallback(async () => {
    setAttendanceStatus("finished");

    const stopped = stopAllRunning(timerStates);
    setTimerStates(stopped);

    const entriesToPost = Array.from(stopped.values()).filter(
      (s) => s.accumulatedMs >= 60_000
    );

    if (entriesToPost.length === 0) {
      toast.info("送信する工数はありません。");
      setTimerStates(new Map());
      await saveTimerStates(new Map());
      return;
    }

    const issueMap = new Map(issues.map((i) => [i.id, i]));

    setPosting(true);
    let successCount = 0;
    let failCount = 0;

    for (const entry of entriesToPost) {
      const issue = issueMap.get(entry.issueId);
      if (!issue) {
        failCount++;
        continue;
      }
      const duration = formatDurationForGitLab(entry.accumulatedMs);
      try {
        await addSpentTime(
          gitlabUrl,
          token,
          issue.project_id,
          issue.iid,
          duration
        );
        successCount++;
      } catch (err) {
        failCount++;
        const title = issue.title.slice(0, 30);
        if (err instanceof GitLabApiError) {
          toast.error(`#${issue.iid} ${title}: ${err.message}`);
        } else {
          toast.error(`#${issue.iid} ${title}: 送信に失敗しました`);
        }
      }
    }

    setPosting(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} 件の工数を GitLab に送信しました。`
      );
    }
    if (failCount > 0) {
      toast.warning(`${failCount} 件の送信に失敗しました。`);
    }

    setTimerStates(new Map());
    await saveTimerStates(new Map());
  }, [timerStates, issues, gitlabUrl, token]);

  const handleSaveSettings = useCallback(
    async (newToken: string, newUrl: string) => {
      setToken(newToken);
      setGitlabUrl(newUrl);
      await setSettingValue(SETTINGS_KEYS.GITLAB_TOKEN, newToken);
      await setSettingValue(SETTINGS_KEYS.GITLAB_URL, newUrl);
      setSettingsOpen(false);
      toast.success("設定を保存しました。");
      if (newToken.trim()) {
        loadIssues(newToken, newUrl);
      }
    },
    [loadIssues]
  );

  const handleRefresh = useCallback(() => {
    loadIssues(token, gitlabUrl);
  }, [loadIssues, token, gitlabUrl]);

  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues;
    const q = searchQuery.toLowerCase();
    return issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) || String(issue.iid).includes(q)
    );
  }, [searchQuery, issues]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight">Centraal</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={!hasToken || issuesLoading}
            aria-label="リフレッシュ"
          >
            <RefreshCw
              className={`size-4 ${issuesLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="設定"
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {!hasToken && (
          <TokenWarningBanner onOpenSettings={() => setSettingsOpen(true)} />
        )}

        <AttendanceBar
          status={attendanceStatus}
          disabled={!hasToken}
          onClockIn={handleClockIn}
          onToggleBreak={handleToggleBreak}
          onClockOut={handleClockOut}
          posting={posting}
        />

        <IssueSearchBar value={searchQuery} onChange={setSearchQuery} />

        <IssueTable
          issues={filteredIssues}
          timerStates={timerStates}
          disabled={isTimerDisabled}
          loading={issuesLoading}
          onToggleTimer={handleToggleTimer}
        />
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        token={token}
        gitlabUrl={gitlabUrl}
        onSave={handleSaveSettings}
      />

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
