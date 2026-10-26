import ConversationList from './ConversationList.jsx';

const NAV_ITEMS = [
  { id: 'chat', label: 'Chat' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'trends', label: 'Trends' },
];

export default function Sidebar({
  activeTab,
  conversations,
  currentSessionId,
  mobileOpen,
  onSelectTab,
  onNewChat,
  onStartFresh,
  onSelectConversation,
  onDeleteConversation,
  onClearAllHistory,
  onClose,
}) {
  const navButtonClasses = (isActive) =>
    `flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-300 ${
      isActive
        ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
    }`;

  const content = (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-lg font-semibold text-white shadow-sm">
            M
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold text-slate-800">MindPulse</p>
            <p className="text-[11px] text-slate-500">AI Wellbeing Coach</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-teal-200/60 transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-teal-300"
          aria-label="Start a new chat"
        >
          <span className="text-lg leading-none">＋</span>
          <span>New chat</span>
        </button>
      </div>

      <nav className="px-3 pb-4" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectTab(item.id);
              onClose?.();
            }}
            className={navButtonClasses(activeTab === item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <span>{item.label}</span>
            <span className="text-xs opacity-80">→</span>
          </button>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Chat history
          </h2>
        </div>
        <div className="max-h-[38vh] overflow-y-auto pr-1">
          <ConversationList
            items={conversations}
            activeId={currentSessionId}
            onSelectConversation={onSelectConversation}
            onDeleteConversation={onDeleteConversation}
          />
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Non-clinical wellbeing coach. Not a substitute for professional help.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onClearAllHistory}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            Clear all history
          </button>
          <button
            type="button"
            onClick={onStartFresh}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-screen w-72 flex-col border-r border-slate-200 bg-white md:flex md:fixed md:left-0 md:top-0 md:z-10">
        {content}
      </aside>

      <div className="md:hidden">
        {mobileOpen && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="fixed inset-0 z-20 bg-slate-900/40"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-slate-200 bg-white transition-transform duration-200 ease-out md:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Sidebar navigation"
        >
          {content}
        </aside>
      </div>
    </>
  );
}
