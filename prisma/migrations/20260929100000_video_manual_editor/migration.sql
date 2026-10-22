ALTER TABLE "VideoProject" ADD COLUMN     "manualEdit" JSONB,
ADD COLUMN     "sourceDurationSec" DOUBLE PRECISION,
ADD COLUMN     "sourceProxyUrl" TEXT,
ADD COLUMN     "sourceTranscript" JSONB,
ADD COLUMN     "sourceWaveform" JSONB;

