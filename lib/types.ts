export interface ConfidenceBand {
  low: number;
  high: number;
}

export interface AnalysisResult {
  visualLoad: number;
  auditoryEngagement: number;
  linguisticImpact: number;
  overallCognitiveLoad: number;
  summary: string;
  processingTimeSeconds: number;
  // v0.2 additions
  confidence?: {
    visualLoad: ConfidenceBand;
    auditoryEngagement: ConfidenceBand;
    linguisticImpact: ConfidenceBand;
    overallCognitiveLoad: ConfidenceBand;
  };
  verdict?: string;
  audience?: string;
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
  | { phase: 'analyzing'; stage: JobStage; jobId: string }
  | { phase: 'results'; data: AnalysisResult }
  | { phase: 'error'; message: string };

export const AUDIENCES = [
  { id: 'all',    label: 'All Adults 18–54' },
  { id: 'young',  label: 'Young Adults 18–34' },
  { id: 'women',  label: 'Women 25–54' },
  { id: 'men',    label: 'Men 25–54' },
  { id: 'older',  label: 'Older Adults 45+' },
] as const;

export type AudienceId = typeof AUDIENCES[number]['id'];
