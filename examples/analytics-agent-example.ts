/**
 * AnalyticsAgent Integration Example
 * Demonstrates statistical analysis, correlation, trends, and insights generation
 */

import { AnalyticsAgent } from '../extensions/agent-library/utility-agents/analytics-agent';
import { DistillerOrchestrator } from '../src/orchestrator/distiller-orchestrator';
import * as path from 'path';

async function main() {
  console.log('=== AnalyticsAgent Integration Example ===\n');

  // 1. Create AnalyticsAgent
  console.log('1. Creating AnalyticsAgent...');
  const analyticsAgent = new AnalyticsAgent({
    agentName: 'analytics',
    agentDescription: 'Data analysis and statistical insights agent',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
    analysisDepth: 'detailed',
  });
  console.log('   ✓ AnalyticsAgent created\n');

  // 2. Test basic statistical analysis with JSON array
  console.log('2. Basic statistical analysis (JSON array)...');
  const salesData = JSON.stringify([
    120, 135, 148, 142, 155, 168, 175, 162, 180, 195
  ]);
  const basicResult = await analyticsAgent.execute(salesData);
  console.log(basicResult);
  console.log();

  // 3. Test CSV data analysis
  console.log('3. Analyzing CSV data (temperature readings)...');
  const temperatureCSV = `
timestamp,temperature,humidity
2024-01-01,72,45
2024-01-02,75,50
2024-01-03,68,55
2024-01-04,70,48
2024-01-05,73,52
2024-01-06,77,47
2024-01-07,71,49
`.trim();

  const csvResult = await analyticsAgent.execute(temperatureCSV, {
    format: 'csv',
    column: 'temperature'
  });
  console.log(csvResult);
  console.log();

  // 4. Test correlation analysis
  console.log('4. Correlation analysis (advertising spend vs sales)...');
  const correlationData = JSON.stringify({
    x: [1000, 1500, 2000, 2500, 3000, 3500, 4000],  // Advertising spend
    y: [50, 65, 80, 95, 110, 125, 140]  // Sales revenue
  });

  const correlationResult = await analyticsAgent.execute(correlationData, {
    analysis: 'correlation'
  });
  console.log(correlationResult);
  console.log();

  // 5. Test negative correlation
  console.log('5. Negative correlation (price vs demand)...');
  const negativeCorrData = JSON.stringify({
    x: [10, 15, 20, 25, 30, 35, 40],  // Price
    y: [100, 85, 70, 55, 40, 25, 10]  // Demand
  });

  const negativeCorrResult = await analyticsAgent.execute(negativeCorrData, {
    analysis: 'correlation'
  });
  console.log(negativeCorrResult);
  console.log();

  // 6. Test trend analysis
  console.log('6. Trend analysis (monthly revenue growth)...');
  const revenueGrowth = JSON.stringify([
    10000, 12000, 15000, 18000, 22000, 28000, 35000, 42000
  ]);

  const trendResult = await analyticsAgent.execute(revenueGrowth, {
    analysis: 'trend'
  });
  console.log(trendResult);
  console.log();

  // 7. Test declining trend
  console.log('7. Declining trend analysis (customer churn)...');
  const churnData = JSON.stringify([
    1000, 950, 900, 850, 800, 750, 700, 650
  ]);

  const declineTrend = await analyticsAgent.execute(churnData, {
    analysis: 'trend'
  });
  console.log(declineTrend);
  console.log();

  // 8. Test outlier detection
  console.log('8. Outlier detection (response times in ms)...');
  const responseTimesData = JSON.stringify([
    120, 135, 142, 138, 145, 2000, 140, 138, 142, 1800, 135
  ]);

  const outlierResult = await analyticsAgent.execute(responseTimesData);
  console.log(outlierResult);
  console.log();

  // 9. Test self-reflection
  console.log('9. Testing self-reflection...');
  const testData = JSON.stringify([10, 20, 30, 40, 50]);
  const initialResult = await analyticsAgent.execute(testData);
  const reflectedResult = await analyticsAgent.selfReflect(testData, initialResult);

  console.log('   Self-reflection enabled:', analyticsAgent.getConfig().selfReflection.enabled);
  console.log('   Result modified by reflection:', reflectedResult !== initialResult);
  console.log();

  // 10. Test JSON object format
  console.log('10. Analyzing JSON object with values array...');
  const objectData = JSON.stringify({
    metric: 'conversion_rate',
    values: [2.3, 2.5, 2.8, 3.1, 2.9, 3.2, 3.5],
    unit: 'percentage'
  });

  const objectResult = await analyticsAgent.execute(objectData);
  console.log('   Conversion rate analysis:');
  console.log('   Mean:', objectResult.match(/Mean: ([\d.]+)/)?.[1]);
  console.log('   Trend:', objectResult.includes('increasing') ? 'Increasing' : 'Stable/Variable');
  console.log();

  // 11. Integration with orchestrator
  console.log('11. Integrating with DistillerOrchestrator...');
  const orchestrator = new DistillerOrchestrator();

  // Load configuration
  const configPath = path.join(__dirname, '../config/examples/test-distiller-config.yaml');
  await orchestrator.loadConfig(configPath);

  // Register AnalyticsAgent
  orchestrator.registerAgent('analytics', (data: string, context?: any) =>
    analyticsAgent.execute(data, context)
  );

  // Test through orchestrator
  const orchestratedData = JSON.stringify([100, 110, 105, 115, 120]);
  const orchestratedResult = await orchestrator.query(
    `Analyze this data: ${orchestratedData}`
  );
  console.log('   Orchestrated analysis complete');
  console.log('   Result length:', orchestratedResult.length, 'chars');
  console.log();

  // 12. Multiple analysis types comparison
  console.log('12. Comparing different analysis types...');
  const comparisonData = JSON.stringify([10, 15, 20, 25, 30, 35, 40]);

  console.log('   a) Basic analysis:');
  const basic = await analyticsAgent.execute(comparisonData);
  console.log('      Mean:', basic.match(/Mean: ([\d.]+)/)?.[1]);
  console.log('      Std Dev:', basic.match(/Standard Deviation: ([\d.]+)/)?.[1]);

  console.log('   b) Trend analysis:');
  const trend = await analyticsAgent.execute(comparisonData, { analysis: 'trend' });
  console.log('      Direction:', trend.match(/Trend Direction: (\w+)/)?.[1]);
  console.log('      Slope:', trend.match(/Slope: ([\d.]+)/)?.[1]);
  console.log();

  // 13. Performance test
  console.log('13. Performance test (concurrent analyses)...');
  const datasets = [
    JSON.stringify([1, 2, 3, 4, 5]),
    JSON.stringify([10, 20, 30, 40, 50]),
    JSON.stringify([100, 200, 300, 400, 500]),
    JSON.stringify([5, 10, 15, 20, 25]),
  ];

  const startTime = Date.now();
  const results = await Promise.all(
    datasets.map(data => analyticsAgent.execute(data))
  );
  const duration = Date.now() - startTime;

  console.log(`   Processed ${datasets.length} datasets in ${duration}ms`);
  console.log(`   Average: ${(duration / datasets.length).toFixed(0)}ms per analysis`);
  console.log(`   All analyses completed successfully: ${results.every(r => r.length > 0)}`);
  console.log();

  // 14. Edge cases
  console.log('14. Testing edge cases...');

  // Single value
  const singleValue = JSON.stringify([42]);
  const singleResult = await analyticsAgent.execute(singleValue);
  console.log('   a) Single value dataset:');
  console.log('      Mean:', singleResult.match(/Mean: ([\d.]+)/)?.[1]);

  // Negative numbers
  const negativeNumbers = JSON.stringify([-10, -5, 0, 5, 10]);
  const negativeResult = await analyticsAgent.execute(negativeNumbers);
  console.log('   b) Negative numbers:');
  console.log('      Mean:', negativeResult.match(/Mean: ([-\d.]+)/)?.[1]);

  // All zeros
  const zeros = JSON.stringify([0, 0, 0, 0, 0]);
  const zerosResult = await analyticsAgent.execute(zeros);
  console.log('   c) All zeros:');
  console.log('      Std Dev:', zerosResult.match(/Standard Deviation: ([\d.]+)/)?.[1]);
  console.log();

  // 15. Real-world scenario: E-commerce metrics
  console.log('15. Real-world scenario: E-commerce daily orders analysis...');
  const dailyOrders = JSON.stringify([
    245, 268, 252, 289, 301, 275, 312, // Week 1
    298, 325, 340, 315, 355, 380, 405, // Week 2
    392, 410, 425, 398, 440, 465, 480  // Week 3
  ]);

  const ecommerceResult = await analyticsAgent.execute(dailyOrders);
  console.log('E-commerce Analysis Summary:');
  console.log('--------------------------------');

  const meanMatch = ecommerceResult.match(/Mean: ([\d.]+)/);
  const trendMatch = ecommerceResult.includes('increasing') ||
                     ecommerceResult.includes('upward');
  const outlierMatch = ecommerceResult.includes('outlier');

  console.log('Average daily orders:', meanMatch?.[1]);
  console.log('Growth trend detected:', trendMatch ? 'Yes' : 'No');
  console.log('Outliers detected:', outlierMatch ? 'Yes' : 'No');
  console.log();

  console.log('=== Example Complete ===');
  console.log('\nKey Features Demonstrated:');
  console.log('✓ Basic statistical analysis (mean, median, mode, std dev)');
  console.log('✓ CSV data parsing and analysis');
  console.log('✓ Correlation analysis (positive and negative)');
  console.log('✓ Trend analysis (increasing and decreasing)');
  console.log('✓ Outlier detection');
  console.log('✓ Self-reflection capability');
  console.log('✓ Multiple data formats (JSON array, JSON object, CSV)');
  console.log('✓ Orchestrator integration');
  console.log('✓ Concurrent processing');
  console.log('✓ Edge case handling');
  console.log('✓ Real-world scenario analysis');
}

// Run example
main().catch((error) => {
  console.error('Error running example:', error);
  process.exit(1);
});
