"""Deterministic generator for the fictional demo dataset.

Everything produced here is fictional: club names, player names and every
statistic are generated from a fixed random seed so the product can be explored
without a licensed data feed. The data source is flagged `is_demo=True` and the
UI labels it accordingly. Nothing here describes a real club or player.
"""

import random
from dataclasses import dataclass
from datetime import date, timedelta

from django.db import transaction
from django.utils.text import slugify

from .metrics import METRICS_BY_KEY
from .models import Club, DataSource, Player, PlayerSeason

DEMO_SOURCE_SLUG = "demo"
DEMO_SEASON = "2025-26"
DEMO_COMPETITION = "Demo League"
DEMO_AS_OF = date(2026, 5, 31)
DEMO_SEED = 20260531

CLUB_NAMES = (
    "Ashcombe Albion",
    "Brackenford City",
    "Caldermere United",
    "Dunholt Athletic",
    "Elmstead Rovers",
    "Farrowby Town",
    "Greyhaven FC",
    "Hollinsbury Wanderers",
    "Ironvale FC",
    "Kestrel Park",
    "Lanthorn City",
    "Marlowe Athletic",
    "Northwick Forest",
    "Oakhurst United",
    "Pennmoor Rovers",
    "Quarrington Town",
    "Redbarrow FC",
    "Saltmere Albion",
    "Thornecliffe United",
    "Wexley Vale",
)

FIRST_NAMES = (
    "Aaron Adam Alfie Amir Andre Arlo Ben Caleb Callum Dario Declan Eli Elias Emil Ethan "
    "Felix Finn Gabriel Hamza Harvey Isaac Ivan Jack Jamal Jonah Jude Kai Kofi Leo Liam "
    "Luca Malik Marco Mason Mateo Max Milo Nico Noah Oscar Owen Rafael Reece Rory Sami "
    "Sebastian Theo Tobias Tom Victor Yusuf Zach"
).split()

LAST_NAMES = (
    "Abara Ashby Bellamy Blackwood Bramwell Carver Castell Dalgarno Danvers Ekwueme Fairley "
    "Fenwick Garside Hallam Hartigan Holloway Ibarra Jessop Kearsley Kettering Lazenby Lindqvist "
    "Marchetti Merriman Moreau Nakamura Northcott Okafor Ondrej Pellow Quaye Radcliffe Rosen "
    "Salcombe Santamaria Sherwin Stroud Tavares Thackeray Underhill Varga Wainwright Whitlock "
    "Yardley Zamora Ellery Brennan Costa Duval Fitzgerald"
).split()

NATIONALITIES = (
    "England",
    "Scotland",
    "Wales",
    "Ireland",
    "France",
    "Spain",
    "Portugal",
    "Netherlands",
    "Belgium",
    "Germany",
    "Brazil",
    "Argentina",
    "Nigeria",
    "Ghana",
    "Japan",
    "Norway",
)

# (min, max) squad size per position. Ranges create genuine variation between clubs.
SQUAD_SHAPE = {
    "GK": (2, 3),
    "CB": (3, 5),
    "FB": (3, 5),
    "DM": (1, 3),
    "CM": (2, 4),
    "AM": (1, 3),
    "W": (2, 4),
    "ST": (2, 4),
}

SECONDARY_OPTIONS = {
    "GK": [],
    "CB": ["FB", "DM"],
    "FB": ["CB", "W"],
    "DM": ["CM", "CB"],
    "CM": ["DM", "AM"],
    "AM": ["CM", "W"],
    "W": ["AM", "ST", "FB"],
    "ST": ["W", "AM"],
}

GK_METRICS = {
    "save_pct": (70.0, 5.0),
    "goals_prevented_p90": (0.0, 0.12),
    "crosses_stopped_pct": (7.5, 2.5),
    "sweeper_actions_p90": (0.9, 0.45),
    "pass_completion_pct": (74.0, 8.0),
    "long_pass_completion_pct": (42.0, 9.0),
}

