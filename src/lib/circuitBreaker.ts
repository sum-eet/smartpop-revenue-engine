/**
 * Circuit Breaker Pattern Implementation for Script Injection
 * Provides fault tolerance and graceful degradation
 */

export interface CircuitBreakerConfig {
  errorThreshold: number;
  timeWindow: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitMetrics {
  failures: number;
  successes: number;
  timeouts: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  state: CircuitState;
  stateChangeTime: number;
}

/**
 * Circuit Breaker for script injection methods
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private metrics: CircuitMetrics;
  private halfOpenCalls = 0;
  private timers = new Set<number>();

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.metrics = {
      failures: 0,
      successes: 0,
      timeouts: 0,
      state: 'CLOSED',
      stateChangeTime: Date.now()
    };
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.getState() === 'OPEN') {
      if (fallback) {
        console.warn('Circuit breaker OPEN, executing fallback');
        try {
          const result = await fallback();
          return result;
        } catch (fallbackError) {
          throw new Error(`Circuit breaker OPEN and fallback failed: ${fallbackError.message}`);
        }
      } else {
        throw new Error('Circuit breaker OPEN: Service temporarily unavailable');
      }
    }

    if (this.getState() === 'HALF_OPEN' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new Error('Circuit breaker HALF_OPEN: Maximum test calls exceeded');
    }

    try {
      if (this.getState() === 'HALF_OPEN') {
        this.halfOpenCalls++;
      }

      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record successful operation
   */
  private onSuccess(): void {
    this.metrics.successes++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.getState() === 'HALF_OPEN') {
      console.log('Circuit breaker: Half-open test succeeded, transitioning to CLOSED');
      this.transitionTo('CLOSED');
      this.halfOpenCalls = 0;
    }
  }

  /**
   * Record failed operation
   */
  private onFailure(): void {
    this.metrics.failures++;
    this.metrics.lastFailureTime = Date.now();

    if (this.getState() === 'HALF_OPEN') {
      console.log('Circuit breaker: Half-open test failed, transitioning back to OPEN');
      this.transitionTo('OPEN');
      this.halfOpenCalls = 0;
    } else if (this.getState() === 'CLOSED') {
      // Check if we should transition to OPEN
      const recentFailures = this.getRecentFailures();
      if (recentFailures >= this.config.errorThreshold) {
        console.warn(`Circuit breaker: ${recentFailures} failures in window, transitioning to OPEN`);
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Get current circuit state
   */
  private getState(): CircuitState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.metrics.state === 'OPEN') {
      const timeSinceOpen = Date.now() - this.metrics.stateChangeTime;
      if (timeSinceOpen >= this.config.resetTimeout) {
        console.log('Circuit breaker: Reset timeout reached, transitioning to HALF_OPEN');
        this.transitionTo('HALF_OPEN');
      }
    }

    return this.metrics.state;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.metrics.state !== newState) {
      console.log(`Circuit breaker: State transition ${this.metrics.state} -> ${newState}`);
      this.metrics.state = newState;
      this.metrics.stateChangeTime = Date.now();

      if (newState === 'CLOSED') {
        // Reset failure count when closing
        this.metrics.failures = 0;
      }
    }
  }

  /**
   * Get number of recent failures within time window
   */
  private getRecentFailures(): number {
    const windowStart = Date.now() - this.config.timeWindow;
    
    // In a real implementation, you'd track individual failure timestamps
    // For simplicity, we'll use the last failure time
    if (this.metrics.lastFailureTime && this.metrics.lastFailureTime >= windowStart) {
      return this.metrics.failures;
    }
    
    return 0;
  }

  /**
   * Get circuit breaker metrics
   */
  public getMetrics(): CircuitMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset circuit breaker to initial state
   */
  public reset(): void {
    this.metrics = {
      failures: 0,
      successes: 0,
      timeouts: 0,
      state: 'CLOSED',
      stateChangeTime: Date.now()
    };
    this.halfOpenCalls = 0;
    
    // Clear any pending timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Force state change (for testing)
   */
  public forceState(state: CircuitState): void {
    this.transitionTo(state);
  }

  /**
   * Check if circuit is healthy
   */
  public isHealthy(): boolean {
    return this.getState() === 'CLOSED';
  }
}

