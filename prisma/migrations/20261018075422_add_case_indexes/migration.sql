-- CreateIndex
CREATE INDEX `cases_careManagerId_status_idx` ON `cases`(`careManagerId`, `status`);

-- CreateIndex
CREATE INDEX `cases_createdAt_idx` ON `cases`(`createdAt`);
