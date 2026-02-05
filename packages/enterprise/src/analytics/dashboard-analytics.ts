/**
 * Dashboard Analytics Engine
 *
 * Provides hierarchical insights with actionable recommendations:
 * - Level 1: Executive Summary (high-level health)
 * - Level 2: Operational Insights (capability analysis)
 * - Level 3: Detailed Analysis (individual actions)
 *
 * Enhanced with real-time analytics:
 * - 7-day vs 30-day trend comparison
 * - Hour-by-hour activity heatmap
 * - Real-time health score calculation
 * - Anomaly detection (unusual patterns)
 */

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: {
    type: string;
    params?: any;
  };
  permission: {
    allowed: boolean;
    reason?: string;
  };
  result?: {
    success: boolean;
    error?: string;
  };
}

export interface ExecutiveSummary {
  healthScore: number; // 0-100
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number; // Percentage change
  totalActions: number;
  successRate: number;
  criticalIssues: CriticalIssue[];
  keyMetrics: {
    label: string;
    value: string | number;
    change?: string;
    trendArrow?: '↑' | '↓' | '→';
    trendPercentage?: string;
    status: 'good' | 'warning' | 'critical';
  }[];
  comparisonPeriod: {
    current: {
      start: number;
      end: number;
      totalActions: number;
      denialRate: number;
      successRate: number;
    };
    previous: {
      start: number;
      end: number;
      totalActions: number;
      denialRate: number;
      successRate: number;
    };
  };
  spikeDetection: {
    hasSpike: boolean;
    spikeType?: 'denials' | 'errors' | 'actions';
    severity?: 'warning' | 'critical';
    description?: string;
  };
}

export interface CriticalIssue {
  severity: 'high' | 'medium' | 'low';
  category: 'permission' | 'performance' | 'security' | 'cost';
  title: string;
  description: string;
  impact: string;
  affectedActions: number;
  recommendation: ActionableRecommendation;
}

export interface ActionableRecommendation {
  action: string;
  type: 'grant_permission' | 'update_policy' | 'optimize_workflow' | 'upgrade_system';
  payload: any;
  estimatedImpact: string;
  complexity: 'simple' | 'moderate' | 'complex';
  autoExecutable: boolean;
}

export interface OperationalInsights {
  capabilityAnalysis: {
    capability: string;
    allowed: number;
    denied: number;
    denialRate: number;
    topUsers: string[];
    recommendation?: ActionableRecommendation;
  }[];
  userBehavior: {
    userId: string;
    totalActions: number;
    successRate: number;
    topActions: string[];
    missingCapabilities: string[];
  }[];
  timePatterns: {
    hour: number;
    actions: number;
    denials: number;
  }[];
  performanceMetrics: {
    avgLatency: number;
    p95Latency: number;
    errorRate: number;
  };
  activityHeatmap: {
    hour: number;
    day: string;
    actions: number;
    intensity: 'low' | 'medium' | 'high';
  }[];
  trendComparison: {
    period: '7d' | '30d';
    totalActions: number;
    successRate: number;
    denialRate: number;
    avgActionsPerDay: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  anomalyDetection: {
    detected: boolean;
    type?: 'unusual_spike' | 'unusual_dip' | 'time_anomaly' | 'user_anomaly';
    description?: string;
    severity?: 'info' | 'warning' | 'critical';
    affectedMetric?: string;
  }[];
}

export interface DetailedAnalysis {
  recentActions: AuditEntry[];
  denialsByCapability: Map<string, AuditEntry[]>;
  userTimeline: {
    userId: string;
    actions: AuditEntry[];
  }[];
}

export class DashboardAnalytics {
  /**
   * Level 1: Executive Summary
   * High-level health and critical issues with trend analysis
   */
  generateExecutiveSummary(entries: AuditEntry[]): ExecutiveSummary {
    const totalActions = entries.length;
    const allowedActions = entries.filter(e => e.permission.allowed).length;
    const successRate = totalActions > 0 ? (allowedActions / totalActions) * 100 : 0;

    // Calculate health score (weighted)
    const denialRate = 100 - successRate;
    const errorRate = entries.filter(e => e.result && !e.result.success).length / totalActions * 100;
    const healthScore = Math.max(0, 100 - (denialRate * 0.7) - (errorRate * 0.3));

    // Enhanced trend analysis: Compare current period vs previous period
    // Split entries by time: last 7 days vs previous 7 days
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);

