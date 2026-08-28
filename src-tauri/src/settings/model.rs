use crate::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub schema_version: u32,
    pub general: GeneralSettings,
    pub library: LibrarySettings,
    pub playback: PlaybackSettings,
    pub appearance: AppearanceSettings,
    pub lyrics: LyricsSettings,
    pub privacy: PrivacySettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSettings {
    pub launch_behavior: String,
    pub start_minimized: bool,
    /// When true (default), the X button hides to the system tray instead of quitting.
    #[serde(default = "default_true")]
    pub close_to_tray: bool,
    /// Launch Atrium when the user signs in (Windows / macOS / Linux).
    #[serde(default)]
    pub launch_at_login: bool,
    pub restore_last_page: bool,
    #[serde(default = "default_true")]
    pub restore_queue: bool,
    pub language: String,
    pub check_for_updates: bool,
    /// When true, download and install on launch (app may restart quietly).
    #[serde(default = "default_true")]
    pub auto_install_updates: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySettings {
    pub watch_folders: bool,
    pub include_hidden_files: bool,
    pub follow_symlinks: bool,
    pub max_recursion_depth: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackSettings {
    pub default_volume: f64,
    pub remember_volume: bool,
    pub autoplay_on_drop: bool,
    pub seek_step_seconds: u32,
    #[serde(default = "default_rg_mode")]
    pub replay_gain_mode: String,
    #[serde(default)]
    pub preamp_db: f64,
    #[serde(default)]
    pub eq_enabled: bool,
    /// Legacy 3-band fields (migrated into eq_bands when non-zero).
    #[serde(default)]
    pub eq_bass_db: f64,
    #[serde(default)]
    pub eq_mid_db: f64,
    #[serde(default)]
    pub eq_treble_db: f64,
    #[serde(default = "default_eq_bands")]
    pub eq_bands: Vec<f64>,
    #[serde(default = "default_eq_q")]
    pub eq_q: f64,
    #[serde(default = "default_eq_preset_id")]
    pub eq_preset_id: String,
    #[serde(default)]
    pub crossfade_enabled: bool,
    #[serde(default = "default_crossfade_seconds")]
    pub crossfade_seconds: u32,
}

fn default_rg_mode() -> String {
    "off".into()
}

fn default_crossfade_seconds() -> u32 {
    3
}

fn default_eq_bands() -> Vec<f64> {
    vec![0.0; 10]
}

fn default_eq_q() -> f64 {
    1.0
}

fn default_eq_preset_id() -> String {
    "flat".into()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSettings {
    pub theme_id: String,
    pub follow_system_theme: bool,
    pub density: String,
    pub player_bar_style: String,
    #[serde(default = "default_shell_mode")]
    pub shell_mode: String,
    pub sidebar_expanded: bool,
    pub inspector_open: bool,
    pub inspector_width: u32,
    pub reduced_motion: String,
    #[serde(default = "default_ui_font_id")]
    pub ui_font_id: String,
    #[serde(default = "default_heading_font_id")]
    pub heading_font_id: String,
    #[serde(default = "default_visualizer_style")]
    pub visualizer_style: String,
    #[serde(default = "default_visualizer_enabled")]
    pub visualizer_enabled: bool,
    #[serde(default = "default_visualizer_scene")]
    pub visualizer_scene: String,
    #[serde(default = "default_visualizer_overlay")]
    pub visualizer_overlay: String,
    #[serde(default = "default_visualizer_auto_hide")]
    pub visualizer_auto_hide: bool,
    #[serde(default = "default_visualizer_hide_cursor")]
    pub visualizer_hide_cursor: bool,
    #[serde(default = "default_visualizer_vignette")]
    pub visualizer_vignette: bool,
    #[serde(default)]
    pub visualizer_grain: bool,
}

fn default_shell_mode() -> String {
    "normal".into()
}

fn default_ui_font_id() -> String {
    "dm-sans".into()
}

fn default_heading_font_id() -> String {
    "fraunces".into()
}

fn default_visualizer_style() -> String {
    "classic-blocks".into()
}

fn default_visualizer_enabled() -> bool {
    true
}

fn default_visualizer_scene() -> String {
    "ambience".into()
}

fn default_visualizer_overlay() -> String {
    "track-change".into()
}

fn default_visualizer_auto_hide() -> bool {
    true
}

fn default_visualizer_hide_cursor() -> bool {
    true
}

fn default_visualizer_vignette() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LyricsSettings {
    pub prefer_synchronized: bool,
    pub font_size: u32,
    pub alignment: String,
    pub global_offset_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PrivacySettings {
    pub allow_network: bool,
    pub allow_lyrics_providers: bool,
    pub allow_crash_reports: bool,
    pub allow_analytics: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            general: GeneralSettings {
                launch_behavior: "normal".into(),
                start_minimized: false,
                close_to_tray: true,
                launch_at_login: false,
                restore_last_page: true,
                restore_queue: true,
                language: "system".into(),
                check_for_updates: true,
                auto_install_updates: true,
            },
            library: LibrarySettings {
                watch_folders: false,
                include_hidden_files: false,
                follow_symlinks: false,
                max_recursion_depth: 32,
            },
            playback: PlaybackSettings {
                default_volume: 0.8,
                remember_volume: true,
                autoplay_on_drop: true,
                seek_step_seconds: 5,
                replay_gain_mode: "off".into(),
                preamp_db: 0.0,
                eq_enabled: false,
                eq_bass_db: 0.0,
                eq_mid_db: 0.0,
                eq_treble_db: 0.0,
                eq_bands: default_eq_bands(),
                eq_q: 1.0,
                eq_preset_id: "flat".into(),
                crossfade_enabled: false,
                crossfade_seconds: 3,
            },
            appearance: AppearanceSettings {
                theme_id: "atrium-mist".into(),
                follow_system_theme: false,
                density: "comfortable".into(),
                player_bar_style: "floating-pill".into(),
                shell_mode: "normal".into(),
                sidebar_expanded: false,
                inspector_open: false,
                inspector_width: 320,
                reduced_motion: "system".into(),
                ui_font_id: "dm-sans".into(),
                heading_font_id: "fraunces".into(),
                visualizer_style: "classic-blocks".into(),
                visualizer_enabled: true,
                visualizer_scene: "ambience".into(),
                visualizer_overlay: "track-change".into(),
                visualizer_auto_hide: true,
                visualizer_hide_cursor: true,
                visualizer_vignette: true,
                visualizer_grain: false,
            },
            lyrics: LyricsSettings {
                prefer_synchronized: true,
                font_size: 18,
                alignment: "center".into(),
                global_offset_ms: 0,
            },
            privacy: PrivacySettings {
                allow_network: false,
                allow_lyrics_providers: false,
                allow_crash_reports: false,
                allow_analytics: false,
            },
        }
    }
}

impl AppSettings {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.schema_version == 0 {
            return Err(AppError::Message(
                "settings.schemaVersion must be >= 1".into(),
            ));
        }
        if !(0.0..=1.0).contains(&self.playback.default_volume) {
            return Err(AppError::Message(
                "playback.defaultVolume must be between 0 and 1".into(),
            ));
        }
        let rg = self.playback.replay_gain_mode.as_str();
        if !matches!(rg, "off" | "track" | "album") {
            return Err(AppError::Message(
                "playback.replayGainMode must be off, track, or album".into(),
            ));
        }
        if !(-24.0..=24.0).contains(&self.playback.preamp_db)
            || !(-12.0..=12.0).contains(&self.playback.eq_bass_db)
            || !(-12.0..=12.0).contains(&self.playback.eq_mid_db)
            || !(-12.0..=12.0).contains(&self.playback.eq_treble_db)
        {
            return Err(AppError::Message(
                "playback EQ/preamp values are out of range".into(),
            ));
        }
        if !(0.3..=4.0).contains(&self.playback.eq_q) {
            return Err(AppError::Message(
                "playback.eqQ must be between 0.3 and 4".into(),
            ));
        }
        if self.playback.eq_bands.len() != 10 {
            return Err(AppError::Message(
                "playback.eqBands must contain exactly 10 bands".into(),
            ));
        }
        if self
            .playback
            .eq_bands
            .iter()
            .any(|g| !(-12.0..=12.0).contains(g))
        {
            return Err(AppError::Message(
                "playback.eqBands values must be between -12 and 12 dB".into(),
            ));
        }
        if self.playback.crossfade_seconds > 12 {
            return Err(AppError::Message(
                "playback.crossfadeSeconds must be <= 12".into(),
            ));
        }
        if self.library.max_recursion_depth == 0 || self.library.max_recursion_depth > 256 {
            return Err(AppError::Message(
                "library.maxRecursionDepth must be between 1 and 256".into(),
            ));
        }
        if self.appearance.inspector_width < 240 || self.appearance.inspector_width > 720 {
            return Err(AppError::Message(
                "appearance.inspectorWidth must be between 240 and 720".into(),
            ));
        }
        let density = self.appearance.density.as_str();
        if !matches!(density, "compact" | "comfortable" | "spacious") {
            return Err(AppError::Message(
                "appearance.density must be compact, comfortable, or spacious".into(),
            ));
        }
        let bar = self.appearance.player_bar_style.as_str();
        if !matches!(bar, "floating-pill" | "full-width") {
            return Err(AppError::Message(
                "appearance.playerBarStyle must be floating-pill or full-width".into(),
            ));
        }
        let shell = self.appearance.shell_mode.as_str();
        if !matches!(shell, "normal" | "visualizer" | "mini" | "immersive") {
            return Err(AppError::Message(
                "appearance.shellMode must be normal, visualizer, or mini".into(),
            ));
        }
        let motion = self.appearance.reduced_motion.as_str();
        if !matches!(motion, "system" | "reduce" | "no-preference") {
            return Err(AppError::Message(
                "appearance.reducedMotion must be system, reduce, or no-preference".into(),
            ));
        }
        let viz = self.appearance.visualizer_style.as_str();
        if !matches!(
            viz,
            "off"
                | "classic-blocks"
                | "accent-bars"
                | "soft-dots"
                | "rainbow-blocks"
                | "neon-segments"
                | "cyan-grid"
                | "gold-grid"
                | "fade-dots"
                | "peak-magenta"
                | "peak-cyan"
                | "peak-gradient"
                | "mirror-bars"
                | "wave-ribbon"
                | "wave-neon"
                | "pulse-bars"
                | "mono-leds"
                | "fire-bars"
                | "ice-bars"
                | "radial-spectrum"
                | "frequency-ring"
                | "oscilloscope"
        ) {
            return Err(AppError::Message(
                "appearance.visualizerStyle is not a known soundbar style".into(),
            ));
        }
        let overlay = self.appearance.visualizer_overlay.as_str();
        if !matches!(overlay, "always" | "track-change" | "never") {
            return Err(AppError::Message(
                "appearance.visualizerOverlay must be always, track-change, or never".into(),
            ));
        }
        let scene = self.appearance.visualizer_scene.as_str();
        if !matches!(
            scene,
            "ambience" | "tunnel" | "plasma" | "starfield" | "particles" | "vortex" | "ribbons"
        ) {
            return Err(AppError::Message(
                "appearance.visualizerScene is not a known visualizer scene".into(),
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_are_valid() {
        AppSettings::default().validate().unwrap();
    }

    #[test]
    fn rejects_invalid_volume() {
        let mut settings = AppSettings::default();
        settings.playback.default_volume = 1.5;
        assert!(settings.validate().is_err());
    }

    #[test]
    fn rejects_invalid_shell_mode() {
        let mut settings = AppSettings::default();
        settings.appearance.shell_mode = "cinema".into();
        assert!(settings.validate().is_err());
    }
}