# Position-specific (mean, standard deviation) baselines for outfield metrics.
OUTFIELD_BASELINES = {
    "CB": {
        "np_goals_p90": (0.04, 0.03), "np_xg_p90": (0.05, 0.03), "shots_p90": (0.5, 0.25),
        "shots_on_target_pct": (28.0, 10.0), "touches_in_box_p90": (0.9, 0.4),
        "assists_p90": (0.02, 0.02), "xa_p90": (0.03, 0.02), "key_passes_p90": (0.3, 0.15),
        "progressive_passes_p90": (4.5, 1.6), "progressive_carries_p90": (1.0, 0.5),
        "successful_take_ons_p90": (0.2, 0.15), "crosses_completed_p90": (0.02, 0.02),
        "pass_completion_pct": (87.0, 4.0), "long_pass_completion_pct": (58.0, 8.0),
        "dispossessed_p90": (0.2, 0.1), "tackles_won_p90": (1.2, 0.4),
        "interceptions_p90": (1.3, 0.45), "blocks_p90": (1.4, 0.45),
        "clearances_p90": (4.2, 1.4), "ball_recoveries_p90": (4.5, 1.2),
        "aerial_duels_won_pct": (62.0, 8.0), "dribbled_past_p90": (0.5, 0.2),
    },
    "FB": {
        "np_goals_p90": (0.04, 0.03), "np_xg_p90": (0.05, 0.03), "shots_p90": (0.6, 0.3),
        "shots_on_target_pct": (28.0, 10.0), "touches_in_box_p90": (1.5, 0.7),
        "assists_p90": (0.12, 0.07), "xa_p90": (0.11, 0.05), "key_passes_p90": (1.0, 0.4),
        "progressive_passes_p90": (4.8, 1.5), "progressive_carries_p90": (2.3, 0.9),
        "successful_take_ons_p90": (0.7, 0.35), "crosses_completed_p90": (0.6, 0.3),
        "pass_completion_pct": (81.0, 4.5), "long_pass_completion_pct": (48.0, 9.0),
        "dispossessed_p90": (0.6, 0.25), "tackles_won_p90": (1.6, 0.5),
        "interceptions_p90": (1.0, 0.35), "blocks_p90": (1.0, 0.35),
        "clearances_p90": (1.8, 0.7), "ball_recoveries_p90": (5.0, 1.2),
        "aerial_duels_won_pct": (50.0, 9.0), "dribbled_past_p90": (0.8, 0.3),
    },
    "DM": {
        "np_goals_p90": (0.04, 0.03), "np_xg_p90": (0.05, 0.03), "shots_p90": (0.7, 0.3),
        "shots_on_target_pct": (27.0, 10.0), "touches_in_box_p90": (0.8, 0.4),
        "assists_p90": (0.05, 0.04), "xa_p90": (0.06, 0.03), "key_passes_p90": (0.8, 0.35),
        "progressive_passes_p90": (6.0, 1.8), "progressive_carries_p90": (1.4, 0.6),
        "successful_take_ons_p90": (0.5, 0.3), "crosses_completed_p90": (0.05, 0.04),
        "pass_completion_pct": (87.0, 3.5), "long_pass_completion_pct": (60.0, 8.0),
        "dispossessed_p90": (0.5, 0.2), "tackles_won_p90": (1.9, 0.55),
        "interceptions_p90": (1.4, 0.45), "blocks_p90": (1.0, 0.35),
        "clearances_p90": (1.5, 0.6), "ball_recoveries_p90": (6.5, 1.5),
        "aerial_duels_won_pct": (52.0, 9.0), "dribbled_past_p90": (0.8, 0.3),
    },
    "CM": {
        "np_goals_p90": (0.08, 0.05), "np_xg_p90": (0.09, 0.05), "shots_p90": (1.2, 0.5),
        "shots_on_target_pct": (31.0, 10.0), "touches_in_box_p90": (1.8, 0.8),
        "assists_p90": (0.1, 0.06), "xa_p90": (0.11, 0.05), "key_passes_p90": (1.3, 0.5),
        "progressive_passes_p90": (5.5, 1.7), "progressive_carries_p90": (2.0, 0.8),
        "successful_take_ons_p90": (0.9, 0.45), "crosses_completed_p90": (0.15, 0.1),
        "pass_completion_pct": (85.0, 4.0), "long_pass_completion_pct": (56.0, 9.0),
        "dispossessed_p90": (0.8, 0.3), "tackles_won_p90": (1.4, 0.5),
        "interceptions_p90": (0.9, 0.35), "blocks_p90": (0.8, 0.3),
        "clearances_p90": (0.9, 0.4), "ball_recoveries_p90": (5.5, 1.4),
        "aerial_duels_won_pct": (45.0, 10.0), "dribbled_past_p90": (0.9, 0.3),
    },
    "AM": {
        "np_goals_p90": (0.2, 0.09), "np_xg_p90": (0.19, 0.08), "shots_p90": (2.1, 0.7),
        "shots_on_target_pct": (35.0, 9.0), "touches_in_box_p90": (3.6, 1.2),
        "assists_p90": (0.18, 0.08), "xa_p90": (0.2, 0.07), "key_passes_p90": (2.2, 0.7),
        "progressive_passes_p90": (4.5, 1.5), "progressive_carries_p90": (3.0, 1.0),
        "successful_take_ons_p90": (1.6, 0.6), "crosses_completed_p90": (0.25, 0.15),
        "pass_completion_pct": (80.0, 4.5), "long_pass_completion_pct": (45.0, 10.0),
        "dispossessed_p90": (1.4, 0.45), "tackles_won_p90": (0.9, 0.35),
        "interceptions_p90": (0.4, 0.2), "blocks_p90": (0.5, 0.25),
        "clearances_p90": (0.4, 0.25), "ball_recoveries_p90": (4.2, 1.1),
        "aerial_duels_won_pct": (35.0, 10.0), "dribbled_past_p90": (0.9, 0.3),
    },
    "W": {
        "np_goals_p90": (0.24, 0.1), "np_xg_p90": (0.22, 0.09), "shots_p90": (2.3, 0.8),
        "shots_on_target_pct": (35.0, 9.0), "touches_in_box_p90": (4.5, 1.4),
        "assists_p90": (0.17, 0.08), "xa_p90": (0.18, 0.07), "key_passes_p90": (1.8, 0.6),
        "progressive_passes_p90": (3.4, 1.2), "progressive_carries_p90": (4.2, 1.3),
        "successful_take_ons_p90": (2.1, 0.8), "crosses_completed_p90": (0.5, 0.25),
        "pass_completion_pct": (77.0, 5.0), "long_pass_completion_pct": (40.0, 10.0),
        "dispossessed_p90": (1.8, 0.55), "tackles_won_p90": (0.8, 0.3),
        "interceptions_p90": (0.35, 0.18), "blocks_p90": (0.45, 0.2),
        "clearances_p90": (0.35, 0.2), "ball_recoveries_p90": (3.8, 1.0),
        "aerial_duels_won_pct": (33.0, 10.0), "dribbled_past_p90": (0.8, 0.3),
    },
    "ST": {
        "np_goals_p90": (0.38, 0.13), "np_xg_p90": (0.36, 0.11), "shots_p90": (2.8, 0.8),
        "shots_on_target_pct": (40.0, 8.0), "touches_in_box_p90": (5.5, 1.5),
        "assists_p90": (0.1, 0.06), "xa_p90": (0.1, 0.05), "key_passes_p90": (1.1, 0.45),
        "progressive_passes_p90": (1.6, 0.7), "progressive_carries_p90": (1.5, 0.7),
        "successful_take_ons_p90": (0.9, 0.5), "crosses_completed_p90": (0.08, 0.06),
        "pass_completion_pct": (70.0, 6.0), "long_pass_completion_pct": (35.0, 10.0),
        "dispossessed_p90": (1.5, 0.5), "tackles_won_p90": (0.5, 0.25),
        "interceptions_p90": (0.2, 0.12), "blocks_p90": (0.4, 0.2),
        "clearances_p90": (0.8, 0.5), "ball_recoveries_p90": (2.8, 0.9),
        "aerial_duels_won_pct": (42.0, 11.0), "dribbled_past_p90": (0.5, 0.25),
    },
}  # fmt: skip


