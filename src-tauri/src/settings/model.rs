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
    pub restore_last_page: bool,
    pub restore_queue: bool,
    pub language: String,
    pub check_for_updates: bool,
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
}

fn default_shell_mode() -> String {
    "normal".into()
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
                restore_last_page: true,
                restore_queue: true,
                language: "system".into(),
                check_for_updates: false,
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
        if !matches!(shell, "normal" | "immersive" | "mini") {
            return Err(AppError::Message(
                "appearance.shellMode must be normal, immersive, or mini".into(),
            ));
        }
        let motion = self.appearance.reduced_motion.as_str();
        if !matches!(motion, "system" | "reduce" | "no-preference") {
            return Err(AppError::Message(
                "appearance.reducedMotion must be system, reduce, or no-preference".into(),
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
