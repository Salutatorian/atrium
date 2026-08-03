//! System tray (notification area) — Windows, macOS, and Linux.
//! Keeps Atrium light: hide to tray instead of fully quitting when enabled.

use crate::app::AppState;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Show Atrium", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit Atrium", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Atrium")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => quit_app(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    // Keep the tray icon alive for the whole process (dropping it removes the icon).
    let tray: TrayIcon<R> = builder.build(app)?;
    app.manage(tray);
    Ok(())
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn quit_app<R: Runtime>(app: &AppHandle<R>) {
    if let Some(state) = app.try_state::<AppState>() {
        state.allow_exit.store(true, std::sync::atomic::Ordering::SeqCst);
    }
    app.exit(0);
}

pub fn close_to_tray_enabled(app: &AppHandle) -> bool {
    app.try_state::<AppState>()
        .map(|state| state.settings.lock().general.close_to_tray)
        .unwrap_or(true)
}
