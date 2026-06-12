CREATE INDEX IF NOT EXISTS "practice_sheets_squad_id_idx" ON "practice_sheets"("squad_id");
CREATE INDEX IF NOT EXISTS "sheet_problems_sheet_id_idx" ON "sheet_problems"("sheet_id");
CREATE INDEX IF NOT EXISTS "problem_completions_problem_id_idx" ON "problem_completions"("problem_id");
CREATE INDEX IF NOT EXISTS "contest_threads_squad_id_idx" ON "contest_threads"("squad_id");
CREATE INDEX IF NOT EXISTS "thread_posts_thread_id_idx" ON "thread_posts"("thread_id");
CREATE INDEX IF NOT EXISTS "squad_members_squad_id_idx" ON "squad_members"("squad_id");
