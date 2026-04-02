/**
 * @author Cursor
 */

import { LogIn, Coffee, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AttendanceStatus =
  | "not_started"
  | "working"
  | "on_break"
  | "finished";

interface AttendanceBarProps {
  status: AttendanceStatus;
  disabled: boolean;
  posting?: boolean;
  onClockIn: () => void;
  onToggleBreak: () => void;
  onClockOut: () => void;
}

export function AttendanceBar({
  status,
  disabled,
  posting = false,
  onClockIn,
  onToggleBreak,
  onClockOut,
}: AttendanceBarProps) {
  const isWorking = status === "working";
  const isOnBreak = status === "on_break";
  const isActive = isWorking || isOnBreak;

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onClockIn}
        disabled={disabled || isActive}
        variant={status === "not_started" ? "default" : "outline"}
      >
        <LogIn data-icon="inline-start" className="size-4" />
        出勤
      </Button>

      <Button
        onClick={onToggleBreak}
        disabled={disabled || !isActive}
        variant={isOnBreak ? "default" : "outline"}
      >
        <Coffee data-icon="inline-start" className="size-4" />
        {isOnBreak ? "再開" : "休憩"}
      </Button>

      <Button
        onClick={onClockOut}
        disabled={disabled || !isActive || posting}
        variant="destructive"
      >
        {posting ? (
          <Loader2 data-icon="inline-start" className="size-4 animate-spin" />
        ) : (
          <LogOut data-icon="inline-start" className="size-4" />
        )}
        {posting ? "送信中..." : "退勤"}
      </Button>

      <span className="ml-2 text-sm text-muted-foreground">
        {status === "not_started" && "未出勤"}
        {status === "working" && "勤務中"}
        {status === "on_break" && "休憩中"}
        {status === "finished" && !posting && "退勤済み"}
        {posting && "工数を GitLab に送信中..."}
      </span>
    </div>
  );
}
