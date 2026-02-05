/**
 * Smart Permission Recommendation Engine
 *
 * Analyzes audit log patterns and proactively suggests permission adjustments.
 *
 * Core Logic:
 * 1. User denied same capability 3+ times → Grant capability to user
 * 2. 80%+ of role members need capability → Add capability to role
 * 3. User needs 5+ capabilities → Assign role to user
 */

import { AuditEntry } from './dashboard-analytics.js';

export interface Recommendation {
  id: string;
  type: 'grant_user_capability' | 'add_role_capability' | 'assign_user_role';
  confidence: 'high' | 'medium' | 'low';
  priority: number; // 1-10, higher = more urgent
  createdAt: number;

  // What to do
  action: {
    description: string;
    target: string; // user ID or role name
    capability?: string;
    role?: string;
  };

  // Why this recommendation exists
  reasoning: {
    pattern: string;
    evidence: string[];
    impact: string;
    dataPoints: number;
  };

  // Execution details
  autoExecutable: boolean;
  estimatedImpact: string;
}

export interface RecommendationStats {
  totalRecommendations: number;
  byType: Record<string, number>;
  byConfidence: Record<string, number>;
  potentialImpact: string;
}

export interface RoleDefinition {
  name: string;
  capabilities: string[];
  members: string[];
}

export class RecommendationEngine {
  private recommendations: Map<string, Recommendation> = new Map();
  private dismissedRecommendations: Set<string> = new Set();

  // Role definitions (in real system, load from database)
  private roleDefinitions: RoleDefinition[] = [
    {
      name: 'Developer',
      capabilities: ['file.read', 'file.write', 'shell.exec', 'browser.navigate', 'api.call'],
      members: []
    },
    {
      name: 'Analyst',
      capabilities: ['file.read', 'browser.navigate', 'api.call', 'browser.extract'],
      members: []
    },
    {
      name: 'Admin',
      capabilities: ['file.read', 'file.write', 'file.delete', 'shell.exec', 'browser.navigate', 'api.call'],
      members: []
    }
  ];

  /**
   * Analyze audit log and generate recommendations
   */
  analyzeAndGenerateRecommendations(entries: AuditEntry[]): void {
    this.recommendations.clear(); // Fresh analysis each time

    // Filter to denied entries only
    const deniedEntries = entries.filter(e => e && e.permission && !e.permission.allowed);

    if (deniedEntries.length === 0) {
      return; // No denials, no recommendations needed
    }

    // Pattern 1: Repeated denials for same user + capability
    this.detectRepeatedUserDenials(deniedEntries);

    // Pattern 2: Common capability needs across role members
    this.detectRoleCapabilityGaps(deniedEntries);

    // Pattern 3: Users needing many capabilities (should get a role)
    this.detectRoleAssignmentOpportunities(deniedEntries);
  }

  /**
   * Pattern 1: If user denied same capability 3+ times → Grant capability
   */
  private detectRepeatedUserDenials(deniedEntries: AuditEntry[]): void {
    const userCapabilityDenials = new Map<string, Map<string, AuditEntry[]>>();

    // Group denials by user and capability
    deniedEntries.forEach(entry => {
      if (!entry || !entry.userId || !entry.action) return;

      const userId = entry.userId;
      const capability = this.extractCapability(entry);

      if (!userCapabilityDenials.has(userId)) {
        userCapabilityDenials.set(userId, new Map());
      }

      const userMap = userCapabilityDenials.get(userId)!;
      if (!userMap.has(capability)) {
        userMap.set(capability, []);
      }

      userMap.get(capability)!.push(entry);
    });

    // Generate recommendations for users with 3+ denials
    userCapabilityDenials.forEach((capabilityMap, userId) => {
      capabilityMap.forEach((entries, capability) => {
        if (entries.length >= 3) {
          const recId = `user_capability_${userId}_${capability}`;

          // Skip if already dismissed
          if (this.dismissedRecommendations.has(recId)) {
            return;
          }

          this.recommendations.set(recId, {
            id: recId,
            type: 'grant_user_capability',
            confidence: entries.length >= 5 ? 'high' : 'medium',
            priority: Math.min(10, entries.length), // More denials = higher priority
            createdAt: Date.now(),
            action: {
              description: `Grant ${capability} to ${userId}`,
              target: userId,
              capability
            },
            reasoning: {
              pattern: 'Repeated capability denial',
              evidence: entries.map(e =>
                `${new Date(e.timestamp).toISOString()}: ${e.action.type} denied`
              ),
              impact: `User blocked ${entries.length} times from performing ${capability} actions`,
              dataPoints: entries.length
            },
            autoExecutable: true,
            estimatedImpact: `Will prevent ${entries.length} similar denials in the future`
          });
        }
      });
    });
  }

