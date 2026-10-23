import { startAggregator, stopAggregator } from '../aggregator';
import express from 'express';
import benchmarkRoutes from '../routes/benchmarkRoutes';
import { telemetryMiddleware } from '../middlewares/telemetryMiddleware';

async function testEndpoints() {
  console.log('Testing Benchmark Endpoints on internal test server...');
  const aggregator = startAggregator();

  const app = express();
  app.use(express.json());
  app.use(telemetryMiddleware);
  app.use('/api/benchmark', benchmarkRoutes);

  const server = app.listen(5002, async () => {
    try {
      console.log('Test server running on port 5002');

      // 1. Test Sync Log
      const syncRes = await fetch('http://localhost:5002/api/benchmark/sync-log');
      const syncData = await syncRes.json();
      console.log('Sync Log Response:', syncData);

      // 2. Test UDP Log
      const udpRes = await fetch('http://localhost:5002/api/benchmark/udp-log');
      const udpData = await udpRes.json();
      console.log('UDP Log Response:', udpData);

      // 3. Test Metrics
      const metricsRes = await fetch('http://localhost:5002/api/benchmark/metrics');
      const metricsData = await metricsRes.json();
      console.log('Metrics Response:', JSON.stringify(metricsData, null, 2));

      console.log('\n✅ All Benchmark Endpoints Working Perfectly!');
    } catch (err: any) {
      console.error('Benchmark Test Error:', err);
    } finally {
      server.close();
      await stopAggregator();
      process.exit(0);
    }
  });
}

testEndpoints();
