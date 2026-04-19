-- Add ChannelAccount / ExternalSignal / ContentItem and extend Post for HEXA integration

CREATE TABLE "ChannelAccount" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "market" TEXT NOT NULL DEFAULT 'global',
    "label" TEXT NOT NULL,
    "handle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "publishMode" TEXT NOT NULL DEFAULT 'manual',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "xUserId" TEXT,
    "xUsername" TEXT,
    "xAccessToken" TEXT,
    "xRefreshToken" TEXT,
    "xTokenExpiresAt" TIMESTAMP(3),
    "xConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalSignal" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'hexa',
    "sourceType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "gamePk" INTEGER,
    "language" TEXT,
    "title" TEXT,
    "summary" TEXT,
    "editorialKind" TEXT,
    "editorialScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "dedupeKey" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "primarySignalId" TEXT,
    "sourceSignalIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "language" TEXT,
    "pillar" TEXT,
    "objective" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "approvalMode" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'idea',
    "brief" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Post"
ADD COLUMN "contentItemId" TEXT,
ADD COLUMN "channelAccountId" TEXT,
ADD COLUMN "sourceSignalId" TEXT,
ADD COLUMN "language" TEXT,
ADD COLUMN "pillar" TEXT,
ADD COLUMN "objective" TEXT,
ADD COLUMN "riskLevel" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN "approvalMode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "assetBrief" JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN "ctaType" TEXT,
ADD COLUMN "utmTemplate" TEXT,
ADD COLUMN "experimentKey" TEXT;

CREATE UNIQUE INDEX "ChannelAccount_profileId_platform_language_market_key" ON "ChannelAccount"("profileId", "platform", "language", "market");
CREATE INDEX "ChannelAccount_profileId_idx" ON "ChannelAccount"("profileId");
CREATE INDEX "ChannelAccount_platform_language_idx" ON "ChannelAccount"("platform", "language");
CREATE INDEX "ChannelAccount_xUsername_idx" ON "ChannelAccount"("xUsername");

CREATE UNIQUE INDEX "ExternalSignal_dedupeKey_key" ON "ExternalSignal"("dedupeKey");
CREATE INDEX "ExternalSignal_profileId_idx" ON "ExternalSignal"("profileId");
CREATE INDEX "ExternalSignal_source_sourceType_idx" ON "ExternalSignal"("source", "sourceType");
CREATE INDEX "ExternalSignal_gamePk_idx" ON "ExternalSignal"("gamePk");
CREATE INDEX "ExternalSignal_editorialKind_idx" ON "ExternalSignal"("editorialKind");

CREATE UNIQUE INDEX "ContentItem_primarySignalId_key" ON "ContentItem"("primarySignalId");
CREATE INDEX "ContentItem_profileId_idx" ON "ContentItem"("profileId");
CREATE INDEX "ContentItem_status_idx" ON "ContentItem"("status");

CREATE INDEX "Post_contentItemId_idx" ON "Post"("contentItemId");
CREATE INDEX "Post_channelAccountId_idx" ON "Post"("channelAccountId");
CREATE INDEX "Post_sourceSignalId_idx" ON "Post"("sourceSignalId");

ALTER TABLE "ChannelAccount"
ADD CONSTRAINT "ChannelAccount_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExternalSignal"
ADD CONSTRAINT "ExternalSignal_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContentItem"
ADD CONSTRAINT "ContentItem_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContentItem"
ADD CONSTRAINT "ContentItem_primarySignalId_fkey"
FOREIGN KEY ("primarySignalId") REFERENCES "ExternalSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post"
ADD CONSTRAINT "Post_contentItemId_fkey"
FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post"
ADD CONSTRAINT "Post_channelAccountId_fkey"
FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post"
ADD CONSTRAINT "Post_sourceSignalId_fkey"
FOREIGN KEY ("sourceSignalId") REFERENCES "ExternalSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
