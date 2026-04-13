/**
 * @author Cursor
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  gitlabUrl: string;
  onSave: (token: string, gitlabUrl: string) => void;
  /** 通常の退勤送信中は競合を避けるため無効化に使う */
  posting?: boolean;
  onClockOutWithoutSend?: () => void | Promise<void>;
}

export function SettingsDialog({
  open,
  onOpenChange,
  token,
  gitlabUrl,
  onSave,
  posting = false,
  onClockOutWithoutSend,
}: SettingsDialogProps) {
  const [draftToken, setDraftToken] = useState(token);
  const [draftUrl, setDraftUrl] = useState(gitlabUrl);

  useEffect(() => {
    if (open) {
      setDraftToken(token);
      setDraftUrl(gitlabUrl);
    }
  }, [open, token, gitlabUrl]);

  const handleSave = () => {
    onSave(draftToken.trim(), draftUrl.trim() || "https://gitlab.com");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
          <DialogDescription>
            GitLab の Personal Access Token と接続先 URL を設定してください。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gitlab-token">GitLab Token (PAT)</Label>
            <Input
              id="gitlab-token"
              type="password"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={draftToken}
              onChange={(e) => setDraftToken(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gitlab-url">GitLab URL</Label>
            <Input
              id="gitlab-url"
              type="url"
              placeholder="https://gitlab.com"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
            />
          </div>

          {onClockOutWithoutSend && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                記録した工数を GitLab に送らず、全タイマーを 0
                にして退勤済みにします。
              </p>
              <Button
                type="button"
                variant="destructive"
                disabled={posting}
                onClick={() => void onClockOutWithoutSend()}
              >
                送信せずに退勤する
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
