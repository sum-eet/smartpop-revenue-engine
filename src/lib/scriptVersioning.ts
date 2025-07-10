/**
 * Script Versioning and A/B Testing System
 * Manages version rollouts and experiments for popup scripts
 */

export interface ScriptVersion {
  version: string;
  rolloutPercentage: number;
  features: string[];
  deprecated?: boolean;
  releaseDate: string;
  changelog?: string;
  breaking?: boolean;
}

export interface ABTestVariant {
  name: string;
  weight: number;
  config: Record<string, any>;
  description?: string;
}

export interface ABTestExperiment {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  trafficSplit: number; // Percentage of users in experiment
  startDate: string;
  endDate?: string;
  active: boolean;
  metrics: string[];
  targetShops?: string[];
}

export interface VersionConfig {
  currentVersion: string;
  versions: ScriptVersion[];
  experiments: ABTestExperiment[];
  circuitBreaker: {
    enabled: boolean;
    errorThreshold: number;
    timeWindow: number;
  };
}

/**
 * Version Manager for script delivery
 */
export class ScriptVersionManager {
  private config: VersionConfig;
  private errorCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(config: VersionConfig) {
    this.config = config;
  }

  /**
   * Determine which version and variant to serve to a shop
   */
  public getVersionForShop(shop: string, requestedVersion?: string): {
    version: string;
    variant: string;
    experiment?: string;
  } {
    // If specific version requested and available
    if (requestedVersion && requestedVersion !== 'latest') {
      const version = this.config.versions.find(v => v.version === requestedVersion);
      if (version && !version.deprecated) {
        return {
          version: requestedVersion,
          variant: 'default'
        };
      }
    }

    // Check circuit breaker for current version
    if (this.isCircuitBreakerOpen(this.config.currentVersion)) {
      console.warn(`Circuit breaker open for version ${this.config.currentVersion}, falling back`);
      const fallbackVersion = this.getFallbackVersion();
      return {
        version: fallbackVersion,
        variant: 'fallback'
      };
    }

    // Check for active experiments
    const experiment = this.getActiveExperiment(shop);
    if (experiment) {
      const variant = this.selectVariant(shop, experiment);
      return {
        version: this.config.currentVersion,
        variant: variant.name,
        experiment: experiment.id
      };
    }

    // Check rollout percentage for current version
    const currentVersion = this.config.versions.find(v => v.version === this.config.currentVersion);
    if (currentVersion && currentVersion.rolloutPercentage < 100) {
      const shopHash = this.hashShop(shop);
      if (shopHash > currentVersion.rolloutPercentage) {
        // Shop not in rollout, use previous stable version
        const stableVersion = this.getStableVersion();
        return {
          version: stableVersion,
          variant: 'stable'
        };
      }
    }

    return {
      version: this.config.currentVersion,
      variant: 'default'
    };
  }

  /**
   * Get active experiment for a shop
   */
  private getActiveExperiment(shop: string): ABTestExperiment | null {
    const activeExperiments = this.config.experiments.filter(exp => 
      exp.active && 
      new Date() >= new Date(exp.startDate) &&
      (!exp.endDate || new Date() <= new Date(exp.endDate)) &&
      (!exp.targetShops || exp.targetShops.includes(shop))
    );

    if (activeExperiments.length === 0) return null;

    // Use first matching experiment (prioritized by order)
    const experiment = activeExperiments[0];
    
    // Check if shop is in experiment traffic
    const shopHash = this.hashShop(shop);
    if (shopHash <= experiment.trafficSplit) {
      return experiment;
    }

    return null;
  }

  /**
   * Select variant within an experiment
   */
  private selectVariant(shop: string, experiment: ABTestExperiment): ABTestVariant {
    const shopHash = this.hashShop(shop + experiment.id); // Include experiment ID in hash
    
    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (shopHash <= cumulativeWeight) {
        return variant;
      }
    }
    
