from ipyaudio.timer import Timer
from ipyaudio.utils import merge_mappings, performance_table


def test_merge_mappings_is_recursive_without_mutating_inputs():
    defaults = {"options": {"rate": 16000, "color": "green"}}
    overrides = {"options": {"rate": 48000}}

    merged = merge_mappings(defaults, overrides)

    assert merged == {"options": {"rate": 48000, "color": "green"}}
    assert defaults["options"]["rate"] == 16000


def test_performance_table_escapes_values():
    rendered = performance_table({"state": ["<State>", "a&b"]})

    assert "&lt;State&gt;" in rendered
    assert "a&amp;b" in rendered


def test_timer_uses_monotonic_clock_and_stops():
    ticks = iter([10.0, 12.5])
    timer = Timer(clock=lambda: next(ticks))

    assert timer.stop() == 2.5
    assert timer.elapsed() == 2.5
