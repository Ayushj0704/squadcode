-- CreateEnum
CREATE TYPE "SquadMemberRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('codeforces', 'leetcode', 'github');

-- CreateEnum
CREATE TYPE "ThreadPlatform" AS ENUM ('codeforces', 'leetcode');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "invite_code" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_members" (
    "id" TEXT NOT NULL,
    "squad_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "SquadMemberRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "squad_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "username" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_data_cache" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "data" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_data_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contest_threads" (
    "id" TEXT NOT NULL,
    "squad_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "ThreadPlatform" NOT NULL,
    "contest_name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contest_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_posts" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sheets" (
    "id" TEXT NOT NULL,
    "squad_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheet_problems" (
    "id" TEXT NOT NULL,
    "sheet_id" TEXT NOT NULL,
    "problem_name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "problem_url" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "added_by" TEXT NOT NULL,

    CONSTRAINT "sheet_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_completions" (
    "id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "squads_invite_code_key" ON "squads"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "squad_members_squad_id_user_id_key" ON "squad_members"("squad_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_connections_user_id_platform_key" ON "platform_connections"("user_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "platform_data_cache_user_id_platform_key" ON "platform_data_cache"("user_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "problem_completions_problem_id_user_id_key" ON "problem_completions"("problem_id", "user_id");

-- AddForeignKey
ALTER TABLE "squads" ADD CONSTRAINT "squads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_data_cache" ADD CONSTRAINT "platform_data_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_threads" ADD CONSTRAINT "contest_threads_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contest_threads" ADD CONSTRAINT "contest_threads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_posts" ADD CONSTRAINT "thread_posts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "contest_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_posts" ADD CONSTRAINT "thread_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sheets" ADD CONSTRAINT "practice_sheets_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sheets" ADD CONSTRAINT "practice_sheets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_problems" ADD CONSTRAINT "sheet_problems_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "practice_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_problems" ADD CONSTRAINT "sheet_problems_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_completions" ADD CONSTRAINT "problem_completions_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "sheet_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_completions" ADD CONSTRAINT "problem_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
