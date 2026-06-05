import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';

const otlpExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4317',
});

const sdk = new NodeSDK({
  metricReader: new PeriodicExportingMetricReader({
    exporter: otlpExporter,
    exportIntervalMillis: 10000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {},
    }),
    new FastifyInstrumentation(),
  ],
});

sdk.start();

const meter = metrics.getMeter('alentapp-api');

// Métrica adicional: HTTP requests activas
const activeRequests = meter.createUpDownCounter('http.requests.active', {
  description: 'Total de requests HTTP activas',
});

// Métrica adicional: Consumo de memoria por el proceso (heapUsed)
const memoryUsageGauge = meter.createObservableGauge('process.memory.usage', {
  description: 'Consumo de memoria por el proceso',
  unit: 'By',
});

meter.addBatchObservableCallback((observableResult) => {
  observableResult.observe(memoryUsageGauge, process.memoryUsage().heapUsed);
}, [memoryUsageGauge]);

// Captura la señal SIGTERM para cerrar OpenTelemetry correctamente
// antes de finalizar el proceso y evitar pérdida de métricas o trazas.
process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});

export { sdk, meter, activeRequests };