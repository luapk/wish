export interface ConfidenceBand {
  low: number;
  high: number;
}

export type BrainRegion =
  | 'visual'
  | 'auditory'
  | 'linguistic'
  | 'attention'
  | 'emotion'
  | 'memory'
  | 'executive';

export interface TemporalFrame {
  t: number;
  visual: number;
  auditory: number;
  linguistic: number;
  attention: number;
  emotion: number;
  memory: number;
  executive: number;
}

export interface ContextualMoment {
  t: number;
  dur: number;
  label: string;
  detail: string;
  regions: BrainRegion[];
  intensity: number;
}

export interface AnalysisResult {
  visualLoad: number;
  auditoryEngagement: number;
  linguisticImpact: number;
  overallCognitiveLoad: number;
  summary: string;
  processingTimeSeconds: number;
  verdict?: string;
  audience?: string;
  confidence?: {
    visualLoad: ConfidenceBand;
    auditoryEngagement: ConfidenceBand;
    linguisticImpact: ConfidenceBand;
    overallCognitiveLoad: ConfidenceBand;
  };
  temporalData?: TemporalFrame[];
  moments?: ContextualMoment[];
}

export type JobStage =
  | 'queued'
  | 'downloading'
  | 'extracting_frames'
  | 'running_inference'
  | 'aggregating'
  | 'complete'
  | 'error';

export interface JobStatus {
  status: JobStage;
  data?: AnalysisResult;
  error?: string;
}

export type AppPhase =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'analyzing'; stage: JobStage; jobId: string; videoUrl: string }
  | { phase: 'results'; data: AnalysisResult; videoUrl: string }
  | { phase: 'error'; message: string };

export const AUDIENCES = [
  { id: 'all',   label: 'All Adults 18–54' },
  { id: 'young', label: 'Young Adults 18–34' },
  { id: 'women', label: 'Women 25–54' },
  { id: 'men',   label: 'Men 25–54' },
  { id: 'older', label: 'Older Adults 45+' },
] as const;

export type AudienceId = typeof AUDIENCES[number]['id'];
