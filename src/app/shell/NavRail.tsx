import { APP_NAME } from "../brand";
import { IconCollapse, IconExpand } from "../../components/icons";
import { Tooltip } from "../../components/Tooltip";
import { useSettingsStore } from "../../stores/settings-store";
import { useShellStore } from "../../stores/shell-store";
import { cn } from "../../utils/cn";
import { primaryNav, utilityNav } from "./nav-items";

export function NavRail() {
  const activeNav = useShellStore((s) => s.activeNav);
  const expanded = useShellStore((s) => s.sidebarExpanded);
  const setActiveNav = useShellStore((s) => s.setActiveNav);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const patchAppearance = useSettingsStore((s) => s.patchAppearance);

  return (
    <aside
      className={cn("nav-rail", expanded && "nav-rail--expanded")}
      aria-label="Primary"
    >
      <div className="nav-rail__brand">
        <button
          type="button"
          className="brand-mark"
          onClick={() => setActiveNav("home")}
          aria-label={`${APP_NAME} home`}
        >
          <span className="brand-mark__glyph" aria-hidden="true">
            A
          </span>
          {expanded ? <span className="brand-mark__name">{APP_NAME}</span> : null}
        </button>
      </div>

      <nav className="nav-rail__list" aria-label="Library">
        {primaryNav.map((item) => {
          const { Icon } = item;
          const button = (
            <button
              type="button"
              className={cn(
                "nav-item",
                activeNav === item.id && "nav-item--active",
              )}
              aria-current={activeNav === item.id ? "page" : undefined}
              aria-label={item.label}
              onClick={() => setActiveNav(item.id)}
            >
              <Icon className="nav-item__icon" />
              {expanded ? (
                <span className="nav-item__label">{item.label}</span>
              ) : null}
            </button>
          );

          return (
            <div key={item.id} className="nav-item-wrap">
              {expanded ? (
                button
              ) : (
                <Tooltip label={item.label}>{button}</Tooltip>
              )}
            </div>
          );
        })}
      </nav>

      <div className="nav-rail__footer">
        <nav className="nav-rail__list" aria-label="Utilities">
          {utilityNav.map((item) => {
            const { Icon } = item;
            const button = (
              <button
                type="button"
                className={cn(
                  "nav-item",
                  activeNav === item.id && "nav-item--active",
                )}
                aria-current={activeNav === item.id ? "page" : undefined}
                aria-label={item.label}
                onClick={() => setActiveNav(item.id)}
              >
                <Icon className="nav-item__icon" />
                {expanded ? (
                  <span className="nav-item__label">{item.label}</span>
                ) : null}
              </button>
            );

            return (
              <div key={item.id} className="nav-item-wrap">
                {expanded ? (
                  button
                ) : (
                  <Tooltip label={item.label}>{button}</Tooltip>
                )}
              </div>
            );
          })}
        </nav>

        <Tooltip
          label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          side="top"
        >
          <button
            type="button"
            className="nav-item nav-item--toggle"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            onClick={() => {
              const next = !expanded;
              toggleSidebar();
              void patchAppearance({ sidebarExpanded: next });
            }}
          >
            {expanded ? <IconCollapse /> : <IconExpand />}
            {expanded ? <span className="nav-item__label">Collapse</span> : null}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
