/**
 * @author Cursor
 *
 * GitLab REST API v4 client.
 * Uses @tauri-apps/plugin-http in Tauri, falls back to native fetch outside.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { GitLabIssue } from "@/types/gitlab";

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function apiFetch(
  url: string,
  token: string,
  init?: RequestInit
): Promise<Response> {
  const headers: Record<string, string> = {
    "PRIVATE-TOKEN": token,
    ...(init?.headers as Record<string, string>),
  };

  const fetchFn = isTauriEnv() ? tauriFetch : globalThis.fetch;

  const response = await fetchFn(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GitLabApiError(response.status, response.statusText, body);
  }

  return response;
}

export class GitLabApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string
  ) {
    super(GitLabApiError.buildMessage(status, statusText));
    this.name = "GitLabApiError";
  }

  private static buildMessage(status: number, statusText: string): string {
    switch (status) {
      case 401:
        return "認証に失敗しました。Token が無効または期限切れです。";
      case 403:
        return "アクセスが拒否されました。Token の権限を確認してください。";
      case 404:
        return "リソースが見つかりません。GitLab URL を確認してください。";
      default:
        return `GitLab API エラー: ${status} ${statusText}`;
    }
  }
}

export async function fetchAssignedIssues(
  baseUrl: string,
  token: string
): Promise<GitLabIssue[]> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/v4/issues?scope=assigned_to_me&state=opened&per_page=100`;

  const response = await apiFetch(url, token);
  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("GitLab API から予期しないレスポンスを受信しました。");
  }

  return data.map(mapToGitLabIssue);
}

export async function addSpentTime(
  baseUrl: string,
  token: string,
  projectId: number,
  issueIid: number,
  duration: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/v4/projects/${projectId}/issues/${issueIid}/add_spent_time`;

  await apiFetch(url, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ duration }),
  });
}

function extractProjectName(webUrl: string): string {
  try {
    const pathname = new URL(webUrl).pathname;
    const idx = pathname.indexOf("/-/");
    if (idx !== -1) {
      return pathname.slice(1, idx);
    }
  } catch {
    // invalid URL — fall through
  }
  return "";
}

function mapToGitLabIssue(raw: unknown): GitLabIssue {
  const obj = raw as Record<string, unknown>;
  const webUrl = String(obj.web_url ?? "");
  return {
    id: Number(obj.id),
    iid: Number(obj.iid),
    project_id: Number(obj.project_id),
    title: String(obj.title ?? ""),
    description: obj.description != null ? String(obj.description) : null,
    state: obj.state === "closed" ? "closed" : "opened",
    web_url: webUrl,
    projectName: extractProjectName(webUrl),
    labels: Array.isArray(obj.labels)
      ? obj.labels.map((l: unknown) => String(l))
      : [],
    created_at: String(obj.created_at ?? ""),
    updated_at: String(obj.updated_at ?? ""),
  };
}