@dataclass
class DemoSummary:
    clubs: int = 0
    players: int = 0
    seasons: int = 0
    missing_metric_values: int = 0


def _metric_value(rng: random.Random, key: str, mean: float, sd: float, quality: float) -> float:
    metric = METRICS_BY_KEY[key]
    direction = 1 if metric.higher_is_better else -1
    value = mean + sd * (0.65 * quality * direction + 0.75 * rng.gauss(0, 1))
    if metric.unit == "pct":
        value = min(max(value, 0.0), 100.0)
        return round(value, 1)
    if key != "goals_prevented_p90":
        value = max(value, 0.0)
    return round(value, 2)


def _minutes_for_depth(rng: random.Random, depth_rank: int, position: str) -> int:
    if position == "GK":
        ranges = [(2900, 3420), (0, 500), (0, 120)]
    else:
        ranges = [(2300, 3300), (1300, 2400), (500, 1500), (100, 900), (0, 400)]
    low, high = ranges[min(depth_rank, len(ranges) - 1)]
    return rng.randint(low, high)


def _unique_name(rng: random.Random, used: set) -> str:
    while True:
        name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if name not in used:
            used.add(name)
            return name


@transaction.atomic
def build_demo_dataset(seed: int = DEMO_SEED) -> DemoSummary:
    """Replace the demo data source with a freshly generated fictional dataset."""
    DataSource.objects.filter(slug=DEMO_SOURCE_SLUG).delete()
    source = DataSource.objects.create(
        slug=DEMO_SOURCE_SLUG,
        name="Football Fit demo dataset (fictional)",
        is_demo=True,
        licence="Generated by Football Fit for demonstration. Not real football data.",
        notes=(
            "Fictional clubs and players with statistics generated from a fixed random seed "
            f"({seed}). Use it to explore the product; do not cite any figure as real."
        ),
        as_of=DEMO_AS_OF,
    )

    rng = random.Random(seed)
    summary = DemoSummary()
    used_names: set[str] = set()

    for club_name in CLUB_NAMES:
        club = Club.objects.create(
            source=source,
            slug=f"demo-{slugify(club_name)}",
            name=club_name,
            short_name=club_name.split()[0],
            competition=DEMO_COMPETITION,
        )
        summary.clubs += 1

        for position, (low, high) in SQUAD_SHAPE.items():
            count = rng.randint(low, high)
            for depth_rank in range(count):
                summary.players += _create_demo_player(
                    rng, source, club, position, depth_rank, used_names, summary
                )

    return summary