/**
 * Script Injection Circuit Breaker Manager
 */
export class ScriptInjectionCircuitBreaker {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig = {
    errorThreshold: 5, // 5 failures
    timeWindow: 60000, // 1 minute
    resetTimeout: 30000, // 30 seconds
    halfOpenMaxCalls: 3 // Max 3 test calls in half-open state
  };

  /**
   * Get or create circuit breaker for method
   */
  private getCircuitBreaker(method: string): CircuitBreaker {
    if (!this.circuitBreakers.has(method)) {
      this.circuitBreakers.set(method, new CircuitBreaker(this.defaultConfig));
    }
    return this.circuitBreakers.get(method)!;
  }

  /**
   * Execute script injection with circuit breaker protection
   */
  async executeInjection(
    method: string,
    operation: () => Promise<any>,
    fallback?: () => Promise<any>
  ): Promise<any> {
    const circuitBreaker = this.getCircuitBreaker(method);
    return circuitBreaker.execute(operation, fallback);
  }

  /**
   * Get health status for all injection methods
   */
  public getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [method, circuitBreaker] of this.circuitBreakers) {
      const metrics = circuitBreaker.getMetrics();
      status[method] = {
        state: metrics.state,
        healthy: circuitBreaker.isHealthy(),
        failures: metrics.failures,
        successes: metrics.successes,
        lastFailure: metrics.lastFailureTime ? new Date(metrics.lastFailureTime).toISOString() : null,
        lastSuccess: metrics.lastSuccessTime ? new Date(metrics.lastSuccessTime).toISOString() : null,
        stateChangeTime: new Date(metrics.stateChangeTime).toISOString()
      };
    }
    
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
  }

  /**
   * Reset specific circuit breaker
   */
  public reset(method: string): void {
    const circuitBreaker = this.circuitBreakers.get(method);
    if (circuitBreaker) {
      circuitBreaker.reset();
    }
  }
}

/**
 * Global circuit breaker manager
 */
export const globalCircuitBreaker = new ScriptInjectionCircuitBreaker();

/**
 * Graceful degradation manager
 */
export class GracefulDegradationManager {
  private fallbackQueue: Array<() => Promise<any>> = [];
  private isInDegradedMode = false;
  private degradationStartTime?: number;

  /**
   * Add fallback method to queue
   */
  public addFallback(fallback: () => Promise<any>): void {
    this.fallbackQueue.push(fallback);
  }

  /**
   * Execute fallbacks in sequence until one succeeds
   */
  public async executeFallbacks(): Promise<any> {
    if (!this.isInDegradedMode) {
      this.enterDegradedMode();
    }

    let lastError: Error | null = null;

    for (const fallback of this.fallbackQueue) {
      try {
        console.log('Executing fallback method...');
        const result = await fallback();
        console.log('Fallback method succeeded');
        return result;
      } catch (error) {
        console.warn('Fallback method failed:', error.message);
        lastError = error;
      }
    }

    throw new Error(`All fallback methods failed. Last error: ${lastError?.message}`);
  }

  /**
   * Enter degraded mode
   */
  private enterDegradedMode(): void {
    if (!this.isInDegradedMode) {
      console.warn('Entering degraded mode - using fallback methods');
      this.isInDegradedMode = true;
      this.degradationStartTime = Date.now();
    }
  }

  /**
   * Exit degraded mode
   */
  public exitDegradedMode(): void {
    if (this.isInDegradedMode) {
      const duration = Date.now() - (this.degradationStartTime || 0);
      console.log(`Exiting degraded mode - duration: ${duration}ms`);
      this.isInDegradedMode = false;
      this.degradationStartTime = undefined;
    }
  }

  /**
   * Check if in degraded mode
   */
  public isDegraded(): boolean {
    return this.isInDegradedMode;
  }

  /**
   * Get degradation status
   */
  public getStatus(): {
    isDegraded: boolean;
    duration?: number;
    fallbackCount: number;
  } {
    return {
      isDegraded: this.isInDegradedMode,
      duration: this.degradationStartTime ? Date.now() - this.degradationStartTime : undefined,
      fallbackCount: this.fallbackQueue.length
    };
  }
}

/**
 * Global degradation manager
 */
export const globalDegradationManager = new GracefulDegradationManager();