/** Active play time only: the scene stops advancing this clock while paused or hidden. */
export type AccidentPhase = 'clear' | 'happening' | 'waiting' | 'cleaning';
export class HomeLifeEngine {
  elapsed = 0;
  phase: AccidentPhase = 'clear';
  private eligibleAt = 30000;
  private nextAt: number;
  constructor(private random: () => number = Math.random) {
    this.nextAt = 65000 + this.random() * 30000;
  }
  advance(delta: number) {
    this.elapsed += Math.max(0, delta);
  }
  get due() {
    return this.phase === 'clear' && this.elapsed >= this.nextAt;
  }
  afterMeal() {
    if (this.phase === 'clear')
      this.nextAt = Math.min(
        this.nextAt,
        Math.max(this.eligibleAt, this.elapsed + 20000 + this.random() * 15000),
      );
  }
  begin() {
    if (!this.due) return false;
    this.phase = 'happening';
    return true;
  }
  interrupt() {
    if (this.phase !== 'happening') return;
    this.phase = 'clear';
    this.nextAt = this.elapsed + 5000;
  }
  appear() {
    if (this.phase === 'happening') this.phase = 'waiting';
  }
  callMom() {
    if (this.phase !== 'waiting') return false;
    this.phase = 'cleaning';
    return true;
  }
  cleaned() {
    if (this.phase !== 'cleaning') return;
    this.phase = 'clear';
    this.eligibleAt = this.elapsed + 90000;
    this.nextAt = this.eligibleAt + this.random() * 60000;
  }
}
