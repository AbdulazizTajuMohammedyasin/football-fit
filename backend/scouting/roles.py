"""Role profiles: the role-specific metric weights used for scoring.

Each position has its own profiles so that, for example, a centre-back is never
judged on the same metrics as a winger. Weights within a profile sum to 1.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class RoleProfile:
    key: str
    position: str
    name: str
    summary: str
    weights: tuple[tuple[str, float], ...]

    @property
    def total_weight(self) -> float:
        return sum(weight for _, weight in self.weights)


ROLES: tuple[RoleProfile, ...] = (
    RoleProfile(
        "gk-shot-stopper",
        "GK",
        "Shot-stopper",
        "Prevents goals from the shots they face and commands the box.",
        (
            ("goals_prevented_p90", 0.40),
            ("save_pct", 0.30),
            ("crosses_stopped_pct", 0.20),
            ("sweeper_actions_p90", 0.10),
        ),
    ),
    RoleProfile(
        "gk-ball-playing",
        "GK",
        "Ball-playing goalkeeper",
        "Keeps goals out and starts attacks with secure, varied distribution.",
        (
            ("goals_prevented_p90", 0.30),
            ("pass_completion_pct", 0.25),
            ("long_pass_completion_pct", 0.20),
            ("sweeper_actions_p90", 0.15),
            ("save_pct", 0.10),
        ),
    ),
    RoleProfile(
        "cb-stopper",
        "CB",
        "Stopper",
        "Wins duels, defends the box and is hard to get past.",
        (
            ("aerial_duels_won_pct", 0.25),
            ("dribbled_past_p90", 0.20),
            ("tackles_won_p90", 0.15),
            ("interceptions_p90", 0.15),
            ("clearances_p90", 0.15),
            ("blocks_p90", 0.10),
        ),
    ),
    RoleProfile(
        "cb-ball-playing",
        "CB",
        "Ball-playing centre-back",
        "Defends front-foot and progresses play from the back line.",
        (
            ("progressive_passes_p90", 0.25),
            ("pass_completion_pct", 0.20),
            ("long_pass_completion_pct", 0.15),
            ("interceptions_p90", 0.15),
            ("aerial_duels_won_pct", 0.15),
            ("dribbled_past_p90", 0.10),
        ),
    ),
    RoleProfile(
        "fb-attacking",
        "FB",
        "Attacking full-back",
        "Provides width, carries the ball forward and creates chances.",
        (
            ("xa_p90", 0.20),
            ("progressive_carries_p90", 0.20),
            ("crosses_completed_p90", 0.15),
            ("progressive_passes_p90", 0.15),
            ("successful_take_ons_p90", 0.10),
            ("tackles_won_p90", 0.10),
            ("interceptions_p90", 0.10),
        ),
    ),
    RoleProfile(
        "fb-defensive",
        "FB",
        "Defensive full-back",
        "Secure one-v-one defender who keeps possession safely.",
        (
            ("tackles_won_p90", 0.25),
            ("dribbled_past_p90", 0.20),
            ("interceptions_p90", 0.20),
            ("pass_completion_pct", 0.20),
            ("aerial_duels_won_pct", 0.15),
        ),
    ),
    RoleProfile(
        "dm-anchor",
        "DM",
        "Anchor",
        "Screens the defence, regains the ball and recycles it safely.",
        (
            ("ball_recoveries_p90", 0.20),
            ("tackles_won_p90", 0.20),
            ("interceptions_p90", 0.20),
            ("pass_completion_pct", 0.20),
            ("dribbled_past_p90", 0.10),
            ("aerial_duels_won_pct", 0.10),
        ),
    ),
    RoleProfile(
        "dm-deep-playmaker",
        "DM",
        "Deep-lying playmaker",
        "Dictates tempo and breaks lines with passing from deep.",
        (
            ("progressive_passes_p90", 0.30),
            ("pass_completion_pct", 0.20),
            ("long_pass_completion_pct", 0.20),
            ("ball_recoveries_p90", 0.15),
            ("interceptions_p90", 0.15),
        ),
    ),
    RoleProfile(
        "cm-box-to-box",
        "CM",
        "Box-to-box midfielder",
        "Covers ground in both boxes: wins the ball, carries it and arrives to shoot.",
        (
            ("progressive_carries_p90", 0.20),
            ("ball_recoveries_p90", 0.20),
            ("tackles_won_p90", 0.15),
            ("np_xg_p90", 0.15),
            ("progressive_passes_p90", 0.15),
            ("pass_completion_pct", 0.15),
        ),
    ),
    RoleProfile(
        "cm-creator",
        "CM",
        "Creative midfielder",
        "Progresses the ball and creates chances from central areas.",
        (
            ("key_passes_p90", 0.25),
            ("xa_p90", 0.25),
            ("progressive_passes_p90", 0.25),
            ("pass_completion_pct", 0.15),
            ("successful_take_ons_p90", 0.10),
        ),
    ),
    RoleProfile(
        "am-creator",
        "AM",
        "Number 10",
        "Creates and scores between the lines.",
        (
            ("xa_p90", 0.25),
            ("key_passes_p90", 0.25),
            ("np_xg_p90", 0.20),
            ("successful_take_ons_p90", 0.15),
            ("progressive_carries_p90", 0.15),
        ),
    ),
    RoleProfile(
        "w-inside-forward",
        "W",
        "Inside forward",
        "Cuts inside from wide to shoot and score.",
        (
            ("np_xg_p90", 0.25),
            ("successful_take_ons_p90", 0.20),
            ("np_goals_p90", 0.15),
            ("touches_in_box_p90", 0.15),
            ("progressive_carries_p90", 0.15),
            ("shots_p90", 0.10),
        ),
    ),
    RoleProfile(
        "w-creator",
        "W",
        "Creative winger",
        "Beats defenders and supplies chances from wide.",
        (
            ("xa_p90", 0.25),
            ("key_passes_p90", 0.20),
            ("successful_take_ons_p90", 0.20),
            ("progressive_carries_p90", 0.20),
            ("crosses_completed_p90", 0.15),
        ),
    ),
    RoleProfile(
        "st-poacher",
        "ST",
        "Penalty-box striker",
        "Gets into the box and turns chances into goals.",
        (
            ("np_goals_p90", 0.30),
            ("np_xg_p90", 0.30),
            ("touches_in_box_p90", 0.20),
            ("shots_on_target_pct", 0.20),
        ),
    ),
    RoleProfile(
        "st-complete",
        "ST",
        "Complete forward",
        "Scores, links play, wins aerial duels and presses from the front.",
        (
            ("np_xg_p90", 0.20),
            ("np_goals_p90", 0.15),
            ("xa_p90", 0.15),
            ("aerial_duels_won_pct", 0.15),
            ("key_passes_p90", 0.10),
            ("ball_recoveries_p90", 0.15),
            ("successful_take_ons_p90", 0.10),
        ),
    ),
    # Profiles for broad positions, built only from metrics Fantasy Premier League publishes.
    RoleProfile(
        "gk-results",
        "GK",
        "Goalkeeper (results-based)",
        "Saves a high share of shots faced and keeps goals against low. Goals conceded and "
        "clean sheets also reflect the defence in front of the goalkeeper.",
        (
            ("save_share_pct", 0.45),
            ("clean_sheets_p90", 0.30),
            ("goals_conceded_p90", 0.25),
        ),
    ),
    RoleProfile(
        "df-defensive",
        "DF",
        "Defensive defender",
        "Wins the ball back and blocks danger; the team concedes few chances with them on.",
        (
            ("cbi_p90", 0.30),
            ("tackles_p90", 0.25),
            ("ball_recoveries_p90", 0.20),
            ("xgc_p90", 0.25),
        ),
    ),
    RoleProfile(
        "df-attacking",
        "DF",
        "Attacking defender",
        "Contributes chances and goals from defence while still winning the ball.",
        (
            ("xa_p90", 0.35),
            ("xg_p90", 0.20),
            ("assists_p90", 0.15),
            ("ball_recoveries_p90", 0.15),
            ("tackles_p90", 0.15),
        ),
    ),
    RoleProfile(
        "mf-ball-winner",
        "MF",
        "Ball-winning midfielder",
        "Regains possession through tackles, recoveries and interceptions.",
        (
            ("ball_recoveries_p90", 0.35),
            ("tackles_p90", 0.35),
            ("cbi_p90", 0.30),
        ),
    ),
    RoleProfile(
        "mf-creator",
        "MF",
        "Creative midfielder",
        "Creates high-quality chances for team-mates.",
        (
            ("xa_p90", 0.40),
            ("assists_p90", 0.25),
            ("xg_p90", 0.20),
            ("ball_recoveries_p90", 0.15),
        ),
    ),
    RoleProfile(
        "mf-goal-threat",
        "MF",
        "Goal-threat midfielder",
        "Arrives in scoring positions and finishes chances.",
        (
            ("xg_p90", 0.40),
            ("goals_p90", 0.35),
            ("xa_p90", 0.25),
        ),
    ),
    RoleProfile(
        "fw-finisher",
        "FW",
        "Finisher",
        "Gets on the end of chances and scores them.",
        (
            ("xg_p90", 0.50),
            ("goals_p90", 0.35),
            ("assists_p90", 0.15),
        ),
    ),
    RoleProfile(
        "fw-all-round",
        "FW",
        "All-round forward",
        "Scores, creates for others and helps win the ball back.",
        (
            ("xg_p90", 0.30),
            ("xa_p90", 0.30),
            ("assists_p90", 0.15),
            ("ball_recoveries_p90", 0.15),
            ("tackles_p90", 0.10),
        ),
    ),
)

ROLES_BY_KEY: dict[str, RoleProfile] = {role.key: role for role in ROLES}


def roles_for(position: str) -> tuple[RoleProfile, ...]:
    return tuple(role for role in ROLES if role.position == position)