    const currentPeriodEntries = entries.filter(e => e.timestamp >= sevenDaysAgo);
    const previousPeriodEntries = entries.filter(e => e.timestamp >= fourteenDaysAgo && e.timestamp < sevenDaysAgo);

    // Calculate metrics for both periods
    const currentTotal = currentPeriodEntries.length;
    const currentAllowed = currentPeriodEntries.filter(e => e.permission.allowed).length;
    const currentSuccessRate = currentTotal > 0 ? (currentAllowed / currentTotal) * 100 : 0;
    const currentDenialRate = 100 - currentSuccessRate;

    const previousTotal = previousPeriodEntries.length;
    const previousAllowed = previousPeriodEntries.filter(e => e.permission.allowed).length;
    const previousSuccessRate = previousTotal > 0 ? (previousAllowed / previousTotal) * 100 : 0;
    const previousDenialRate = 100 - previousSuccessRate;

    // Calculate trend percentage
    const trendPercentage = previousSuccessRate > 0
      ? ((currentSuccessRate - previousSuccessRate) / previousSuccessRate) * 100
      : 0;

    // Determine trend direction
    const trend = currentSuccessRate > previousSuccessRate + 5 ? 'improving' :
                  currentSuccessRate < previousSuccessRate - 5 ? 'declining' : 'stable';

    // Detect sudden spikes in denials
    const spikeDetection = this.detectSpikes(entries);

    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(entries);

    // Key metrics
    const uniqueUsers = new Set(entries.map(e => e.userId)).size;
    const deniedActions = totalActions - allowedActions;

    // Calculate trend for denied actions
    const currentDenied = currentTotal - currentAllowed;
    const previousDenied = previousTotal - previousAllowed;
    const deniedTrendPercentage = previousDenied > 0
      ? ((currentDenied - previousDenied) / previousDenied) * 100
      : 0;

    return {
      healthScore: Math.round(healthScore),
      trend,
      trendPercentage: Math.round(trendPercentage),
      totalActions,
      successRate: Math.round(successRate),
      criticalIssues,
      comparisonPeriod: {
        current: {
          start: sevenDaysAgo,
          end: now,
          totalActions: currentTotal,
          denialRate: Math.round(currentDenialRate),
          successRate: Math.round(currentSuccessRate)
        },
        previous: {
          start: fourteenDaysAgo,
          end: sevenDaysAgo,
          totalActions: previousTotal,
          denialRate: Math.round(previousDenialRate),
          successRate: Math.round(previousSuccessRate)
        }
      },
      spikeDetection,
      keyMetrics: [
        {
          label: 'System Health',
          value: `${Math.round(healthScore)}%`,
          trendArrow: trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→',
          trendPercentage: trendPercentage !== 0 ? `${trendPercentage > 0 ? '+' : ''}${Math.round(trendPercentage)}%` : undefined,
          status: healthScore > 80 ? 'good' : healthScore > 50 ? 'warning' : 'critical'
        },
        {
          label: 'Active Users',
          value: uniqueUsers,
          status: 'good'
        },
        {
          label: 'Denied Actions',
          value: deniedActions,
          change: `Last 7d: ${currentDenied} (prev: ${previousDenied})`,
          trendArrow: deniedTrendPercentage < -10 ? '↓' : deniedTrendPercentage > 10 ? '↑' : '→',
          trendPercentage: deniedTrendPercentage !== 0 ? `${deniedTrendPercentage > 0 ? '+' : ''}${Math.round(deniedTrendPercentage)}%` : undefined,
          status: deniedActions < 3 ? 'good' : deniedActions < 10 ? 'warning' : 'critical'
        },
        {
          label: 'Success Rate',
          value: `${Math.round(successRate)}%`,
          change: `Current: ${Math.round(currentSuccessRate)}% (prev: ${Math.round(previousSuccessRate)}%)`,
          trendArrow: trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→',
          trendPercentage: trendPercentage !== 0 ? `${trendPercentage > 0 ? '+' : ''}${Math.round(trendPercentage)}%` : undefined,
          status: successRate > 80 ? 'good' : successRate > 50 ? 'warning' : 'critical'
        }
      ]
    };
  }