  /**
   * Pattern 2: If 80%+ of role members need capability → Add to role
   */
  private detectRoleCapabilityGaps(deniedEntries: AuditEntry[]): void {
    // Map current users to their denied capabilities
    const userDeniedCapabilities = new Map<string, Set<string>>();

    deniedEntries.forEach(entry => {
      if (!entry || !entry.userId) return;

      const userId = entry.userId;
      const capability = this.extractCapability(entry);

      if (!userDeniedCapabilities.has(userId)) {
        userDeniedCapabilities.set(userId, new Set());
      }

      userDeniedCapabilities.get(userId)!.add(capability);
    });

    // For each role, check if many members need the same capability
    this.roleDefinitions.forEach(role => {
      // Get role members from audit data (users who have most of the role capabilities)
      const potentialMembers = this.inferRoleMembers(role, deniedEntries);

      if (potentialMembers.length < 2) {
        return; // Need at least 2 members to detect pattern
      }

      // Find capabilities that many members need
      const capabilityNeedCount = new Map<string, number>();

      potentialMembers.forEach(userId => {
        const deniedCaps = userDeniedCapabilities.get(userId);
        if (deniedCaps) {
          deniedCaps.forEach(cap => {
            capabilityNeedCount.set(cap, (capabilityNeedCount.get(cap) || 0) + 1);
          });
        }
      });

      // Generate recommendations for capabilities needed by 80%+ of role members
      capabilityNeedCount.forEach((count, capability) => {
        const percentage = (count / potentialMembers.length) * 100;

        if (percentage >= 80 && !role.capabilities.includes(capability)) {
          const recId = `role_capability_${role.name}_${capability}`;

          // Skip if already dismissed
          if (this.dismissedRecommendations.has(recId)) {
            return;
          }

          this.recommendations.set(recId, {
            id: recId,
            type: 'add_role_capability',
            confidence: percentage >= 90 ? 'high' : 'medium',
            priority: Math.round(percentage / 10), // 80-100% → priority 8-10
            createdAt: Date.now(),
            action: {
              description: `Add ${capability} to ${role.name} role`,
              target: role.name,
              capability,
              role: role.name
            },
            reasoning: {
              pattern: 'Common capability need across role members',
              evidence: [
                `${count} out of ${potentialMembers.length} ${role.name} members need ${capability}`,
                `That's ${Math.round(percentage)}% of role members`
              ],
              impact: `Would grant ${capability} to all ${role.name} members automatically`,
              dataPoints: count
            },
            autoExecutable: true,
            estimatedImpact: `Will prevent denials for ${count} users going forward`
          });
        }
      });
    });
  }

  /**
   * Pattern 3: If user needs 5+ capabilities → Assign role
   */
  private detectRoleAssignmentOpportunities(deniedEntries: AuditEntry[]): void {
    // Map users to their denied capabilities
    const userDeniedCapabilities = new Map<string, Set<string>>();

    deniedEntries.forEach(entry => {
      if (!entry || !entry.userId) return;

      const userId = entry.userId;
      const capability = this.extractCapability(entry);

      if (!userDeniedCapabilities.has(userId)) {
        userDeniedCapabilities.set(userId, new Set());
      }

      userDeniedCapabilities.get(userId)!.add(capability);
    });

    // For each user with 5+ denied capabilities, find best matching role
    userDeniedCapabilities.forEach((deniedCaps, userId) => {
      if (deniedCaps.size >= 5) {
        // Find role that covers most of these capabilities
        let bestRole: RoleDefinition | null = null;
        let bestCoverage = 0;

        this.roleDefinitions.forEach(role => {
          const coverage = Array.from(deniedCaps).filter(cap =>
            role.capabilities.includes(cap)
          ).length;

          if (coverage > bestCoverage) {
            bestCoverage = coverage;
            bestRole = role;
          }
        });

        if (bestRole && bestCoverage >= 3) { // Role must cover at least 3 of the needs
          const recId = `user_role_${userId}_${bestRole.name}`;

          // Skip if already dismissed
          if (this.dismissedRecommendations.has(recId)) {
            return;
          }

          const coveragePercentage = (bestCoverage / deniedCaps.size) * 100;

          this.recommendations.set(recId, {
            id: recId,
            type: 'assign_user_role',
            confidence: coveragePercentage >= 80 ? 'high' : coveragePercentage >= 60 ? 'medium' : 'low',
            priority: Math.round(deniedCaps.size / 2), // More denied capabilities = higher priority
            createdAt: Date.now(),
            action: {
              description: `Assign ${bestRole.name} role to ${userId}`,
              target: userId,
              role: bestRole.name
            },
            reasoning: {
              pattern: 'User needs multiple capabilities that match a role',
              evidence: [
                `User denied ${deniedCaps.size} different capabilities`,
                `${bestRole.name} role covers ${bestCoverage} of these (${Math.round(coveragePercentage)}%)`,
                `Missing capabilities: ${Array.from(deniedCaps).join(', ')}`
              ],
              impact: `Would grant ${bestCoverage} capabilities at once via role assignment`,
              dataPoints: deniedCaps.size
            },
            autoExecutable: true,
            estimatedImpact: `Will grant ${bestCoverage}/${deniedCaps.size} needed capabilities`
          });
        }
      }
    });
  }

