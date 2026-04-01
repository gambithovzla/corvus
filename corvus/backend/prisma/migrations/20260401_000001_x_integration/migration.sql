-- AlterTable
ALTER TABLE "Profile"
ADD COLUMN "xUserId" TEXT,
ADD COLUMN "xUsername" TEXT,
ADD COLUMN "xAccessToken" TEXT,
ADD COLUMN "xRefreshToken" TEXT,
ADD COLUMN "xTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "xConnectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Post"
ADD COLUMN "externalPostId" TEXT,
ADD COLUMN "threadRootId" TEXT,
ADD COLUMN "publishError" TEXT;

-- CreateIndex
CREATE INDEX "Profile_xUsername_idx" ON "Profile"("xUsername");

-- CreateIndex
CREATE INDEX "Post_externalPostId_idx" ON "Post"("externalPostId");