  /**
   * Detect sudden spikes in denials, errors, or overall activity
   */
  private detectSpikes(entries: AuditEntry[]): {
    hasSpike: boolean;
    spikeType?: 'denials' | 'errors' | 'actions';
    severity?: 'warning' | 'critical';
    description?: string;
  } {
    if (entries.length < 10) {
      return { hasSpike: false };
    }

    // Split into recent 20% vs rest for spike detection
    const recentCount = Math.floor(entries.length * 0.2);
    const recentEntries = entries.slice(0, recentCount);
    const olderEntries = entries.slice(recentCount);

    // Calculate denial rates
    const recentDenials = recentEntries.filter(e => !e.permission.allowed).length;
    const recentDenialRate = recentDenials / recentEntries.length;

    const olderDenials = olderEntries.filter(e => !e.permission.allowed).length;
    const olderDenialRate = olderDenials / olderEntries.length;

    // Spike in denials (2x increase)
    if (recentDenialRate > olderDenialRate * 2 && recentDenials >= 3) {
      return {
        hasSpike: true,
        spikeType: 'denials',
        severity: recentDenialRate > 0.5 ? 'critical' : 'warning',
        description: `Denial rate spiked to ${Math.round(recentDenialRate * 100)}% (was ${Math.round(olderDenialRate * 100)}%)`
      };
    }

    // Spike in errors
    const recentErrors = recentEntries.filter(e => e.result && !e.result.success).length;
    const recentErrorRate = recentErrors / recentEntries.length;

    const olderErrors = olderEntries.filter(e => e.result && !e.result.success).length;
    const olderErrorRate = olderErrors / olderEntries.length;

    if (recentErrorRate > olderErrorRate * 2 && recentErrors >= 3) {
      return {
        hasSpike: true,
        spikeType: 'errors',
        severity: recentErrorRate > 0.3 ? 'critical' : 'warning',
        description: `Error rate spiked to ${Math.round(recentErrorRate * 100)}% (was ${Math.round(olderErrorRate * 100)}%)`
      };
    }

    return { hasSpike: false };
  }

