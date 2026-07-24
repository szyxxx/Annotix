import { logger } from "../../../shared/lib/logger";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job<T = any> {
  id: string;
  name: string;
  payload: T;
  status: JobStatus;
  progress: number;
  error?: string;
  createdAt: number;
}

export type JobHandler<T = any> = (job: Job<T>, updateProgress: (p: number) => void) => Promise<void>;

export class JobQueue {
  private jobs = new Map<string, Job>();
  private handlers = new Map<string, JobHandler>();

  registerWorker<T>(jobName: string, handler: JobHandler<T>) {
    this.handlers.set(jobName, handler);
  }

  async enqueue<T>(jobName: string, payload: T): Promise<string> {
    const jobId = crypto.randomUUID();
    const job: Job<T> = {
      id: jobId,
      name: jobName,
      payload,
      status: "pending",
      progress: 0,
      createdAt: Date.now()
    };
    
    this.jobs.set(jobId, job);
    logger.info(`Enqueued background job [${jobName}] with ID: ${jobId}`);
    
    // Asynchronously process the queue (simplified)
    this.processJob(job);
    
    return jobId;
  }

  private async processJob(job: Job) {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      job.status = "failed";
      job.error = `No worker registered for job type: ${job.name}`;
      return;
    }

    job.status = "running";
    try {
      await handler(job, (progress) => {
        job.progress = progress;
        // Could emit event here to update UI
      });
      job.status = "completed";
      job.progress = 100;
      logger.info(`Job [${job.name}] completed successfully.`);
    } catch (err: any) {
      job.status = "failed";
      job.error = err.message;
      logger.error(`Job [${job.name}] failed: ${err.message}`);
    }
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }
}
