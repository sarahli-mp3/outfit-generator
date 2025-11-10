interface MenuBarProps {
  activeTab: "main" | "gallery";
  onChangeTab: (tab: "main" | "gallery") => void;
}

export function MenuBar({ activeTab, onChangeTab }: MenuBarProps) {
  return (
    <menu role="tablist" style={{ margin: 0, padding: "6px 10px" }}>
      <li role="tab" aria-selected={activeTab === "main"}>
        <a
          href="#tabs"
          onClick={(e) => {
            e.preventDefault();
            onChangeTab("main");
          }}
        >
          Main
        </a>
      </li>
      <li role="tab" aria-selected={activeTab === "gallery"}>
        <a
          href="#tabs"
          onClick={(e) => {
            e.preventDefault();
            onChangeTab("gallery");
          }}
        >
          Gallery
        </a>
      </li>
    </menu>
  );
}
