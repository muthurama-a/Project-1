"""
SM-2 Spaced Repetition Scheduler
==================================
Algorithm reference: SuperMemo SM-2
  • q (quality) is 0-5
  • EF ≥ 1.3 always
  • Interval: 1 → 6 → EF*interval
"""
from datetime import datetime, timedelta, timezone
from typing import Tuple


def sm2_next(
    easiness: float,
    interval: int,
    repetitions: int,
    quality: int               # 0 = forgot, 5 = perfect recall
) -> Tuple[float, int, int]:
    """
    Returns (new_easiness, new_interval, new_repetitions).
    quality: 0-5  (0-2 = incorrect, 3-5 = correct)
    """
    # Update easiness factor
    new_ef = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ef = max(1.3, new_ef)  # EF never below 1.3

    if quality < 3:
        # Incorrect: reset repetitions, restart interval
        new_repetitions = 0
        new_interval = 1
    else:
        new_repetitions = repetitions + 1
        if new_repetitions == 1:
            new_interval = 1
        elif new_repetitions == 2:
            new_interval = 6
        else:
            new_interval = round(interval * new_ef)

    return new_ef, new_interval, new_repetitions


def compute_due_date(interval_days: int) -> datetime:
    """Returns a UTC datetime `interval_days` from now."""
    return datetime.now(timezone.utc) + timedelta(days=interval_days)


def compute_hesitation_score(response_time_ms: int, hesitation_count: int) -> float:
    """
    Normalised hesitation score 0.0–1.0.
    - Fast response (<1000 ms) + 0 hesitations → 0.0
    - Slow response (>5000 ms) + many hesitations → 1.0
    """
    time_factor = min(response_time_ms / 5000.0, 1.0)
    hesitation_factor = min(hesitation_count / 5.0, 1.0)
    return round((time_factor * 0.6 + hesitation_factor * 0.4), 3)


def compute_quality_from_velocity(
    response_time_ms: int,
    hesitation_score: float,
    is_correct: bool
) -> int:
    """
    Maps speed + hesitation + correctness into SM-2 quality (0-5).
    """
    if not is_correct:
        return 1 if hesitation_score < 0.5 else 0

    if response_time_ms < 1500 and hesitation_score < 0.2:
        return 5  # Perfect — fast and confident
    elif response_time_ms < 3000 and hesitation_score < 0.4:
        return 4  # Good
    elif response_time_ms < 5000 and hesitation_score < 0.6:
        return 3  # OK
    else:
        return 2  # Hesitant but correct — borderline
