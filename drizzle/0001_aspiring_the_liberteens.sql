CREATE TABLE `certifications` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`user_id` text(255) NOT NULL REFERENCES `user`(`id`),
	`type` text(30) NOT NULL,
	`title` text(255) NOT NULL,
	`issuer` text(255),
	`issued_at` text(20),
	`file_url` text(500) NOT NULL,
	`status` text(20) DEFAULT 'pending' NOT NULL,
	`review_note` text,
	`reviewed_by` text(255) REFERENCES `user`(`id`),
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
CREATE INDEX `certifications_user_id_idx` ON `certifications` (`user_id`);
CREATE INDEX `certifications_status_idx` ON `certifications` (`status`);
