/**
 * AnalyticsAgent - AI Refinery compatible data analysis agent
 *
 * Performs statistical analysis on data in JSON/CSV formats
 * Generates insights and recommendations
 * Implements self-reflection for quality assurance
 */

import * as stats from 'simple-statistics';

export interface AnalyticsAgentConfig {
  agentName: string;
  agentDescription: string;
  selfReflection?: {
    enabled: boolean;
    maxAttempts: number;
  };
  llm?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
}

export interface AnalyticsOptions {
  format?: 'json' | 'csv';
  column?: string;
  analysis?: 'basic' | 'correlation' | 'trend' | 'all';
  includeVisualizationData?: boolean;
  visualization?: 'histogram' | 'scatter' | 'line';
}

export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  mode: number | null;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
}

export interface CorrelationResult {
  coefficient: number;
  strength: string;
  direction: string;
}

export interface TrendResult {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  strength: string;
}

/**
 * AnalyticsAgent following AI Refinery agent interface
 */
export class AnalyticsAgent {
  private config: Required<AnalyticsAgentConfig>;

  constructor(config: AnalyticsAgentConfig) {
    this.config = {
      agentName: config.agentName,
      agentDescription: config.agentDescription,
      selfReflection: config.selfReflection || {
        enabled: false,
        maxAttempts: 1,
      },
      llm: config.llm || 'ollama:phi4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      timeout: config.timeout || 30000,
      analysisDepth: config.analysisDepth || 'detailed',
    };
  }

  /**
   * Get agent configuration
   */
  getConfig(): Required<AnalyticsAgentConfig> {
    return this.config;
  }

