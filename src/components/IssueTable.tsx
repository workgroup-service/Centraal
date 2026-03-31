/**
 * @author Cursor
 */

import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IssueRow } from "@/components/IssueRow";
import type { GitLabIssue, IssueTimerState } from "@/types/gitlab";

interface IssueTableProps {
  issues: GitLabIssue[];
  timerStates: Map<number, IssueTimerState>;
  disabled: boolean;
  loading: boolean;
  onToggleTimer: (issueId: number) => void;
}

const defaultTimerState: IssueTimerState = {
  issueId: 0,
  startTime: null,
  accumulatedMs: 0,
  isRunning: false,
};

export function IssueTable({
  issues,
  timerStates,
  disabled,
  loading,
  onToggleTimer,
}: IssueTableProps) {
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Issue を取得中...
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        該当する Issue がありません
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Issue ID</TableHead>
            <TableHead className="w-[160px]">Project</TableHead>
            <TableHead>Issue Title</TableHead>
            <TableHead className="w-[60px]">Start</TableHead>
            <TableHead className="w-[100px]">経過時間</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              timerState={
                timerStates.get(issue.id) ?? {
                  ...defaultTimerState,
                  issueId: issue.id,
                }
              }
              disabled={disabled}
              onToggleTimer={onToggleTimer}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
