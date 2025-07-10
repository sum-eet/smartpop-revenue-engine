/**
 * Statistical Engine for A/B Testing and ROI Analysis
 * Provides proper statistical significance testing and confidence intervals
 */

export interface ABTestResult {
  testId: string;
  control: TestVariant;
  treatment: TestVariant;
  conversionLift: number;
  confidenceInterval: [number, number];
  confidenceLevel: number;
  pValue: number;
  isStatisticallySignificant: boolean;
  sampleSize: {
    current: number;
    required: number;
    progress: number;
  };
  recommendation: 'continue' | 'declare_winner' | 'stop_test' | 'insufficient_data';
  metadata: {
    testStartDate: string;
    testDuration: number;
    lastUpdated: string;
  };
}

export interface TestVariant {
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerVisitor: number;
  standardError: number;
}

export interface StatisticalTest {
  metric: 'conversion_rate' | 'revenue_per_visitor' | 'average_order_value';
  alpha: number; // Significance level (typically 0.05)
  power: number; // Statistical power (typically 0.8)
  minimumDetectableEffect: number; // MDE as percentage
  twoTailed: boolean;
}

export interface CohortAnalysis {
  cohortType: 'first_visit' | 'device_type' | 'traffic_source' | 'geographic' | 'time_based';
  cohorts: Cohort[];
  summary: {
    totalVisitors: number;
    totalConversions: number;
    totalRevenue: number;
    avgConversionRate: number;
    bestPerformingCohort: string;
    worstPerformingCohort: string;
  };
}

export interface Cohort {
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerVisitor: number;
  confidenceInterval: [number, number];
  sampleSize: number;
  isSignificant: boolean;
}

/**
 * Statistical Engine for A/B Testing
 */
export class StatisticalEngine {
  private readonly Z_SCORES = {
    90: 1.645,
    95: 1.96,
    99: 2.576
  };

  /**
   * Calculate statistical significance for A/B test
   */
  public calculateABTestResults(
    controlData: { visitors: number; conversions: number; revenue: number },
    treatmentData: { visitors: number; conversions: number; revenue: number },
    test: StatisticalTest
  ): ABTestResult {
    const control = this.calculateVariantMetrics('control', controlData);
    const treatment = this.calculateVariantMetrics('treatment', treatmentData);

    // Calculate conversion rate difference
    const conversionLift = ((treatment.conversionRate - control.conversionRate) / control.conversionRate) * 100;

    // Calculate pooled standard error for conversion rate
    const pooledRate = (control.conversions + treatment.conversions) / (control.visitors + treatment.visitors);
    const pooledSE = Math.sqrt(pooledRate * (1 - pooledRate) * (1/control.visitors + 1/treatment.visitors));

    // Calculate z-score and p-value
    const zScore = (treatment.conversionRate - control.conversionRate) / pooledSE;
    const pValue = this.calculatePValue(zScore, test.twoTailed);

    // Calculate confidence interval for the difference
    const zCritical = this.Z_SCORES[95]; // 95% confidence
    const marginOfError = zCritical * pooledSE;
    const difference = treatment.conversionRate - control.conversionRate;
    const confidenceInterval: [number, number] = [
      ((difference - marginOfError) / control.conversionRate) * 100,
      ((difference + marginOfError) / control.conversionRate) * 100
    ];

    // Calculate required sample size
    const requiredSampleSize = this.calculateRequiredSampleSize(
      control.conversionRate,
      test.minimumDetectableEffect,
      test.alpha,
      test.power
    );

    const currentSampleSize = control.visitors + treatment.visitors;
    const isStatisticallySignificant = pValue < test.alpha;

    const result: ABTestResult = {
      testId: `test_${Date.now()}`,
      control,
      treatment,
      conversionLift,
      confidenceInterval,
      confidenceLevel: 95,
      pValue,
      isStatisticallySignificant,
      sampleSize: {
        current: currentSampleSize,
        required: requiredSampleSize * 2, // For both variants
        progress: (currentSampleSize / (requiredSampleSize * 2)) * 100
      },
      recommendation: this.getTestRecommendation(
        isStatisticallySignificant,
        currentSampleSize,
        requiredSampleSize * 2,
        conversionLift,
        test.minimumDetectableEffect
      ),
      metadata: {
        testStartDate: new Date().toISOString(),
        testDuration: 0,
        lastUpdated: new Date().toISOString()
      }
    };

    return result;
  }

  /**
   * Calculate variant metrics
   */
  private calculateVariantMetrics(name: string, data: { visitors: number; conversions: number; revenue: number }): TestVariant {
    const conversionRate = data.visitors > 0 ? data.conversions / data.visitors : 0;
    const revenuePerVisitor = data.visitors > 0 ? data.revenue / data.visitors : 0;
    
    // Calculate standard error for conversion rate
    const standardError = data.visitors > 0 ? 
      Math.sqrt((conversionRate * (1 - conversionRate)) / data.visitors) : 0;

    return {
      name,
      visitors: data.visitors,
      conversions: data.conversions,
      conversionRate,
      revenue: data.revenue,
      revenuePerVisitor,
      standardError
    };
  }

