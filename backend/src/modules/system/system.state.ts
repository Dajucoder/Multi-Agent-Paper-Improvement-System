import { envConfig } from '../../config/env';

let reviewMaxConcurrency = envConfig.REVIEW_MAX_CONCURRENCY;

export function getReviewMaxConcurrency() {
  return reviewMaxConcurrency;
}

export function setReviewMaxConcurrency(value: number) {
  reviewMaxConcurrency = Math.max(1, Math.min(4, Math.floor(value || 1)));
  return reviewMaxConcurrency;
}