def _create_demo_player(rng, source, club, position, depth_rank, used_names, summary) -> int:
    name = _unique_name(rng, used_names)
    birth_year = rng.randint(1991, 2007)
    date_of_birth = date(birth_year, 1, 1) + timedelta(days=rng.randint(0, 364))
    # A small share of players have no recorded birth date, exercising missing-data paths.
    if rng.random() < 0.02:
        date_of_birth = None

    secondary = [p for p in SECONDARY_OPTIONS[position] if rng.random() < 0.3]
    player = Player.objects.create(
        source=source,
        slug=f"demo-{slugify(name)}",
        name=name,
        club=club,
        date_of_birth=date_of_birth,
        nationality=rng.choice(NATIONALITIES),
        position=position,
        secondary_positions=secondary,
        preferred_foot=rng.choices(["right", "left", "both"], weights=[70, 25, 5])[0],
    )

    minutes = _minutes_for_depth(rng, depth_rank, position)
    # Starters tend to be better than squad players, with plenty of overlap.
    quality = rng.gauss(0.4 if depth_rank == 0 else -0.2, 0.9)
    baselines = GK_METRICS if position == "GK" else OUTFIELD_BASELINES[position]

    metrics: dict[str, float] = {}
    if minutes > 0:
        metrics = {
            key: _metric_value(rng, key, mean, sd, quality) for key, (mean, sd) in baselines.items()
        }
        # Some seasons have gaps in tracking coverage; those metrics stay missing.
        if rng.random() < 0.08:
            for key in rng.sample(sorted(metrics), k=rng.randint(1, 4)):
                del metrics[key]
                summary.missing_metric_values += 1

    PlayerSeason.objects.create(
        player=player,
        club=club,
        season=DEMO_SEASON,
        competition=DEMO_COMPETITION,
        appearances=min(38, round(minutes / 80)) if minutes else 0,
        minutes=minutes,
        metrics=metrics,
    )
    summary.seasons += 1
    return 1
