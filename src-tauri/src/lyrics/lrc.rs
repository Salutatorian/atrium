use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LyricLine {
    pub time_ms: u64,
    pub text: String,
}

/// Parse enhanced/simple LRC into timed lines. Untimed lines are ignored for sync.
pub fn parse_lrc(input: &str) -> Vec<LyricLine> {
    let mut lines = Vec::new();
    for raw in input.lines() {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }

        let mut rest = line;
        let mut times = Vec::new();
        while rest.starts_with('[') {
            if let Some(end) = rest.find(']') {
                let tag = &rest[1..end];
                if let Some(ms) = parse_timestamp(tag) {
                    times.push(ms);
                } else if is_metadata_tag(tag) {
                    times.clear();
                    break;
                }
                rest = rest[end + 1..].trim_start();
            } else {
                break;
            }
        }

        let text = rest.trim();
        if times.is_empty() {
            continue;
        }
        for time_ms in times {
            lines.push(LyricLine {
                time_ms,
                text: text.to_string(),
            });
        }
    }
    lines.sort_by_key(|line| line.time_ms);
    lines
}

pub fn is_synced_lrc(input: &str) -> bool {
    !parse_lrc(input).is_empty()
}

pub fn plain_from_lrc(input: &str) -> String {
    let lines = parse_lrc(input);
    if lines.is_empty() {
        return input
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty() && !line.starts_with('['))
            .collect::<Vec<_>>()
            .join("\n");
    }
    lines
        .into_iter()
        .map(|line| line.text)
        .filter(|text| !text.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn active_line_index(lines: &[LyricLine], position_ms: i64) -> Option<usize> {
    if lines.is_empty() {
        return None;
    }
    let pos = position_ms.max(0) as u64;
    let mut active = 0usize;
    for (index, line) in lines.iter().enumerate() {
        if line.time_ms <= pos {
            active = index;
        } else {
            break;
        }
    }
    Some(active)
}

fn is_metadata_tag(tag: &str) -> bool {
    let key = tag.split(':').next().unwrap_or("").to_ascii_lowercase();
    matches!(
        key.as_str(),
        "ti" | "ar" | "al" | "by" | "offset" | "re" | "ve" | "length"
    )
}

fn parse_timestamp(tag: &str) -> Option<u64> {
    // mm:ss.xx or mm:ss.xxx or mm:ss
    let parts: Vec<&str> = tag.split(':').collect();
    if parts.len() != 2 {
        return None;
    }
    let minutes: u64 = parts[0].parse().ok()?;
    let sec_parts: Vec<&str> = parts[1].split('.').collect();
    let seconds: u64 = sec_parts.first()?.parse().ok()?;
    let fraction = sec_parts.get(1).copied().unwrap_or("0");
    let millis = match fraction.len() {
        0 => 0,
        1 => fraction.parse::<u64>().ok()? * 100,
        2 => fraction.parse::<u64>().ok()? * 10,
        _ => fraction[..3].parse::<u64>().ok()?,
    };
    Some(minutes * 60_000 + seconds * 1_000 + millis)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_lrc() {
        let input = "\
[ti:Test]
[00:12.00]First line
[00:15.50]Second line
[01:02.05]Third
";
        let lines = parse_lrc(input);
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[0].time_ms, 12_000);
        assert_eq!(lines[0].text, "First line");
        assert_eq!(lines[1].time_ms, 15_500);
        assert_eq!(lines[2].time_ms, 62_050);
    }

    #[test]
    fn active_line_tracks_position() {
        let lines = parse_lrc("[00:00.00]A\n[00:10.00]B\n[00:20.00]C\n");
        assert_eq!(active_line_index(&lines, 0), Some(0));
        assert_eq!(active_line_index(&lines, 10_000), Some(1));
        assert_eq!(active_line_index(&lines, 25_000), Some(2));
    }

    #[test]
    fn plain_extracts_text() {
        let plain = plain_from_lrc("[00:01.00]Hello\n[00:02.00]World\n");
        assert_eq!(plain, "Hello\nWorld");
    }
}