  /**
   * Identify critical issues requiring attention
   */
  private identifyCriticalIssues(entries: AuditEntry[]): CriticalIssue[] {
    const issues: CriticalIssue[] = [];
    const deniedEntries = entries.filter(e => e && e.permission && !e.permission.allowed);

    // Group denials by missing capability
    const denialsByCapability = new Map<string, AuditEntry[]>();
    deniedEntries.forEach(entry => {
      if (!entry || !entry.action) return; // Safety check
      // Extract capability from reason like "Missing required capability: file.delete"
      let capability = entry.action.type;
      if (entry.permission?.reason && entry.permission.reason.includes('capability:')) {
        const match = entry.permission.reason.match(/capability:\s*([^\s]+)/);
        if (match) capability = match[1];
      }
      if (!denialsByCapability.has(capability)) {
        denialsByCapability.set(capability, []);
      }
      denialsByCapability.get(capability)!.push(entry);
    });

    // Create issues for each high-denial capability
    denialsByCapability.forEach((entries, capability) => {
      if (entries.length >= 3) { // Threshold: 3+ denials
        const affectedUsers = new Set(entries.filter(e => e && e.userId).map(e => e.userId));
        issues.push({
          severity: entries.length > 5 ? 'high' : 'medium',
          category: 'permission',
          title: `Missing ${capability} permission`,
          description: `${entries.length} actions blocked due to missing ${capability} capability`,
          impact: `${affectedUsers.size} user(s) affected, blocking ${this.describeImpact(capability)}`,
          affectedActions: entries.length,
          recommendation: {
            action: `Grant ${capability} permission`,
            type: 'grant_permission',
            payload: { capability },
            estimatedImpact: `Would allow ${entries.length} blocked actions to succeed`,
            complexity: 'simple',
            autoExecutable: true
          }
        });
      }
    });

    // Check for workflow inefficiencies
    // TODO: Re-enable after debugging
    // const workflowIssues = this.detectWorkflowIssues(entries);
    // issues.push(...workflowIssues);

    // Sort by severity
    return issues.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Describe the business impact of a capability
   */
  private describeImpact(capability: string): string {
    const impacts: Record<string, string> = {
      'file.delete': 'file cleanup and management',
      'file.write': 'document creation and editing',
      'file.read': 'data access and analysis',
      'shell.exec': 'system automation',
      'browser.navigate': 'web automation workflows',
      'browser.click': 'interactive web tasks',
      'api.call': 'external integrations'
    };
    return impacts[capability] || 'workflow operations';
  }

  /**
   * Detect workflow inefficiencies and optimization opportunities
   */
  private detectWorkflowIssues(entries: AuditEntry[]): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    // Pattern: Repeated denials for same user (education issue)
    const userDenials = new Map<string, AuditEntry[]>();
    entries.filter(e => !e.permission.allowed).forEach(entry => {
      if (!userDenials.has(entry.userId)) {
        userDenials.set(entry.userId, []);
      }
      userDenials.get(entry.userId)!.push(entry);
    });

    userDenials.forEach((denials, userId) => {
      if (denials.length >= 5) {
        issues.push({
          severity: 'medium',
          category: 'permission',
          title: `User ${userId} experiencing repeated denials`,
          description: `${denials.length} denied actions suggest insufficient permissions`,
          impact: `User productivity blocked, frustration likely`,
          affectedActions: denials.length,
          recommendation: {
            action: `Review and update permissions for ${userId}`,
            type: 'update_policy',
            payload: {
              userId,
              suggestedCapabilities: [...new Set(denials.map(d => d.permission.requiredCapability || d.action.type))]
            },
            estimatedImpact: `Would unblock ${denials.length} actions for this user`,
            complexity: 'moderate',
            autoExecutable: false
          }
        });
      }
    });

    return issues;
  }

  /**
   * Level 2: Operational Insights
   * Detailed capability and user analysis
   */
  generateOperationalInsights(entries: AuditEntry[]): OperationalInsights {
    // Capability analysis
    const capabilityMap = new Map<string, { allowed: number; denied: number; users: Set<string> }>();

    entries.forEach(entry => {
      const capability = entry.action.type;
      if (!capabilityMap.has(capability)) {
        capabilityMap.set(capability, { allowed: 0, denied: 0, users: new Set() });
      }
      const stats = capabilityMap.get(capability)!;
      if (entry.permission.allowed) {
        stats.allowed++;
      } else {
        stats.denied++;
      }
      stats.users.add(entry.userId);
    });

    const capabilityAnalysis = Array.from(capabilityMap.entries()).map(([capability, stats]) => {
      const total = stats.allowed + stats.denied;
      const denialRate = (stats.denied / total) * 100;

      let recommendation: ActionableRecommendation | undefined;
      if (stats.denied >= 3) {
        recommendation = {
          action: `Grant ${capability} to affected users`,
          type: 'grant_permission',
          payload: { capability, users: Array.from(stats.users) },
          estimatedImpact: `Reduce denials by ${stats.denied} actions`,
          complexity: 'simple',
          autoExecutable: true
        };
      }

      return {
        capability,
        allowed: stats.allowed,
        denied: stats.denied,
        denialRate: Math.round(denialRate),
        topUsers: Array.from(stats.users).slice(0, 3),
        recommendation
      };
    }).sort((a, b) => b.denied - a.denied);

    // User behavior analysis
    const userMap = new Map<string, AuditEntry[]>();
    entries.forEach(entry => {
      if (!userMap.has(entry.userId)) {
        userMap.set(entry.userId, []);
      }
      userMap.get(entry.userId)!.push(entry);
    });

    const userBehavior = Array.from(userMap.entries()).map(([userId, userEntries]) => {
      const totalActions = userEntries.length;
      const allowed = userEntries.filter(e => e.permission.allowed).length;
      const successRate = (allowed / totalActions) * 100;

      const actionCounts = new Map<string, number>();
      userEntries.forEach(e => {
        actionCounts.set(e.action.type, (actionCounts.get(e.action.type) || 0) + 1);
      });
      const topActions = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([action]) => action);

      const missingCapabilities = [...new Set(
        userEntries
          .filter(e => !e.permission.allowed)
          .map(e => e.action.type)
      )];

      return {
        userId,
        totalActions,
        successRate: Math.round(successRate),
        topActions,
        missingCapabilities
      };
    });