  /**
   * Calculate p-value from z-score
   */
  private calculatePValue(zScore: number, twoTailed: boolean): number {
    // This is a simplified calculation
    // In production, you'd use a more precise statistical library
    const absZ = Math.abs(zScore);
    
    // Approximate p-value calculation using complementary error function
    let pValue = 0.5 * Math.exp(-0.717 * absZ - 0.416 * absZ * absZ);
    
    if (twoTailed) {
      pValue *= 2;
    }
    
    return Math.min(Math.max(pValue, 0.0001), 0.9999); // Clamp between 0.01% and 99.99%
  }

  /**
   * Calculate required sample size for test
   */
  public calculateRequiredSampleSize(
    baselineConversionRate: number,
    minimumDetectableEffect: number, // as percentage
    alpha: number = 0.05,
    power: number = 0.8
  ): number {
    const zAlpha = this.Z_SCORES[95]; // For alpha = 0.05
    const zBeta = 0.842; // For power = 0.8

    const p1 = baselineConversionRate;
    const p2 = p1 * (1 + minimumDetectableEffect / 100);
    
    const pooledP = (p1 + p2) / 2;
    const pooledQ = 1 - pooledP;
    
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * pooledQ) + 
                              zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    const denominator = Math.pow(p2 - p1, 2);
    
    return Math.ceil(numerator / denominator);
  }

  /**
   * Get test recommendation based on results
   */
  private getTestRecommendation(
    isSignificant: boolean,
    currentSampleSize: number,
    requiredSampleSize: number,
    conversionLift: number,
    minimumDetectableEffect: number
  ): ABTestResult['recommendation'] {
    if (currentSampleSize < requiredSampleSize * 0.3) {
      return 'insufficient_data';
    }

    if (isSignificant) {
      if (Math.abs(conversionLift) >= minimumDetectableEffect) {
        return 'declare_winner';
      } else {
        return 'continue';
      }
    }

    if (currentSampleSize >= requiredSampleSize) {
      return 'stop_test'; // No significant difference found with adequate sample size
    }

    return 'continue';
  }

  /**
   * Calculate conversion lift with confidence interval
   */
  public calculateConversionLift(
    controlRate: number,
    treatmentRate: number,
    controlSampleSize: number,
    treatmentSampleSize: number,
    confidenceLevel: number = 95
  ): { lift: number; confidenceInterval: [number, number]; isSignificant: boolean } {
    const lift = ((treatmentRate - controlRate) / controlRate) * 100;
    
    // Calculate standard error for the difference
    const controlSE = Math.sqrt((controlRate * (1 - controlRate)) / controlSampleSize);
    const treatmentSE = Math.sqrt((treatmentRate * (1 - treatmentRate)) / treatmentSampleSize);
    const diffSE = Math.sqrt(controlSE * controlSE + treatmentSE * treatmentSE);
    
    // Calculate confidence interval
    const zCritical = this.Z_SCORES[confidenceLevel as keyof typeof this.Z_SCORES];
    const marginOfError = zCritical * diffSE;
    const difference = treatmentRate - controlRate;
    
    const lowerBound = ((difference - marginOfError) / controlRate) * 100;
    const upperBound = ((difference + marginOfError) / controlRate) * 100;
    
    const isSignificant = (lowerBound > 0 && upperBound > 0) || (lowerBound < 0 && upperBound < 0);
    
    return {
      lift,
      confidenceInterval: [lowerBound, upperBound],
      isSignificant
    };
  }
}

/**
 * Cohort Analysis Engine
 */
export class CohortAnalysisEngine {
  private statisticalEngine: StatisticalEngine;

  constructor() {
    this.statisticalEngine = new StatisticalEngine();
  }

  /**
   * Analyze cohorts based on type
   */
  public analyzeCohorts(
    data: Array<{
      cohortValue: string;
      visitors: number;
      conversions: number;
      revenue: number;
    }>,
    cohortType: CohortAnalysis['cohortType']
  ): CohortAnalysis {
    const cohorts: Cohort[] = data.map(item => {
      const conversionRate = item.visitors > 0 ? item.conversions / item.visitors : 0;
      const revenuePerVisitor = item.visitors > 0 ? item.revenue / item.visitors : 0;
      
      // Calculate confidence interval for conversion rate
      const se = item.visitors > 0 ? 
        Math.sqrt((conversionRate * (1 - conversionRate)) / item.visitors) : 0;
      const marginOfError = 1.96 * se; // 95% confidence
      
      const confidenceInterval: [number, number] = [
        Math.max(0, (conversionRate - marginOfError) * 100),
        Math.min(100, (conversionRate + marginOfError) * 100)
      ];

      // Determine if sample size is sufficient for significance
      const isSignificant = item.visitors >= 30 && item.conversions >= 5; // Basic heuristic

      return {
        name: item.cohortValue,
        visitors: item.visitors,
        conversions: item.conversions,
        conversionRate: conversionRate * 100,
        revenue: item.revenue,
        revenuePerVisitor,
        confidenceInterval,
        sampleSize: item.visitors,
        isSignificant
      };
    });

    // Calculate summary statistics
    const totalVisitors = cohorts.reduce((sum, cohort) => sum + cohort.visitors, 0);
    const totalConversions = cohorts.reduce((sum, cohort) => sum + cohort.conversions, 0);
    const totalRevenue = cohorts.reduce((sum, cohort) => sum + cohort.revenue, 0);
    const avgConversionRate = totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0;

    // Find best and worst performing cohorts (by conversion rate, minimum sample size)
    const significantCohorts = cohorts.filter(c => c.isSignificant);
    const bestPerforming = significantCohorts.length > 0 ? 
      significantCohorts.reduce((best, current) => 
        current.conversionRate > best.conversionRate ? current : best
      ).name : 'N/A';
    
    const worstPerforming = significantCohorts.length > 0 ? 
      significantCohorts.reduce((worst, current) => 
        current.conversionRate < worst.conversionRate ? current : worst
      ).name : 'N/A';

    return {
      cohortType,
      cohorts,
      summary: {
        totalVisitors,
        totalConversions,
        totalRevenue,
        avgConversionRate,
        bestPerformingCohort: bestPerforming,
        worstPerformingCohort: worstPerforming
      }
    };
  }

