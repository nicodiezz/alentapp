import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from
  '@opentelemetry/auto-instrumentations-node';
import { metrics, Meter } from '@opentelemetry/api';
import { FastifyInstrumentation } from
  '@opentelemetry/instrumentation-fastify';

const prometheusExporter = new PrometheusExporter({
  port: 9464,
  host: '0.0.0.0',
  endpoint: '/metrics',
});

const sdk = new NodeSDK({
  metricReader: prometheusExporter,
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

export function createREDMetrics(meter: Meter) {

  //Contador de requests 
  const requestCounter = meter.createCounter('http.requests.total', {
    description: 'Total de requests HTTP',
  });
  //Contador de errores HTTP
  const errorCounter = meter.createCounter('http.requests.errors', {
    description: 'Total de errores HTTP',
  });
  //Histograma de duración de requests
  const requestDuration = meter.createHistogram('http.request.duration', {
    description: 'Duración de requests',
    unit: 'ms',
  });


  //Devuelve los contadores
  return { requestCounter, errorCounter, requestDuration };
}
export { sdk, meter, prometheusExporter, activeRequests };