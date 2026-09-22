//! Windows taskbar thumbnail toolbar (previous / pause / next on hover preview).

use std::mem::size_of;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::OnceLock;

use parking_lot::Mutex;
use tauri::{AppHandle, Manager};
use ::windows::core::w;
use ::windows::Win32::Foundation::{HWND, LPARAM, LRESULT, TRUE, WPARAM};
use ::windows::Win32::Graphics::Gdi::{
    CreateBitmap, CreateDIBSection, DeleteObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
    DIB_RGB_COLORS, HGDIOBJ,
};
use ::windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER};
use ::windows::Win32::UI::Shell::{
    DefSubclassProc, ITaskbarList3, RemoveWindowSubclass, SetWindowSubclass, TaskbarList,
    THBF_ENABLED, THBN_CLICKED, THB_FLAGS, THB_ICON, THB_TOOLTIP, THUMBBUTTON,
};
use ::windows::Win32::UI::WindowsAndMessaging::{
    ChangeWindowMessageFilterEx, CreateIconIndirect, RegisterWindowMessageW, HICON, ICONINFO,
    MSGFLT_ALLOW, WM_COMMAND, WM_DESTROY,
};

use crate::app::AppState;
use crate::audio::types::PlayerStatus;

const ID_PREV: u32 = 1;
const ID_TOGGLE: u32 = 2;
const ID_NEXT: u32 = 3;
const SUBCLASS_ID: usize = 0x4154_5249;
const ICON_SIZE: i32 = 32;

static APP: OnceLock<AppHandle> = OnceLock::new();
static TASKBAR_CREATED: AtomicU32 = AtomicU32::new(0);
static PLAYING: AtomicBool = AtomicBool::new(false);
static BAR: Mutex<Option<ThumbBar>> = Mutex::new(None);

struct ThumbBar {
    hwnd: HWND,
    list: ITaskbarList3,
    prev: HICON,
    play: HICON,
    pause: HICON,
    next: HICON,
    added: bool,
}

unsafe impl Send for ThumbBar {}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let _ = APP.set(app.clone());
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let hwnd = match window.hwnd() {
        Ok(hwnd) if !hwnd.is_invalid() => hwnd,
        _ => return Ok(()),
    };

    let created = unsafe { RegisterWindowMessageW(w!("TaskbarButtonCreated")) };
    TASKBAR_CREATED.store(created, Ordering::Relaxed);
    if created != 0 {
        let _ = unsafe { ChangeWindowMessageFilterEx(hwnd, created, MSGFLT_ALLOW, None) };
    }

    let list: ITaskbarList3 = match unsafe { CoCreateInstance(&TaskbarList, None, CLSCTX_INPROC_SERVER) } {
        Ok(list) => list,
        Err(err) => {
            eprintln!("Taskbar thumbnail toolbar unavailable: {err}");
            return Ok(());
        }
    };
    if let Err(err) = unsafe { list.HrInit() } {
        eprintln!("Taskbar thumbnail toolbar init failed: {err}");
        return Ok(());
    }

    let (prev, play, pause, next) = match make_icons() {
        Ok(icons) => icons,
        Err(err) => {
            eprintln!("Taskbar thumbnail icons failed: {err}");
            return Ok(());
        }
    };

    *BAR.lock() = Some(ThumbBar {
        hwnd,
        list,
        prev,
        play,
        pause,
        next,
        added: false,
    });

    let hooked = unsafe { SetWindowSubclass(hwnd, Some(thumb_proc), SUBCLASS_ID, 0) };
    if hooked != TRUE {
        eprintln!("Taskbar thumbnail subclass failed");
        return Ok(());
    }

    add_or_update_buttons(true);
    Ok(())
}

pub fn sync_play_pause(app: &AppHandle, playing: bool) {
    PLAYING.store(playing, Ordering::Relaxed);
    let app = app.clone();
    let _ = app.run_on_main_thread(|| {
        add_or_update_buttons(false);
    });
}

fn add_or_update_buttons(force_add: bool) {
    let mut guard = BAR.lock();
    let Some(bar) = guard.as_mut() else {
        return;
    };
    let playing = PLAYING.load(Ordering::Relaxed);
    let buttons = [
        thumb_button(ID_PREV, bar.prev, "Previous"),
        thumb_button(ID_TOGGLE, if playing { bar.pause } else { bar.play }, if playing { "Pause" } else { "Play" }),
        thumb_button(ID_NEXT, bar.next, "Next"),
    ];
    let result = if force_add || !bar.added {
        unsafe { bar.list.ThumbBarAddButtons(bar.hwnd, &buttons) }
    } else {
        unsafe { bar.list.ThumbBarUpdateButtons(bar.hwnd, &buttons) }
    };
    match result {
        Ok(()) => bar.added = true,
        Err(err) if force_add || !bar.added => {
            // Taskbar button may not exist yet; TaskbarButtonCreated retries add.
            eprintln!("Taskbar thumbnail buttons not ready: {err}");
        }
        Err(err) => eprintln!("Taskbar thumbnail update failed: {err}"),
    }
}

fn thumb_button(id: u32, icon: HICON, tip: &str) -> THUMBBUTTON {
    let mut button = THUMBBUTTON {
        dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
        iId: id,
        hIcon: icon,
        dwFlags: THBF_ENABLED,
        ..Default::default()
    };
    let encoded: Vec<u16> = tip.encode_utf16().collect();
    let n = encoded.len().min(button.szTip.len() - 1);
    button.szTip[..n].copy_from_slice(&encoded[..n]);
    button
}

