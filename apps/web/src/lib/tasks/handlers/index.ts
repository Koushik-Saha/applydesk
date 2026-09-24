// Central registration point for every task handler. Each handler module
// calls registerTaskHandler(...) as a side effect when imported, so every
// type must be imported here — not just from whichever route happens to
// enqueue it. Different API routes are bundled as separate module graphs;
// run-task.ts imports this file so the registry is populated no matter
// which route's request ends up calling runTask() (enqueue, retry, or
// stale recovery).
//
import "./profile-import";
import "./job-analyze";
import "./job-generate";
import "./document-approve";
export {};
