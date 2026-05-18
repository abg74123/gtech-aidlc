/**
 * AP/AR Open Item lifecycle status.
 * Every TX that creates AP or AR starts as OPEN and progresses to CLOSED.
 */
export enum ApArStatus {
  /** Open — full amount outstanding */
  OPEN = 'OPEN',
  /** Partial — partially paid/received */
  PARTIAL = 'PARTIAL',
  /** Closed — fully settled */
  CLOSED = 'CLOSED',
}