    // Time pattern analysis
    const hourMap = new Map<number, { actions: number; denials: number }>();
    entries.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, { actions: 0, denials: 0 });
      }
      const stats = hourMap.get(hour)!;
      stats.actions++;
      if (!entry.permission.allowed) {
        stats.denials++;
      }
    });

    const timePatterns = Array.from(hourMap.entries())
      .map(([hour, stats]) => ({ hour, ...stats }))
      .sort((a, b) => a.hour - b.hour);

    // Generate activity heatmap (last 7 days, hour-by-hour)
    const activityHeatmap = this.generateActivityHeatmap(entries);

    // Generate 7-day vs 30-day trend comparison
    const trendComparison = this.generateTrendComparison(entries);

    // Detect anomalies in patterns
    const anomalyDetection = this.detectAnomalies(entries);

    return {
      capabilityAnalysis,
      userBehavior,
      timePatterns,
      performanceMetrics: {
        avgLatency: 0, // TODO: Calculate from actual latency data
        p95Latency: 0,
        errorRate: entries.filter(e => e.result && !e.result.success).length / entries.length * 100
      },
      activityHeatmap,
      trendComparison,
      anomalyDetection
    };
  }

  /**
   * Generate hour-by-hour activity heatmap for last 7 days
   */
  private generateActivityHeatmap(entries: AuditEntry[]): {
    hour: number;
    day: string;
    actions: number;
    intensity: 'low' | 'medium' | 'high';
  }[] {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter(e => e.timestamp >= sevenDaysAgo);

    // Group by day and hour
    const heatmapData = new Map<string, Map<number, number>>();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    recentEntries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const day = days[date.getDay()];
      const hour = date.getHours();

      if (!heatmapData.has(day)) {
        heatmapData.set(day, new Map());
      }
      const dayMap = heatmapData.get(day)!;
      dayMap.set(hour, (dayMap.get(hour) || 0) + 1);
    });

    // Calculate intensity thresholds
    const allCounts = Array.from(heatmapData.values())
      .flatMap(hourMap => Array.from(hourMap.values()));
    const maxCount = Math.max(...allCounts, 1);

    // Generate heatmap array
    const heatmap: {
      hour: number;
      day: string;
      actions: number;
      intensity: 'low' | 'medium' | 'high';
    }[] = [];

    days.forEach(day => {
      for (let hour = 0; hour < 24; hour++) {
        const actions = heatmapData.get(day)?.get(hour) || 0;
        const intensity = actions === 0 ? 'low' :
                         actions < maxCount * 0.5 ? 'medium' : 'high';

        heatmap.push({ hour, day, actions, intensity });
      }
    });

    return heatmap;
  }

  /**
   * Generate 7-day vs 30-day trend comparison
   */
  private generateTrendComparison(entries: AuditEntry[]): {
    period: '7d' | '30d';
    totalActions: number;
    successRate: number;
    denialRate: number;
    avgActionsPerDay: number;
    trend: 'up' | 'down' | 'stable';
  }[] {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // 7-day period
    const sevenDayEntries = entries.filter(e => e.timestamp >= sevenDaysAgo);
    const sevenDayTotal = sevenDayEntries.length;
    const sevenDayAllowed = sevenDayEntries.filter(e => e.permission.allowed).length;
    const sevenDaySuccessRate = sevenDayTotal > 0 ? (sevenDayAllowed / sevenDayTotal) * 100 : 0;
    const sevenDayDenialRate = 100 - sevenDaySuccessRate;
    const sevenDayAvgPerDay = sevenDayTotal / 7;

    // 30-day period
    const thirtyDayEntries = entries.filter(e => e.timestamp >= thirtyDaysAgo);
    const thirtyDayTotal = thirtyDayEntries.length;
    const thirtyDayAllowed = thirtyDayEntries.filter(e => e.permission.allowed).length;
    const thirtyDaySuccessRate = thirtyDayTotal > 0 ? (thirtyDayAllowed / thirtyDayTotal) * 100 : 0;
    const thirtyDayDenialRate = 100 - thirtyDaySuccessRate;
    const thirtyDayAvgPerDay = thirtyDayTotal / 30;

    // Calculate trends
    const sevenDayTrend = sevenDayAvgPerDay > thirtyDayAvgPerDay * 1.1 ? 'up' :
                          sevenDayAvgPerDay < thirtyDayAvgPerDay * 0.9 ? 'down' : 'stable';

    const thirtyDayTrend: 'up' | 'down' | 'stable' = 'stable'; // Baseline comparison

    return [
      {
        period: '7d',
        totalActions: sevenDayTotal,
        successRate: Math.round(sevenDaySuccessRate),
        denialRate: Math.round(sevenDayDenialRate),
        avgActionsPerDay: Math.round(sevenDayAvgPerDay * 10) / 10,
        trend: sevenDayTrend
      },
      {
        period: '30d',
        totalActions: thirtyDayTotal,
        successRate: Math.round(thirtyDaySuccessRate),
        denialRate: Math.round(thirtyDayDenialRate),
        avgActionsPerDay: Math.round(thirtyDayAvgPerDay * 10) / 10,
        trend: thirtyDayTrend
      }
    ];
  }

  /**
   * Detect anomalies in audit patterns
   */
  private detectAnomalies(entries: AuditEntry[]): {
    detected: boolean;
    type?: 'unusual_spike' | 'unusual_dip' | 'time_anomaly' | 'user_anomaly';
    description?: string;
    severity?: 'info' | 'warning' | 'critical';
    affectedMetric?: string;
  }[] {
    const anomalies: {
      detected: boolean;
      type?: 'unusual_spike' | 'unusual_dip' | 'time_anomaly' | 'user_anomaly';
      description?: string;
      severity?: 'info' | 'warning' | 'critical';
      affectedMetric?: string;
    }[] = [];

    if (entries.length < 20) {
      return [{ detected: false }];
    }

    // Split into recent 25% vs older 75%
    const splitPoint = Math.floor(entries.length * 0.25);
    const recentEntries = entries.slice(0, splitPoint);
    const olderEntries = entries.slice(splitPoint);

    // Anomaly 1: Unusual spike in activity
    const recentActionsPerHour = recentEntries.length / ((Date.now() - recentEntries[recentEntries.length - 1].timestamp) / (1000 * 60 * 60));
    const olderActionsPerHour = olderEntries.length / ((olderEntries[0].timestamp - olderEntries[olderEntries.length - 1].timestamp) / (1000 * 60 * 60));

    if (recentActionsPerHour > olderActionsPerHour * 3) {
      anomalies.push({
        detected: true,
        type: 'unusual_spike',
        description: `Activity spiked to ${Math.round(recentActionsPerHour)} actions/hour (was ${Math.round(olderActionsPerHour)})`,
        severity: 'warning',
        affectedMetric: 'activity_rate'
      });
    }

    // Anomaly 2: Unusual dip in activity
    if (recentActionsPerHour < olderActionsPerHour * 0.3 && olderActionsPerHour > 1) {
      anomalies.push({
        detected: true,
        type: 'unusual_dip',
        description: `Activity dropped to ${Math.round(recentActionsPerHour)} actions/hour (was ${Math.round(olderActionsPerHour)})`,
        severity: 'info',
        affectedMetric: 'activity_rate'
      });
    }

    // Anomaly 3: Unusual time pattern (activity at odd hours)
    const recentHours = recentEntries.map(e => new Date(e.timestamp).getHours());
    const nightActivity = recentHours.filter(h => h < 6 || h > 22).length;
    const nightPercentage = (nightActivity / recentHours.length) * 100;

    if (nightPercentage > 30) {
      anomalies.push({
        detected: true,
        type: 'time_anomaly',
        description: `${Math.round(nightPercentage)}% of recent activity during night hours (10pm-6am)`,
        severity: 'info',
        affectedMetric: 'time_distribution'
      });
    }

    // Anomaly 4: Single user dominating recent activity
    const recentUserCounts = new Map<string, number>();
    recentEntries.forEach(e => {
      recentUserCounts.set(e.userId, (recentUserCounts.get(e.userId) || 0) + 1);
    });

    const dominantUser = Array.from(recentUserCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantUser && (dominantUser[1] / recentEntries.length) > 0.7) {
      anomalies.push({
        detected: true,
        type: 'user_anomaly',
        description: `User ${dominantUser[0]} accounts for ${Math.round((dominantUser[1] / recentEntries.length) * 100)}% of recent activity`,
        severity: 'info',
        affectedMetric: 'user_distribution'
      });
    }

    if (anomalies.length === 0) {
      return [{ detected: false }];
    }

    return anomalies;
  }

  /**
   * Level 3: Detailed Analysis
   * Individual action logs and deep dive
   */
  generateDetailedAnalysis(entries: AuditEntry[], limit: number = 50): DetailedAnalysis {
    const denialsByCapability = new Map<string, AuditEntry[]>();
    entries.filter(e => !e.permission.allowed).forEach(entry => {
      const capability = entry.action.type;
      if (!denialsByCapability.has(capability)) {
        denialsByCapability.set(capability, []);
      }
      denialsByCapability.get(capability)!.push(entry);
    });

    const userMap = new Map<string, AuditEntry[]>();
    entries.forEach(entry => {
      if (!userMap.has(entry.userId)) {
        userMap.set(entry.userId, []);
      }
      userMap.get(entry.userId)!.push(entry);
    });

    const userTimeline = Array.from(userMap.entries()).map(([userId, actions]) => ({
      userId,
      actions: actions.slice(0, 20) // Limit per user
    }));

    return {
      recentActions: entries.slice(0, limit),
      denialsByCapability,
      userTimeline
    };
  }

  /**
   * Generate system upgrade recommendations
   */
  generateSystemUpgrades(entries: AuditEntry[]): ActionableRecommendation[] {
    const upgrades: ActionableRecommendation[] = [];

    const deniedCount = entries.filter(e => !e.permission.allowed).length;
    const totalCount = entries.length;

    // Upgrade 1: Permission bundle optimization
    if (deniedCount > 5) {
      upgrades.push({
        action: 'Implement role-based permission bundles',
        type: 'upgrade_system',
        payload: {
          feature: 'role_based_access',
          description: 'Group common permissions into roles (Admin, Developer, Analyst) for easier management'
        },
        estimatedImpact: 'Reduce permission management overhead by 70%',
        complexity: 'moderate',
        autoExecutable: false
      });
    }

    // Upgrade 2: Auto-permission learning
    const repeatedDenials = entries.filter(e => !e.permission.allowed).length;
    if (repeatedDenials > 10) {
      upgrades.push({
        action: 'Enable smart permission recommendations',
        type: 'upgrade_system',
        payload: {
          feature: 'permission_learning',
          description: 'System learns from denial patterns and suggests permission adjustments'
        },
        estimatedImpact: 'Proactively prevent 80% of permission denials',
        complexity: 'complex',
        autoExecutable: false
      });
    }

    // Upgrade 3: Audit analytics dashboard
    upgrades.push({
      action: 'Enable real-time audit analytics',
      type: 'upgrade_system',
      payload: {
        feature: 'analytics_dashboard',
        description: 'Advanced analytics with trend analysis and predictive insights'
      },
      estimatedImpact: 'Identify issues 3x faster',
      complexity: 'moderate',
      autoExecutable: false
    });

    return upgrades;
  }
}