  /**
   * Extract capability from audit entry
   */
  private extractCapability(entry: AuditEntry): string {
    // Try to get from permission.reason first
    if (entry.permission?.reason) {
      const match = entry.permission.reason.match(/capability:\s*([^\s]+)/);
      if (match) {
        return match[1];
      }
    }

    // Fall back to action.type
    return entry.action.type;
  }

  /**
   * Infer role members from audit data
   * (users who successfully use most of the role's capabilities)
   */
  private inferRoleMembers(role: RoleDefinition, entries: AuditEntry[]): string[] {
    const userCapabilityUsage = new Map<string, Set<string>>();

    // Track which capabilities each user has successfully used
    entries
      .filter(e => e && e.permission && e.permission.allowed)
      .forEach(entry => {
        const userId = entry.userId;
        const capability = entry.action.type;

        if (!userCapabilityUsage.has(userId)) {
          userCapabilityUsage.set(userId, new Set());
        }

        userCapabilityUsage.get(userId)!.add(capability);
      });

    // Find users who have used at least 50% of the role's capabilities
    const members: string[] = [];

    userCapabilityUsage.forEach((usedCaps, userId) => {
      const matchCount = role.capabilities.filter(cap => usedCaps.has(cap)).length;
      const matchPercentage = (matchCount / role.capabilities.length) * 100;

      if (matchPercentage >= 50) {
        members.push(userId);
      }
    });

    return members;
  }

  /**
   * Get all current recommendations
   */
  getRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values())
      .sort((a, b) => {
        // Sort by priority (descending), then confidence
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }

        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      });
  }

  /**
   * Get recommendation by ID
   */
  getRecommendation(id: string): Recommendation | undefined {
    return this.recommendations.get(id);
  }

  /**
   * Dismiss a recommendation
   */
  dismissRecommendation(id: string): boolean {
    if (this.recommendations.has(id)) {
      this.dismissedRecommendations.add(id);
      this.recommendations.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Get statistics about recommendations
   */
  getStats(): RecommendationStats {
    const recommendations = this.getRecommendations();

    const byType: Record<string, number> = {};
    const byConfidence: Record<string, number> = {};

    recommendations.forEach(rec => {
      byType[rec.type] = (byType[rec.type] || 0) + 1;
      byConfidence[rec.confidence] = (byConfidence[rec.confidence] || 0) + 1;
    });

    // Calculate potential impact
    const highPriorityCount = recommendations.filter(r => r.priority >= 7).length;
    const potentialImpact = highPriorityCount > 0
      ? `${highPriorityCount} high-priority recommendations can prevent 80%+ of permission denials`
      : 'No high-priority recommendations at this time';

    return {
      totalRecommendations: recommendations.length,
      byType,
      byConfidence,
      potentialImpact
    };
  }

  /**
   * Clear all recommendations (for testing)
   */
  clearRecommendations(): void {
    this.recommendations.clear();
  }

  /**
   * Clear dismissed recommendations (for testing)
   */
  clearDismissed(): void {
    this.dismissedRecommendations.clear();
  }
}
