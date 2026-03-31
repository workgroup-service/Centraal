/**
 * @author Cursor
 */

import { useState, useEffect } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { GitLabIssue, IssueTimerState } from "@/types/gitlab";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function computeDisplayMs(state: IssueTimerState): number {
  const runningDelta =
    state.isRunning && state.startTime !== null
      ? Date.now() - state.startTime
      : 0;
  return state.accumulatedMs + runningDelta;
}

interface IssueRowProps {
  issue: GitLabIssue;
  timerState: IssueTimerState;
  disabled: boolean;
  onToggleTimer: (issueId: number) => void;
}

export function IssueRow({
  issue,
  timerState,
  disabled,
  onToggleTimer,
}: IssueRowProps) {
  const isRunning = timerState.isRunning;
  const [displayMs, setDisplayMs] = useState(() =>
    computeDisplayMs(timerState)
  );

  useEffect(() => {
    setDisplayMs(computeDisplayMs(timerState));
    if (!timerState.isRunning) return;

    const id = setInterval(() => {
      setDisplayMs(computeDisplayMs(timerState));
    }, 200);
    return () => clearInterval(id);
  }, [timerState]);

  return (
    <TableRow className={isRunning ? "bg-accent/50" : undefined}>
      <TableCell className="font-mono text-muted-foreground">
        #{issue.iid}
      </TableCell>
      <TableCell className="max-w-[160px] truncate text-muted-foreground text-xs">
        {issue.projectName}
      </TableCell>
      <TableCell className="max-w-[300px] truncate font-medium">
        {issue.title}
      </TableCell>
      <TableCell>
        <Button
          variant={isRunning ? "default" : "outline"}
          size="icon-sm"
          disabled={disabled}
          onClick={() => onToggleTimer(issue.id)}
          aria-label={isRunning ? "Stop" : "Start"}
        >
          {isRunning ? (
            <Square className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {formatElapsed(displayMs)}
      </TableCell>
    </TableRow>
  );
}
