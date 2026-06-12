-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('problem_solved', 'rating_changed', 'contest_participated');

-- CreateTable
CREATE TABLE "activity_feed" (
    "id" TEXT NOT NULL,
    "squad_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_feed_squad_id_created_at_idx" ON "activity_feed"("squad_id", "created_at");

-- AddForeignKey
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
