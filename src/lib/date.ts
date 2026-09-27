// 読者は日本在住が前提なので、ビルド環境（CI は UTC）のタイムゾーンに依存せず常に JST で表示する
const formatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// ロケール既定の区切り（"2026/09/27 14:37"）に頼らず yyyy-MM-dd HH:mm を明示的に組み立てる
export function formatDateTime(value: Date | string): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// <time datetime> 用。表示と同じ時刻を指すよう UTC の ISO 8601 で出す
export function toISO(value: Date | string): string {
  return new Date(value).toISOString();
}
