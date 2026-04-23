export interface AnalysisResult {
  visualLoad: number;
  auditoryEngagement: number;
  linguisticImpact: number;
  overallCognitiveLoad: number;
  summary: string;
  processingTimeSeconds: number;
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
