function formatConversationDate(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMs < 60 * 60 * 1000) return `${diffMinutes}m ago`;
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.round(diffMs / (60 * 60 * 1000));
    return `${hours}h ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function ConversationList({
  items = [],
  activeId = '',
  onSelectConversation,
  onDeleteConversation,
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
        No chats yet. Start a fresh conversation whenever you are ready.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <li
            key={item.id}
            className={`flex items-center gap-2 rounded-2xl border transition ${
              isActive
                ? 'border-teal-200 bg-teal-50/80 shadow-sm'
                : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectConversation?.(item.id)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-teal-300"
              aria-label={`Open conversation ${item.title}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-700">
                  {item.title || 'New chat'}
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  {formatConversationDate(item.updatedAt)}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteConversation?.(item.id)}
              className="mr-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-300"
              aria-label={`Delete conversation ${item.title || 'New chat'}`}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M5.5 5.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 .75.75v.75h-9v-.75Zm1.5 2.25h6.5v7.5a1.5 1.5 0 0 1-1.5 1.5H8.5a1.5 1.5 0 0 1-1.5-1.5v-7.5Zm2.5-1.5h2v.75h-2v-.75Zm-2.5 2.5v6h1.5v-6H7Zm4.5 0v6h1.5v-6h-1.5Z" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
