use crate::audio::types::{QueueTrack, RepeatMode};
use rand::seq::SliceRandom;
use rand::rng;

#[derive(Debug, Default)]
pub struct PlayQueue {
    items: Vec<QueueTrack>,
    index: Option<usize>,
    shuffle: bool,
    repeat: RepeatMode,
    /// Original order indices when shuffle is enabled.
    order: Vec<usize>,
}

impl PlayQueue {
    pub fn items(&self) -> &[QueueTrack] {
        &self.items
    }

    pub fn index(&self) -> Option<usize> {
        self.index
    }

    pub fn shuffle(&self) -> bool {
        self.shuffle
    }

    pub fn repeat(&self) -> RepeatMode {
        self.repeat
    }

    pub fn current(&self) -> Option<&QueueTrack> {
        self.index.and_then(|i| self.items.get(i))
    }

    pub fn replace(&mut self, tracks: Vec<QueueTrack>, start_index: usize) {
        self.items = tracks;
        self.rebuild_order();
        self.index = if self.items.is_empty() {
            None
        } else {
            Some(start_index.min(self.items.len() - 1))
        };
    }

    pub fn clear(&mut self) {
        self.items.clear();
        self.order.clear();
        self.index = None;
    }

    pub fn add_end(&mut self, tracks: Vec<QueueTrack>) {
        if tracks.is_empty() {
            return;
        }
        self.items.extend(tracks);
        self.rebuild_order();
        if self.index.is_none() && !self.items.is_empty() {
            self.index = Some(0);
        }
    }

    pub fn add_next(&mut self, tracks: Vec<QueueTrack>) {
        if tracks.is_empty() {
            return;
        }
        let insert_at = self.index.map(|i| i + 1).unwrap_or(0).min(self.items.len());
        for (offset, track) in tracks.into_iter().enumerate() {
            self.items.insert(insert_at + offset, track);
        }
        self.rebuild_order();
        if self.index.is_none() && !self.items.is_empty() {
            self.index = Some(0);
        }
    }

    pub fn remove(&mut self, index: usize) {
        if index >= self.items.len() {
            return;
        }
        self.items.remove(index);
        self.rebuild_order();
        self.index = match self.index {
            None => None,
            Some(_i) if self.items.is_empty() => None,
            Some(i) if i > index => Some(i - 1),
            Some(i) if i == index => Some(i.min(self.items.len() - 1)),
            Some(i) => Some(i),
        };
    }

    pub fn set_shuffle(&mut self, enabled: bool) {
        self.shuffle = enabled;
        self.rebuild_order();
    }

    pub fn set_repeat(&mut self, mode: RepeatMode) {
        self.repeat = mode;
    }

    pub fn next_index(&mut self, force: bool) -> Option<usize> {
        if self.items.is_empty() {
            self.index = None;
            return None;
        }

        if !force && self.repeat == RepeatMode::Track {
            return self.index;
        }

        let current = self.index.unwrap_or(0);
        if let Some(pos) = self.order.iter().position(|&i| i == current) {
            if pos + 1 < self.order.len() {
                let next = self.order[pos + 1];
                self.index = Some(next);
                return Some(next);
            }
        }

        match self.repeat {
            RepeatMode::Queue => {
                let next = self.order.first().copied().unwrap_or(0);
                self.index = Some(next);
                Some(next)
            }
            RepeatMode::Off | RepeatMode::Track => {
                self.index = Some(current);
                None
            }
        }
    }

    pub fn previous_index(&mut self) -> Option<usize> {
        if self.items.is_empty() {
            self.index = None;
            return None;
        }
        let current = self.index.unwrap_or(0);
        if let Some(pos) = self.order.iter().position(|&i| i == current) {
            if pos > 0 {
                let prev = self.order[pos - 1];
                self.index = Some(prev);
                return Some(prev);
            }
        }
        if self.repeat == RepeatMode::Queue {
            let prev = *self.order.last().unwrap_or(&0);
            self.index = Some(prev);
            return Some(prev);
        }
        self.index
    }

    fn rebuild_order(&mut self) {
        let mut order: Vec<usize> = (0..self.items.len()).collect();
        if self.shuffle && order.len() > 1 {
            let current = self.index;
            order.shuffle(&mut rng());
            if let Some(current) = current {
                if let Some(pos) = order.iter().position(|&i| i == current) {
                    order.swap(0, pos);
                }
            }
        }
        self.order = order;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(id: i64) -> QueueTrack {
        QueueTrack {
            track_id: id,
            path: format!("/tmp/{id}.flac"),
            title: Some(format!("Track {id}")),
            artist: None,
            album: None,
            duration_ms: Some(180_000),
            artwork_cache_key: None,
        }
    }

    #[test]
    fn next_advances_and_stops_at_end() {
        let mut queue = PlayQueue::default();
        queue.replace(vec![track(1), track(2), track(3)], 0);
        assert_eq!(queue.next_index(true), Some(1));
        assert_eq!(queue.next_index(true), Some(2));
        assert_eq!(queue.next_index(true), None);
    }

    #[test]
    fn repeat_queue_wraps() {
        let mut queue = PlayQueue::default();
        queue.replace(vec![track(1), track(2)], 1);
        queue.set_repeat(RepeatMode::Queue);
        assert_eq!(queue.next_index(true), Some(0));
    }

    #[test]
    fn repeat_track_stays_without_force() {
        let mut queue = PlayQueue::default();
        queue.replace(vec![track(1), track(2)], 0);
        queue.set_repeat(RepeatMode::Track);
        assert_eq!(queue.next_index(false), Some(0));
        assert_eq!(queue.next_index(true), Some(1));
    }

    #[test]
    fn previous_wraps_with_repeat_queue() {
        let mut queue = PlayQueue::default();
        queue.replace(vec![track(1), track(2), track(3)], 0);
        queue.set_repeat(RepeatMode::Queue);
        assert_eq!(queue.previous_index(), Some(2));
    }
}