  /**
   * Compare two cohorts statistically
   */
  public compareCohorts(cohort1: Cohort, cohort2: Cohort): {
    significantDifference: boolean;
    conversionLiftPercent: number;
    confidenceInterval: [number, number];
    pValue: number;
  } {
    const rate1 = cohort1.conversionRate / 100;
    const rate2 = cohort2.conversionRate / 100;
    
    const result = this.statisticalEngine.calculateConversionLift(
      rate1,
      rate2,
      cohort1.visitors,
      cohort2.visitors
    );

    // Calculate p-value (simplified)
    const pooledRate = (cohort1.conversions + cohort2.conversions) / (cohort1.visitors + cohort2.visitors);
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/cohort1.visitors + 1/cohort2.visitors));
    const zScore = Math.abs(rate2 - rate1) / se;
    const pValue = 2 * (1 - this.normalCDF(zScore)); // Two-tailed test

    return {
      significantDifference: result.isSignificant,
      conversionLiftPercent: result.lift,
      confidenceInterval: result.confidenceInterval,
      pValue
    };
  }

  /**
   * Normal cumulative distribution function (approximation)
   */
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }
}

/**
 * ROI Calculator
 */
export class ROICalculator {
  /**
   * Calculate popup ROI
   */
  public calculatePopupROI(data: {
    totalRevenue: number;
    totalCost: number;
    totalVisitors: number;
    totalConversions: number;
    attributedRevenue: number;
    baselineConversionRate: number;
  }): {
    roi: number;
    roas: number; // Return on Ad Spend
    incrementalRevenue: number;
    incrementalConversions: number;
    costPerConversion: number;
    revenuePerVisitor: number;
    liftOverBaseline: number;
  } {
    const roi = data.totalCost > 0 ? ((data.attributedRevenue - data.totalCost) / data.totalCost) * 100 : 0;
    const roas = data.totalCost > 0 ? data.attributedRevenue / data.totalCost : 0;
    
    const baselineRevenue = data.totalVisitors * data.baselineConversionRate * (data.attributedRevenue / data.totalConversions);
    const incrementalRevenue = data.attributedRevenue - baselineRevenue;
    
    const baselineConversions = data.totalVisitors * data.baselineConversionRate;
    const incrementalConversions = data.totalConversions - baselineConversions;
    
    const costPerConversion = data.totalConversions > 0 ? data.totalCost / data.totalConversions : 0;
    const revenuePerVisitor = data.totalVisitors > 0 ? data.attributedRevenue / data.totalVisitors : 0;
    
    const actualConversionRate = data.totalVisitors > 0 ? data.totalConversions / data.totalVisitors : 0;
    const liftOverBaseline = data.baselineConversionRate > 0 ? 
      ((actualConversionRate - data.baselineConversionRate) / data.baselineConversionRate) * 100 : 0;

    return {
      roi,
      roas,
      incrementalRevenue,
      incrementalConversions,
      costPerConversion,
      revenuePerVisitor,
      liftOverBaseline
    };
  }

  /**
   * Calculate customer lifetime value impact
   */
  public calculateCLVImpact(data: {
    newCustomers: number;
    averageOrderValue: number;
    averagePurchaseFrequency: number;
    averageCustomerLifespanMonths: number;
    churnRate: number;
  }): {
    totalCLV: number;
    averageCLV: number;
    projectedLifetimeRevenue: number;
  } {
    const averageCLV = (data.averageOrderValue * data.averagePurchaseFrequency * data.averageCustomerLifespanMonths) / (1 + data.churnRate);
    const totalCLV = data.newCustomers * averageCLV;
    const projectedLifetimeRevenue = totalCLV;

    return {
      totalCLV,
      averageCLV,
      projectedLifetimeRevenue
    };
  }
}

/**
 * Global instances
 */
export const globalStatisticalEngine = new StatisticalEngine();
export const globalCohortEngine = new CohortAnalysisEngine();
export const globalROICalculator = new ROICalculator();