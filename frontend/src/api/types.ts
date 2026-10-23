// Types mirroring the Django API responses. Nullable fields mean "not recorded".

export interface DataSource {
  slug: string
  name: string
  is_demo: boolean
  licence: string
  url: string
  notes: string
  as_of: string
}

export interface ClubSummary {
  slug: string
  name: string
  short_name: string
  competition: string
  is_demo: boolean
}

export interface ClubListItem extends ClubSummary {
  squad_size: number
  source_name: string
}

export interface LeagueMeta {
  source: DataSource
  competition: string
  season: string | null
  as_of: string
  /** League-relative minute thresholds (lower early in a season). */
  thresholds: { benchmark_min_minutes: number; full_reliability_minutes: number }
  /** Positions present in this league's data. */
  positions: string[]
  /** Role keys this league's metrics can support. */
  available_roles: string[]
}

export interface RoleWeight {
  metric: string
  label: string
  weight: number
}

export interface Role {
  key: string
  position: string
  name: string
  summary: string
  weights: RoleWeight[]
}

export interface MetricDefinition {
  key: string
  label: string
  unit: 'per90' | 'pct'
  higher_is_better: boolean
  description: string
}

export interface PositionDefinition {
  code: string
  label: string
  target_depth: number
}

export interface Meta {
  sources: DataSource[]
  positions: PositionDefinition[]
  metrics: MetricDefinition[]
  roles: Role[]
  scoring: {
    benchmark_min_minutes: number
    benchmark_share_of_max: number
    reliable_coverage: number
    full_reliability_minutes: number
    reliability_share_of_max: number
    fit_weights: Record<string, number>
    need_weights: Record<string, number>
    ageing_threshold: number
  }
}

export interface PlayerSummary {
  slug: string
  name: string
  position: string
  position_label: string
  secondary_positions: string[]
  age: number | null
  nationality: string | null
  preferred_foot: string | null
  club: ClubSummary | null
  minutes: number | null
  appearances: number | null
}

export interface SquadPlayer extends PlayerSummary {
  best_role: { key: string; name: string; score: number; coverage: number } | null
}

export interface ClubDetail extends LeagueMeta {
  club: ClubSummary
  squad: SquadPlayer[]
}

export interface WeightedComponent {
  key: string
  label: string
  weight: number
  value: number | null
}

export interface PositionNeed {
  position: string
  label: string
  score: number | null
  level: 'high' | 'medium' | 'low' | 'unknown'
  components: WeightedComponent[]
  evidence: string[]
  squad_count: number
  cover_count: number
  target_depth: number
  best_score: number | null
  league_rank: number | null
  clubs_ranked: number
  ageing_share: number | null
  roles: { key: string; name: string }[]
}

export interface ClubNeeds extends LeagueMeta {
  club: ClubSummary
  needs: PositionNeed[]
  detail?: string
}

export interface MetricComponent {
  metric: string
  label: string
  weight: number
  value: number | null
  percentile: number | null
  higher_is_better: boolean
  missing: boolean
}

export interface RoleScore {
  role: string
  role_name: string
  score: number | null
  coverage: number
  reliable: boolean
  components: MetricComponent[]
}

export interface FitComponent extends WeightedComponent {
  explanation: string
}

export interface Recommendation {
  player: PlayerSummary
  fit: { score: number | null; components: FitComponent[] }
  role_score: RoleScore
  low_coverage: boolean
  plays_secondary: boolean
}

export interface ShortlistFilters {
  max_age: number | null
  min_age: number | null
  min_minutes: number
  include_low_coverage: boolean
  include_secondary: boolean
  limit: number
}

export interface Shortlist extends LeagueMeta {
  club: ClubSummary
  filters: ShortlistFilters
  role: Role
  incumbent_best: number | null
  considered: number
  excluded_low_coverage: number
  reliable_coverage: number
  results: Recommendation[]
}

export interface PlayerMetric {
  key: string
  label: string
  unit: 'per90' | 'pct'
  higher_is_better: boolean
  value: number | null
  percentile: number | null
  pool_size: number
  missing: boolean
}

export interface PlayerDetail extends Partial<LeagueMeta> {
  player: PlayerSummary
  season: string | null
  data_coverage?: number
  below_benchmark_minutes?: boolean
  metrics: PlayerMetric[]
  role_scores: RoleScore[]
  detail?: string
}

export interface PlayerListItem {
  slug: string
  name: string
  position: string
  age: number | null
  club: ClubSummary | null
  is_demo: boolean
}

export interface CompareEntry {
  player: PlayerSummary
  has_season: boolean
  out_of_position: boolean
  role_score: RoleScore
}

export interface Comparison extends LeagueMeta {
  role: Role
  players: CompareEntry[]
}