    // Fallback to first variant
    return experiment.variants[0];
  }

  /**
   * Hash shop domain to get consistent percentage (0-100)
   */
  private hashShop(shop: string): number {
    let hash = 0;
    for (let i = 0; i < shop.length; i++) {
      const char = shop.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Record error for circuit breaker
   */
  public recordError(version: string): void {
    const now = Date.now();
    const windowMs = this.config.circuitBreaker.timeWindow;
    const key = version;
    
    const current = this.errorCounts.get(key);
    if (!current || current.resetTime < now) {
      this.errorCounts.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      current.count++;
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(version: string): boolean {
    if (!this.config.circuitBreaker.enabled) return false;
    
    const current = this.errorCounts.get(version);
    if (!current || current.resetTime < Date.now()) return false;
    
    return current.count >= this.config.circuitBreaker.errorThreshold;
  }

  /**
   * Get fallback version when circuit breaker is open
   */
  private getFallbackVersion(): string {
    // Find last stable version before current
    const versions = this.config.versions
      .filter(v => !v.deprecated && v.rolloutPercentage === 100)
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    
    const currentIndex = versions.findIndex(v => v.version === this.config.currentVersion);
    if (currentIndex > 0) {
      return versions[currentIndex + 1].version;
    }
    
    return versions[0]?.version || this.config.currentVersion;
  }

  /**
   * Get stable version for rollout percentage
   */
  private getStableVersion(): string {
    const stableVersions = this.config.versions
      .filter(v => !v.deprecated && v.rolloutPercentage === 100)
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    
    return stableVersions[0]?.version || this.config.currentVersion;
  }

  /**
   * Update version configuration
   */
  public updateConfig(newConfig: VersionConfig): void {
    this.config = newConfig;
  }

  /**
   * Get version statistics
   */
  public getVersionStats(): Record<string, any> {
    return {
      currentVersion: this.config.currentVersion,
      totalVersions: this.config.versions.length,
      activeExperiments: this.config.experiments.filter(e => e.active).length,
      circuitBreakerStatus: this.config.circuitBreaker.enabled,
      errorCounts: Object.fromEntries(this.errorCounts.entries())
    };
  }
}

/**
 * Default version configuration
 */
export const DEFAULT_VERSION_CONFIG: VersionConfig = {
  currentVersion: '3.0.0',
  versions: [
    {
      version: '3.0.0',
      rolloutPercentage: 100,
      features: ['multi-layer-injection', 'health-monitoring', 'security-validation'],
      releaseDate: '2025-01-10T00:00:00Z',
      changelog: 'Enhanced security and multi-layer injection system'
    },
    {
      version: '2.1.0',
      rolloutPercentage: 100,
      features: ['admin-detection', 'multiple-popups', 'validation-consistency'],
      releaseDate: '2024-12-15T00:00:00Z',
      changelog: 'Fixed multiple popup issues and validation consistency'
    },
    {
      version: '2.0.0',
      rolloutPercentage: 100,
      features: ['basic-popup-system'],
      releaseDate: '2024-11-01T00:00:00Z',
      changelog: 'Initial popup system implementation',
      deprecated: true
    }
  ],
  experiments: [
    {
      id: 'checkout-integration-test',
      name: 'Checkout Integration A/B Test',
      description: 'Test new checkout UI extensions vs traditional approach',
      variants: [
        { name: 'control', weight: 50, config: { useCheckoutUI: false }, description: 'Traditional popup system' },
        { name: 'checkout-ui', weight: 50, config: { useCheckoutUI: true }, description: 'New checkout UI extensions' }
      ],
      trafficSplit: 20, // 20% of shops in experiment
      startDate: '2025-01-10T00:00:00Z',
      endDate: '2025-02-10T00:00:00Z',
      active: true,
      metrics: ['conversion_rate', 'script_load_success', 'checkout_completion']
    }
  ],
  circuitBreaker: {
    enabled: true,
    errorThreshold: 10, // 10 errors in time window
    timeWindow: 300000 // 5 minutes
  }
};

/**
 * Global version manager instance
 */
export const globalVersionManager = new ScriptVersionManager(DEFAULT_VERSION_CONFIG);