unsafe extern "system" fn thumb_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _id: usize,
    _ref: usize,
) -> LRESULT {
    let created = TASKBAR_CREATED.load(Ordering::Relaxed);
    if created != 0 && msg == created {
        if let Some(bar) = BAR.lock().as_mut() {
            bar.added = false;
        }
        add_or_update_buttons(true);
        return LRESULT(0);
    }
    if msg == WM_COMMAND {
        let id = (wparam.0 as u32) & 0xffff;
        let notify = (wparam.0 as u32) >> 16;
        if notify == THBN_CLICKED {
            on_thumb_click(id);
            return LRESULT(0);
        }
    }
    if msg == WM_DESTROY {
        let _ = RemoveWindowSubclass(hwnd, Some(thumb_proc), SUBCLASS_ID);
    }
    unsafe { DefSubclassProc(hwnd, msg, wparam, lparam) }
}

fn on_thumb_click(id: u32) {
    let Some(app) = APP.get() else {
        return;
    };
    let Some(state) = app.try_state::<AppState>() else {
        return;
    };
    match id {
        ID_PREV => {
            let _ = state.player.previous();
        }
        ID_TOGGLE => match state.player.snapshot().status {
            PlayerStatus::Playing => {
                let _ = state.player.pause();
            }
            _ => {
                let _ = state.player.play();
            }
        },
        ID_NEXT => {
            let _ = state.player.next();
        }
        _ => {}
    }
}

fn make_icons() -> ::windows::core::Result<(HICON, HICON, HICON, HICON)> {
    Ok((
        icon_from_pixels(&draw_prev())?,
        icon_from_pixels(&draw_play())?,
        icon_from_pixels(&draw_pause())?,
        icon_from_pixels(&draw_next())?,
    ))
}

fn icon_from_pixels(pixels: &[u8]) -> ::windows::core::Result<HICON> {
    let bmi = BITMAPINFO {
        bmiHeader: BITMAPINFOHEADER {
            biSize: size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: ICON_SIZE,
            biHeight: -ICON_SIZE,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        },
        ..Default::default()
    };
    let mut bits = std::ptr::null_mut();
    let color = unsafe { CreateDIBSection(None, &bmi, DIB_RGB_COLORS, &mut bits, None, 0) }?;
    if !bits.is_null() {
        unsafe {
            std::ptr::copy_nonoverlapping(pixels.as_ptr(), bits.cast::<u8>(), pixels.len());
        }
    }
    let stride = (((ICON_SIZE as usize) + 31) / 32) * 4;
    let mask_bits = vec![0u8; stride * ICON_SIZE as usize];
    let mask = unsafe {
        CreateBitmap(
            ICON_SIZE,
            ICON_SIZE,
            1,
            1,
            Some(mask_bits.as_ptr().cast()),
        )
    };
    if mask.is_invalid() {
        unsafe {
            let _ = DeleteObject(HGDIOBJ::from(color));
        }
        return Err(::windows::core::Error::from_win32());
    }
    let info = ICONINFO {
        fIcon: TRUE,
        xHotspot: 0,
        yHotspot: 0,
        hbmMask: mask,
        hbmColor: color,
    };
    let icon = unsafe { CreateIconIndirect(&info) };
    unsafe {
        let _ = DeleteObject(HGDIOBJ::from(color));
        let _ = DeleteObject(HGDIOBJ::from(mask));
    }
    icon
}

fn canvas() -> Vec<u8> {
    vec![0u8; (ICON_SIZE * ICON_SIZE * 4) as usize]
}

fn put(px: &mut [u8], x: i32, y: i32) {
    if x < 0 || y < 0 || x >= ICON_SIZE || y >= ICON_SIZE {
        return;
    }
    let i = ((y * ICON_SIZE + x) * 4) as usize;
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    px[i + 3] = 255;
}

fn fill_rect(px: &mut [u8], x0: i32, y0: i32, x1: i32, y1: i32) {
    for y in y0..y1 {
        for x in x0..x1 {
            put(px, x, y);
        }
    }
}

fn fill_tri(px: &mut [u8], ax: i32, ay: i32, bx: i32, by: i32, cx: i32, cy: i32) {
    let minx = ax.min(bx).min(cx).max(0);
    let maxx = ax.max(bx).max(cx).min(ICON_SIZE - 1);
    let miny = ay.min(by).min(cy).max(0);
    let maxy = ay.max(by).max(cy).min(ICON_SIZE - 1);
    for y in miny..=maxy {
        for x in minx..=maxx {
            let w0 = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
            let w1 = (cx - bx) * (y - by) - (cy - by) * (x - bx);
            let w2 = (ax - cx) * (y - cy) - (ay - cy) * (x - cx);
            if (w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0) {
                put(px, x, y);
            }
        }
    }
}

fn draw_prev() -> Vec<u8> {
    let mut px = canvas();
    fill_rect(&mut px, 6, 8, 10, 24);
    fill_tri(&mut px, 24, 6, 24, 26, 10, 16);
    px
}

fn draw_play() -> Vec<u8> {
    let mut px = canvas();
    fill_tri(&mut px, 10, 6, 10, 26, 26, 16);
    px
}

fn draw_pause() -> Vec<u8> {
    let mut px = canvas();
    fill_rect(&mut px, 9, 7, 14, 25);
    fill_rect(&mut px, 18, 7, 23, 25);
    px
}

fn draw_next() -> Vec<u8> {
    let mut px = canvas();
    fill_tri(&mut px, 8, 6, 8, 26, 22, 16);
    fill_rect(&mut px, 22, 8, 26, 24);
    px
}
