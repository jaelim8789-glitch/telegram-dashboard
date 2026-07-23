"""
OpenTelemetry Setup — Distributed tracing for TeleMon production observability.

Integrates with:
  - Prometheus (metrics export via OpenTelemetry)
  - Jaeger / Tempo (tracing export)
  - Console (debug)

v1 — OpenTelemetry tracing and metrics export.
"""

from __future__ import annotations

import logging
import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlite3 import SQLite3Instrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatio

logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────

OTEL_ENABLED = os.environ.get("OTEL_ENABLED", "true").lower() == "true"
OTEL_SERVICE_NAME = os.environ.get("OTEL_SERVICE_NAME", "telemon")
OTEL_EXPORTER_OTLP_ENDPOINT = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
OTEL_SAMPLING_RATE = float(os.environ.get("OTEL_SAMPLING_RATE", "0.1"))  # 10% sampling
OTEL_CONSOLE_DEBUG = os.environ.get("OTEL_CONSOLE_DEBUG", "false").lower() == "true"


def setup_opentelemetry(app) -> None:
    """Initialize OpenTelemetry tracing and instrumentation.

    Must be called BEFORE any routes are registered.
    """
    if not OTEL_ENABLED:
        logger.info("OpenTelemetry is disabled (OTEL_ENABLED=false)")
        return

    resource = Resource.create({
        "service.name": OTEL_SERVICE_NAME,
        "service.version": "1.0.0",
        "deployment.environment": os.environ.get("ENVIRONMENT", "production"),
    })

    # Configure tracer provider with sampling
    tracer_provider = TracerProvider(
        resource=resource,
        sampler=ParentBasedTraceIdRatio(OTEL_SAMPLING_RATE),
    )

    # OTLP exporter (sends to collector/Jaeger/Tempo)
    try:
        otlp_exporter = OTLPSpanExporter(
            endpoint=f"{OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces",
            timeout=5,
        )
        tracer_provider.add_span_processor(
            BatchSpanProcessor(otlp_exporter, max_queue_size=512, max_export_batch_size=64)
        )
        logger.info("OTLP span exporter configured: %s", OTEL_EXPORTER_OTLP_ENDPOINT)
    except Exception as e:
        logger.warning("Failed to configure OTLP exporter: %s", e)

    # Console exporter for debugging
    if OTEL_CONSOLE_DEBUG:
        tracer_provider.add_span_processor(
            BatchSpanProcessor(ConsoleSpanExporter())
        )
        logger.info("Console span exporter enabled (debug mode)")

    # Set global tracer provider
    trace.set_tracer_provider(tracer_provider)

    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=tracer_provider,
        excluded_urls="health,metrics",
        server_request_hook=None,
        client_request_hook=None,
        client_response_hook=None,
    )
    logger.info("FastAPI instrumentation applied")

    # Instrument HTTPX (for outgoing requests)
    try:
        HTTPXClientInstrumentor().instrument()
        logger.info("HTTPX client instrumentation applied")
    except Exception as e:
        logger.warning("Failed to instrument HTTPX: %s", e)

    # Instrument SQLite3
    try:
        SQLite3Instrumentor().instrument()
        logger.info("SQLite3 instrumentation applied")
    except Exception as e:
        logger.warning("Failed to instrument SQLite3: %s", e)

    logger.info("OpenTelemetry setup complete — service: %s, sampling: %.0f%%",
                OTEL_SERVICE_NAME, OTEL_SAMPLING_RATE * 100)


def get_tracer() -> trace.Tracer:
    """Get the tracer for manual instrumentation."""
    return trace.get_tracer(__name__)