  /**
   * Main execution method - AI Refinery interface
   */
  async execute(data: string, context?: AnalyticsOptions): Promise<string> {
    if (!data || data.trim().length === 0) {
      throw new Error('Data cannot be empty');
    }

    try {
      // Parse data based on format
      const parsedData = this.parseData(data, context);

      // Determine analysis type
      const analysisType = context?.analysis || 'basic';

      let result = '';

      if (analysisType === 'correlation') {
        result = this.performCorrelationAnalysis(parsedData);
      } else if (analysisType === 'trend') {
        result = this.performTrendAnalysis(parsedData);
      } else {
        result = this.performBasicAnalysis(parsedData, context);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse input data from JSON or CSV format
   */
  private parseData(data: string, options?: AnalyticsOptions): any {
    const format = options?.format || this.detectFormat(data);

    if (format === 'csv') {
      return this.parseCSV(data, options?.column);
    } else {
      return this.parseJSON(data);
    }
  }

  /**
   * Auto-detect data format
   */
  private detectFormat(data: string): 'json' | 'csv' {
    const trimmed = data.trim();

    // Check if it looks like JSON
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return 'json';
    }

    // Check for CSV patterns (comma-separated values with line breaks)
    if (trimmed.includes('\n') && trimmed.includes(',')) {
      return 'csv';
    }

    // Default to JSON
    return 'json';
  }

  /**
   * Parse JSON data
   */
  private parseJSON(data: string): number[] | { x: number[]; y: number[] } {
    try {
      const parsed = JSON.parse(data);

      // Handle array of numbers
      if (Array.isArray(parsed)) {
        const numbers = parsed
          .filter(val => val !== null && val !== undefined)
          .map(val => {
            const num = Number(val);
            if (isNaN(num)) {
              throw new Error('Data contains non-numeric values');
            }
            return num;
          });

        if (numbers.length === 0) {
          throw new Error('No valid numeric data found');
        }

        return numbers;
      }

      // Handle object with array fields (for correlation)
      if (typeof parsed === 'object' && parsed !== null) {
        // Check for correlation data (x and y arrays)
        if (parsed.x && parsed.y && Array.isArray(parsed.x) && Array.isArray(parsed.y)) {
          const x = parsed.x.map(Number).filter(n => !isNaN(n));
          const y = parsed.y.map(Number).filter(n => !isNaN(n));

          if (x.length !== y.length) {
            throw new Error('Arrays x and y must have the same length for correlation analysis');
          }

          if (x.length === 0) {
            throw new Error('No valid numeric data found');
          }

          return { x, y };
        }

        // Check for object with 'values' field
        if (parsed.values && Array.isArray(parsed.values)) {
          const numbers = parsed.values
            .filter((val: any) => val !== null && val !== undefined)
            .map((val: any) => Number(val))
            .filter((n: number) => !isNaN(n));

          if (numbers.length === 0) {
            throw new Error('No valid numeric data found');
          }

          return numbers;
        }

        // Try to extract first array field
        const arrayFields = Object.values(parsed).filter(val => Array.isArray(val));
        if (arrayFields.length > 0) {
          const numbers = (arrayFields[0] as any[])
            .filter(val => val !== null && val !== undefined)
            .map(val => Number(val))
            .filter(n => !isNaN(n));

          if (numbers.length === 0) {
            throw new Error('No valid numeric data found');
          }

          return numbers;
        }
      }

      throw new Error('Invalid JSON data format');
    } catch (error: any) {
      if (error.message.includes('JSON')) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Parse CSV data
   */
  private parseCSV(data: string, columnName?: string): number[] {
    const lines = data.trim().split('\n');

    if (lines.length === 0) {
      throw new Error('CSV data is empty');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const dataLines = lines.slice(1);

    // Find column index
    let columnIndex = 0;
    if (columnName) {
      columnIndex = header.indexOf(columnName);
      if (columnIndex === -1) {
        throw new Error(`Column "${columnName}" not found in CSV`);
      }
    } else {
      // Find first numeric column
      for (let i = 0; i < header.length; i++) {
        const testValue = dataLines[0]?.split(',')[i];
        if (testValue && !isNaN(Number(testValue))) {
          columnIndex = i;
          break;
        }
      }
    }

    // Extract values
    const values = dataLines
      .map(line => {
        const cells = line.split(',');
        return cells[columnIndex]?.trim();
      })
      .filter(val => val !== undefined && val !== '')
      .map(val => Number(val))
      .filter(n => !isNaN(n));

    if (values.length === 0) {
      throw new Error('No valid numeric data found in CSV');
    }

    return values;
  }

  /**
   * Perform basic statistical analysis
   */
  private performBasicAnalysis(data: number[] | { x: number[]; y: number[] }, options?: AnalyticsOptions): string {
    // Handle correlation data format
    const values = Array.isArray(data) ? data : data.x;

    // Calculate statistics
    const summary = this.calculateStatistics(values);

    // Generate insights
    const insights = this.generateInsights(values, summary);

    // Format result
    let result = 'Statistical Analysis Results\n';
    result += '================================\n\n';

    result += 'Basic Statistics:\n';
    result += `-----------------\n`;
    result += `Count: ${summary.count}\n`;
    result += `Mean: ${summary.mean.toFixed(2)}\n`;
    result += `Median: ${summary.median.toFixed(2)}\n`;
    result += `Mode: ${summary.mode !== null ? summary.mode.toFixed(2) : 'No mode'}\n`;
    result += `Standard Deviation: ${summary.stdDev.toFixed(2)}\n`;
    result += `Variance: ${summary.variance.toFixed(2)}\n`;
    result += `Min: ${summary.min.toFixed(2)}\n`;
    result += `Max: ${summary.max.toFixed(2)}\n`;
    result += `Range: ${summary.range.toFixed(2)}\n`;
    result += `Q1 (25th percentile): ${summary.q1.toFixed(2)}\n`;
    result += `Q3 (75th percentile): ${summary.q3.toFixed(2)}\n`;
    result += `\n`;

    result += insights;

    return result;
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(values: number[]): StatisticalSummary {
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      mean: stats.mean(values),
      median: stats.median(values),
      mode: this.calculateMode(values),
      stdDev: stats.standardDeviation(values),
      variance: stats.variance(values),
      min: stats.min(values),
      max: stats.max(values),
      range: stats.max(values) - stats.min(values),
      q1: stats.quantile(values, 0.25),
      q3: stats.quantile(values, 0.75),
    };
  }

  /**
   * Calculate mode (most frequent value)
   */
  private calculateMode(values: number[]): number | null {
    const frequency = new Map<number, number>();

    values.forEach(val => {
      frequency.set(val, (frequency.get(val) || 0) + 1);
    });

    let maxFreq = 0;
    let mode: number | null = null;

    frequency.forEach((freq, val) => {
      if (freq > maxFreq && freq > 1) {
        maxFreq = freq;
        mode = val;
      }
    });

    return mode;
  }

  /**
   * Perform correlation analysis
   */
  private performCorrelationAnalysis(data: number[] | { x: number[]; y: number[] }): string {
    if (Array.isArray(data)) {
      throw new Error('Correlation analysis requires two arrays (x and y)');
    }

    const { x, y } = data;

    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length for correlation analysis');
    }

    // Calculate correlation coefficient
    const correlation = stats.sampleCorrelation(x, y);

    // Determine strength and direction
    const corResult = this.interpretCorrelation(correlation);

    let result = 'Correlation Analysis Results\n';
    result += '============================\n\n';
    result += `Correlation Coefficient: ${correlation.toFixed(2)}\n`;
    result += `Direction: ${corResult.direction}\n`;
    result += `Strength: ${corResult.strength}\n\n`;

    result += 'Insights:\n';
    result += '---------\n';

    if (Math.abs(correlation) > 0.8) {
      result += `• Very strong ${corResult.direction} relationship detected\n`;
      result += `• Changes in one variable strongly predict changes in the other\n`;
    } else if (Math.abs(correlation) > 0.5) {
      result += `• Moderate ${corResult.direction} relationship detected\n`;
      result += `• There is a noticeable pattern between the variables\n`;
    } else if (Math.abs(correlation) > 0.3) {
      result += `• Weak ${corResult.direction} relationship detected\n`;
      result += `• The variables show some association but it's not strong\n`;
    } else {
      result += `• Little to no linear relationship detected\n`;
      result += `• The variables appear largely independent\n`;
    }

    result += '\nRecommendations:\n';
    result += '----------------\n';

    if (Math.abs(correlation) > 0.7) {
      result += `• Consider using one variable to predict the other\n`;
      result += `• Investigate causal relationships between variables\n`;
    } else if (Math.abs(correlation) > 0.3) {
      result += `• Explore non-linear relationships\n`;
      result += `• Consider additional variables that might influence the relationship\n`;
    } else {
      result += `• Variables may be independent or have a non-linear relationship\n`;
      result += `• Consider other analysis methods beyond linear correlation\n`;
    }

    return result;
  }

  /**
   * Interpret correlation coefficient
   */
  private interpretCorrelation(coefficient: number): CorrelationResult {
    const abs = Math.abs(coefficient);

    let strength: string;
    if (abs > 0.8) strength = 'Very Strong';
    else if (abs > 0.6) strength = 'Strong';
    else if (abs > 0.4) strength = 'Moderate';
    else if (abs > 0.2) strength = 'Weak';
    else strength = 'Very Weak/None';

    const direction = coefficient > 0 ? 'Positive' : coefficient < 0 ? 'Negative' : 'None';

    return { coefficient, strength, direction };
  }

  /**
   * Perform trend analysis
   */
  private performTrendAnalysis(data: number[] | { x: number[]; y: number[] }): string {
    const values = Array.isArray(data) ? data : data.x;

    // Calculate trend using linear regression
    const indices = values.map((_, i) => i);
    const trend = this.calculateTrend(indices, values);

    let result = 'Trend Analysis Results\n';
    result += '======================\n\n';
    result += `Trend Direction: ${trend.direction}\n`;
    result += `Slope: ${trend.slope.toFixed(4)}\n`;
    result += `Trend Strength: ${trend.strength}\n\n`;

    result += 'Insights:\n';
    result += '---------\n';

    if (trend.direction === 'increasing') {
      result += `• Data shows an upward trend\n`;
      result += `• Average increase per data point: ${Math.abs(trend.slope).toFixed(2)}\n`;

      if (Math.abs(trend.slope) > 1) {
        result += `• The increase rate is significant\n`;
      } else {
        result += `• The increase rate is gradual\n`;
      }
    } else if (trend.direction === 'decreasing') {
      result += `• Data shows a downward trend\n`;
      result += `• Average decrease per data point: ${Math.abs(trend.slope).toFixed(2)}\n`;

      if (Math.abs(trend.slope) > 1) {
        result += `• The decrease rate is significant\n`;
      } else {
        result += `• The decrease rate is gradual\n`;
      }
    } else {
      result += `• Data is relatively stable with no clear trend\n`;
      result += `• Values fluctuate around a consistent level\n`;
    }

    result += '\nRecommendations:\n';
    result += '----------------\n';

    if (trend.direction === 'increasing') {
      result += `• Monitor for continued growth\n`;
      result += `• Plan for scaling if trend continues\n`;
      result += `• Investigate factors driving the increase\n`;
    } else if (trend.direction === 'decreasing') {
      result += `• Investigate causes of decline\n`;
      result += `• Consider interventions to reverse the trend\n`;
      result += `• Monitor closely for further decreases\n`;
    } else {
      result += `• Maintain current processes\n`;
      result += `• Look for opportunities for improvement\n`;
      result += `• Continue regular monitoring\n`;
    }

    return result;
  }

  /**
   * Calculate trend using simple linear regression
   */
  private calculateTrend(x: number[], y: number[]): TrendResult {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    // Calculate slope (m = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²))
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine direction
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    // Determine strength
    let strength: string;
    const absSlope = Math.abs(slope);
    if (absSlope < 0.01) strength = 'None';
    else if (absSlope < 0.1) strength = 'Weak';
    else if (absSlope < 1) strength = 'Moderate';
    else strength = 'Strong';

    return { direction, slope, strength };
  }

  /**
   * Generate insights from statistical analysis
   */
  private generateInsights(values: number[], summary: StatisticalSummary): string {
    let insights = 'Insights:\n';
    insights += '---------\n';

    // Variability insight
    const coefficientOfVariation = (summary.stdDev / summary.mean) * 100;

    if (coefficientOfVariation < 10) {
      insights += `• Data is very consistent with low variability (CV: ${coefficientOfVariation.toFixed(1)}%)\n`;
      insights += `• Values cluster tightly around the mean\n`;
    } else if (coefficientOfVariation < 30) {
      insights += `• Data shows moderate variability (CV: ${coefficientOfVariation.toFixed(1)}%)\n`;
      insights += `• Most values are reasonably close to the mean\n`;
    } else {
      insights += `• Data shows high variability (CV: ${coefficientOfVariation.toFixed(1)}%)\n`;
      insights += `• Values are spread out with significant variation\n`;
    }

    // Outlier detection using IQR method
    const iqr = summary.q3 - summary.q1;
    const lowerBound = summary.q1 - 1.5 * iqr;
    const upperBound = summary.q3 + 1.5 * iqr;
    const outliers = values.filter(v => v < lowerBound || v > upperBound);

    if (outliers.length > 0) {
      insights += `• Detected ${outliers.length} potential outlier(s)\n`;
      insights += `• Outlier values: ${outliers.slice(0, 5).map(v => v.toFixed(2)).join(', ')}${outliers.length > 5 ? '...' : ''}\n`;
    } else {
      insights += `• No significant outliers detected\n`;
    }

    // Distribution insight
    const skewness = this.calculateSkewness(values, summary.mean, summary.stdDev);

    if (Math.abs(skewness) < 0.5) {
      insights += `• Distribution appears relatively symmetric\n`;
    } else if (skewness > 0.5) {
      insights += `• Distribution is right-skewed (longer tail on the right)\n`;
      insights += `• Mean is pulled higher by large values\n`;
    } else {
      insights += `• Distribution is left-skewed (longer tail on the left)\n`;
      insights += `• Mean is pulled lower by small values\n`;
    }

    insights += '\nRecommendations:\n';
    insights += '----------------\n';

    if (outliers.length > 0) {
      insights += `• Investigate outliers to determine if they're errors or genuine extreme values\n`;
      insights += `• Consider removing outliers if they represent data quality issues\n`;
    }

    if (coefficientOfVariation > 30) {
      insights += `• High variability suggests need for deeper investigation\n`;
      insights += `• Consider segmenting data to find more consistent subgroups\n`;
    } else if (coefficientOfVariation < 10) {
      insights += `• Low variability indicates stable, predictable process\n`;
      insights += `• Current controls appear effective\n`;
    }

    if (summary.count < 30) {
      insights += `• Sample size is relatively small (n=${summary.count})\n`;
      insights += `• Consider collecting more data for stronger conclusions\n`;
    }

    return insights;
  }

  /**
   * Calculate skewness
   */
  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const cubedDeviations = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0);

    return cubedDeviations / n;
  }

  /**
   * Self-reflection - validate and potentially improve results
   * AI Refinery interface
   */
  async selfReflect(query: string, result: string): Promise<string> {
    if (!this.config.selfReflection.enabled) {
      return result;
    }

    try {
      return await this.performReflection(query, result);
    } catch (error: any) {
      console.warn(`Self-reflection failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Perform self-reflection on analysis results
   */
  private async performReflection(query: string, result: string): Promise<string> {
    const qualityIssues: string[] = [];

    // Check if result is too short
    if (result.length < 100) {
      qualityIssues.push('Analysis may be incomplete');
    }

    // Check if result contains key statistical measures
    const requiredMetrics = ['Mean', 'Median', 'Standard Deviation'];
    const missingMetrics = requiredMetrics.filter(metric => !result.includes(metric));

    if (missingMetrics.length > 0) {
      qualityIssues.push(`Missing metrics: ${missingMetrics.join(', ')}`);
    }

    // Check if insights are provided
    if (!result.includes('Insights')) {
      qualityIssues.push('No insights provided');
    }

    // Check if recommendations are provided
    if (!result.includes('Recommendations')) {
      qualityIssues.push('No recommendations provided');
    }

    // If quality issues detected, append warning
    if (qualityIssues.length > 0) {
      return result + `\n\n[Self-Reflection Warning: ${qualityIssues.join('; ')}]`;
    }

    // In production, this would use LLM to validate result quality
    return result;
  }
}
