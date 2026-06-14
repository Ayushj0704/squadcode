-- DropIndex
DROP INDEX "contest_threads_squad_id_idx";

-- DropIndex
DROP INDEX "practice_sheets_squad_id_idx";

-- DropIndex
DROP INDEX "problem_completions_problem_id_idx";

-- DropIndex
DROP INDEX "sheet_problems_sheet_id_idx";

-- DropIndex
DROP INDEX "squad_members_squad_id_idx";

-- DropIndex
DROP INDEX "thread_posts_thread_id_idx";

-- AlterTable
ALTER TABLE "squad_members" ADD COLUMN     "nickname" TEXT;
