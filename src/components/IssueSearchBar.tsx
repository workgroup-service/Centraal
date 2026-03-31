/**
 * @author Cursor
 */

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface IssueSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function IssueSearchBar({ value, onChange }: IssueSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Issue を検索..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
