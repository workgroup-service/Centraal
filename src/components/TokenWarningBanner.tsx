/**
 * @author Cursor
 */

import { AlertTriangle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TokenWarningBannerProps {
  onOpenSettings: () => void;
}

export function TokenWarningBanner({
  onOpenSettings,
}: TokenWarningBannerProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          GitLab Token が設定されていません。設定画面から入力してください。
        </span>
        <Button variant="outline" size="sm" onClick={onOpenSettings}>
          <Settings data-icon="inline-start" className="size-3.5" />
          設定を開く
        </Button>
      </AlertDescription>
    </Alert>
  );
}
