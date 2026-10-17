# Why It Happened

An AI match-insights engine for the *Inside the Game: Developer Hackathon* (Microsoft x Premier League).
It reads a stream of synthetic football events, detects tactical moments with deterministic rules
(starting with counter-attacks), and explains each one in plain language, in several languages,
**with the exact events cited as evidence**.

- Rules find, the LLM explains. The model only writes words; it never decides what happened.
- Every narration ends with evidence ids. If the model cites an id that does not exist, we fall back to a template.
- Works with no API key (template narration), so development and demos never block on the model.

## Stack

Python 3.11+ / FastAPI / SQLite, NVIDIA-hosted LLM (OpenAI-compatible API), React + TypeScript (Vite), Azure Container Apps for hosting.

## Quick start (backend)

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # Windows: copy .env.example .env   (then fill in NVIDIA_API_KEY / NVIDIA_MODEL)
pytest -q
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs, then http://localhost:8000/stream to watch insights arrive.
Check the model works with `python scripts/smoke_nvidia.py`.

## Frontend

```bash
npm create vite@latest web -- --template react-ts
cp frontend-starter/types.ts frontend-starter/useInsightStream.ts frontend-starter/App.tsx web/src/
cd web && npm install && npm run dev      # http://localhost:5173
```

## Layout

```
app/            FastAPI service: events, detectors, narrator, store, simulate, main
data/           sample match events (replace with the official synthetic data)
tests/          pytest
scripts/        smoke_nvidia.py
frontend-starter/  starter files to copy into web/src
web/            Vite + React + TypeScript app (created by you, see above)
```

## Endpoints

| Path              | What                                                        |
| ----------------- | ----------------------------------------------------------- |
| `GET /health`   | status, whether an LLM is configured                        |
| `GET /events`   | the events being replayed                                   |
| `GET /insights` | insights stored so far                                      |
| `GET /stream`   | Server-Sent Events: replays the match, pushes insights live |

## Status

Backbone only. Next: official data adapter (`app/events.py: from_official`), second detector, dashboard, deploy.

```
why-it-happened
├─ .venv-1
│  ├─ Include
│  ├─ Lib
│  │  └─ site-packages
│  │     ├─ annotated_doc
│  │     │  ├─ main.py
│  │     │  ├─ py.typed
│  │     │  └─ __init__.py
│  │     ├─ annotated_doc-0.0.5.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ annotated_types
│  │     │  ├─ py.typed
│  │     │  ├─ test_cases.py
│  │     │  └─ __init__.py
│  │     ├─ annotated_types-0.8.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ anyio
│  │     │  ├─ abc
│  │     │  │  ├─ _eventloop.py
│  │     │  │  ├─ _resources.py
│  │     │  │  ├─ _sockets.py
│  │     │  │  ├─ _streams.py
│  │     │  │  ├─ _subprocesses.py
│  │     │  │  ├─ _tasks.py
│  │     │  │  ├─ _testing.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ from_thread.py
│  │     │  ├─ functools.py
│  │     │  ├─ itertools.py
│  │     │  ├─ lowlevel.py
│  │     │  ├─ py.typed
│  │     │  ├─ pytest_plugin.py
│  │     │  ├─ streams
│  │     │  │  ├─ buffered.py
│  │     │  │  ├─ file.py
│  │     │  │  ├─ memory.py
│  │     │  │  ├─ stapled.py
│  │     │  │  ├─ text.py
│  │     │  │  ├─ tls.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ to_interpreter.py
│  │     │  ├─ to_process.py
│  │     │  ├─ to_thread.py
│  │     │  ├─ _backends
│  │     │  │  ├─ _asyncio.py
│  │     │  │  ├─ _trio.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _core
│  │     │  │  ├─ _asyncio_selector_thread.py
│  │     │  │  ├─ _concurrency_utils.py
│  │     │  │  ├─ _contextmanagers.py
│  │     │  │  ├─ _eventloop.py
│  │     │  │  ├─ _exceptions.py
│  │     │  │  ├─ _fileio.py
│  │     │  │  ├─ _futures.py
│  │     │  │  ├─ _resources.py
│  │     │  │  ├─ _signals.py
│  │     │  │  ├─ _sockets.py
│  │     │  │  ├─ _streams.py
│  │     │  │  ├─ _subprocesses.py
│  │     │  │  ├─ _synchronization.py
│  │     │  │  ├─ _tasks.py
│  │     │  │  ├─ _tempfile.py
│  │     │  │  ├─ _testing.py
│  │     │  │  ├─ _typedattr.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _lazyimport.py
│  │     │  └─ __init__.py
│  │     ├─ anyio-4.15.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ azure
│  │     │  ├─ core
│  │     │  │  ├─ async_paging.py
│  │     │  │  ├─ configuration.py
│  │     │  │  ├─ credentials.py
│  │     │  │  ├─ credentials_async.py
│  │     │  │  ├─ exceptions.py
│  │     │  │  ├─ instrumentation.py
│  │     │  │  ├─ messaging.py
│  │     │  │  ├─ paging.py
│  │     │  │  ├─ pipeline
│  │     │  │  │  ├─ policies
│  │     │  │  │  │  ├─ _authentication.py
│  │     │  │  │  │  ├─ _authentication_async.py
│  │     │  │  │  │  ├─ _base.py
│  │     │  │  │  │  ├─ _base_async.py
│  │     │  │  │  │  ├─ _custom_hook.py
│  │     │  │  │  │  ├─ _distributed_tracing.py
│  │     │  │  │  │  ├─ _redirect.py
│  │     │  │  │  │  ├─ _redirect_async.py
│  │     │  │  │  │  ├─ _retry.py
│  │     │  │  │  │  ├─ _retry_async.py
│  │     │  │  │  │  ├─ _sensitive_header_cleanup_policy.py
│  │     │  │  │  │  ├─ _universal.py
│  │     │  │  │  │  ├─ _utils.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ transport
│  │     │  │  │  │  ├─ _aiohttp.py
│  │     │  │  │  │  ├─ _base.py
│  │     │  │  │  │  ├─ _base_async.py
│  │     │  │  │  │  ├─ _base_requests_async.py
│  │     │  │  │  │  ├─ _bigger_block_size_http_adapters.py
│  │     │  │  │  │  ├─ _requests_asyncio.py
│  │     │  │  │  │  ├─ _requests_basic.py
│  │     │  │  │  │  ├─ _requests_trio.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ _base.py
│  │     │  │  │  ├─ _base_async.py
│  │     │  │  │  ├─ _tools.py
│  │     │  │  │  ├─ _tools_async.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ polling
│  │     │  │  │  ├─ async_base_polling.py
│  │     │  │  │  ├─ base_polling.py
│  │     │  │  │  ├─ _async_poller.py
│  │     │  │  │  ├─ _poller.py
│  │     │  │  │  ├─ _utils.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ py.typed
│  │     │  │  ├─ rest
│  │     │  │  │  ├─ _aiohttp.py
│  │     │  │  │  ├─ _helpers.py
│  │     │  │  │  ├─ _http_response_impl.py
│  │     │  │  │  ├─ _http_response_impl_async.py
│  │     │  │  │  ├─ _requests_asyncio.py
│  │     │  │  │  ├─ _requests_basic.py
│  │     │  │  │  ├─ _requests_trio.py
│  │     │  │  │  ├─ _rest_py3.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ serialization.py
│  │     │  │  ├─ settings.py
│  │     │  │  ├─ tracing
│  │     │  │  │  ├─ common.py
│  │     │  │  │  ├─ decorator.py
│  │     │  │  │  ├─ decorator_async.py
│  │     │  │  │  ├─ ext
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ opentelemetry.py
│  │     │  │  │  ├─ _abstract_span.py
│  │     │  │  │  ├─ _models.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ utils
│  │     │  │  │  ├─ _connection_string_parser.py
│  │     │  │  │  ├─ _messaging_shared.py
│  │     │  │  │  ├─ _pipeline_transport_rest_shared.py
│  │     │  │  │  ├─ _pipeline_transport_rest_shared_async.py
│  │     │  │  │  ├─ _utils.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ _azure_clouds.py
│  │     │  │  ├─ _enum_meta.py
│  │     │  │  ├─ _match_conditions.py
│  │     │  │  ├─ _pipeline_client.py
│  │     │  │  ├─ _pipeline_client_async.py
│  │     │  │  ├─ _version.py
│  │     │  │  └─ __init__.py
│  │     │  └─ cosmos
│  │     │     ├─ aio
│  │     │     │  ├─ _asynchronous_availability_strategy_handler.py
│  │     │     │  ├─ _asynchronous_request.py
│  │     │     │  ├─ _auth_policy_async.py
│  │     │     │  ├─ _container.py
│  │     │     │  ├─ _cosmos_client.py
│  │     │     │  ├─ _cosmos_client_connection_async.py
│  │     │     │  ├─ _database.py
│  │     │     │  ├─ _global_endpoint_manager_async.py
│  │     │     │  ├─ _global_partition_endpoint_manager_circuit_breaker_async.py
│  │     │     │  ├─ _global_partition_endpoint_manager_per_partition_automatic_failover_async.py
│  │     │     │  ├─ _gone_retry_policy_async.py
│  │     │     │  ├─ _inference_auth_policy_async.py
│  │     │     │  ├─ _inference_service_async.py
│  │     │     │  ├─ _query_iterable_async.py
│  │     │     │  ├─ _read_items_helper_async.py
│  │     │     │  ├─ _retry_utility_async.py
│  │     │     │  ├─ _scripts.py
│  │     │     │  ├─ _user.py
│  │     │     │  └─ __init__.py
│  │     │     ├─ auth.py
│  │     │     ├─ container.py
│  │     │     ├─ cosmos_client.py
│  │     │     ├─ database.py
│  │     │     ├─ diagnostics.py
│  │     │     ├─ documents.py
│  │     │     ├─ errors.py
│  │     │     ├─ exceptions.py
│  │     │     ├─ http_constants.py
│  │     │     ├─ offer.py
│  │     │     ├─ partition_key.py
│  │     │     ├─ permission.py
│  │     │     ├─ py.typed
│  │     │     ├─ scripts.py
│  │     │     ├─ user.py
│  │     │     ├─ _auth_policy.py
│  │     │     ├─ _availability_strategy_config.py
│  │     │     ├─ _availability_strategy_handler.py
│  │     │     ├─ _availability_strategy_handler_base.py
│  │     │     ├─ _base.py
│  │     │     ├─ _change_feed
│  │     │     │  ├─ aio
│  │     │     │  │  ├─ change_feed_fetcher.py
│  │     │     │  │  ├─ change_feed_iterable.py
│  │     │     │  │  └─ __init__.py
│  │     │     │  ├─ change_feed_fetcher.py
│  │     │     │  ├─ change_feed_iterable.py
│  │     │     │  ├─ change_feed_start_from.py
│  │     │     │  ├─ change_feed_state.py
│  │     │     │  ├─ change_feed_utils.py
│  │     │     │  ├─ composite_continuation_token.py
│  │     │     │  ├─ feed_range_composite_continuation_token.py
│  │     │     │  ├─ feed_range_internal.py
│  │     │     │  └─ __init__.py
│  │     │     ├─ _constants.py
│  │     │     ├─ _container_recreate_retry_policy.py
│  │     │     ├─ _cosmos_client_connection.py
│  │     │     ├─ _cosmos_http_logging_policy.py
│  │     │     ├─ _cosmos_integers.py
│  │     │     ├─ _cosmos_murmurhash3.py
│  │     │     ├─ _cosmos_responses.py
│  │     │     ├─ _default_retry_policy.py
│  │     │     ├─ _endpoint_discovery_retry_policy.py
│  │     │     ├─ _execution_context
│  │     │     │  ├─ aggregators.py
│  │     │     │  ├─ aio
│  │     │     │  │  ├─ base_execution_context.py
│  │     │     │  │  ├─ document_producer.py
│  │     │     │  │  ├─ endpoint_component.py
│  │     │     │  │  ├─ execution_dispatcher.py
│  │     │     │  │  ├─ hybrid_search_aggregator.py
│  │     │     │  │  ├─ multi_execution_aggregator.py
│  │     │     │  │  ├─ non_streaming_order_by_aggregator.py
│  │     │     │  │  ├─ _queue_async_helper.py
│  │     │     │  │  └─ __init__.py
│  │     │     │  ├─ base_execution_context.py
│  │     │     │  ├─ document_producer.py
│  │     │     │  ├─ endpoint_component.py
│  │     │     │  ├─ execution_dispatcher.py
│  │     │     │  ├─ hybrid_search_aggregator.py
│  │     │     │  ├─ multi_execution_aggregator.py
│  │     │     │  ├─ non_streaming_order_by_aggregator.py
│  │     │     │  ├─ query_execution_info.py
│  │     │     │  └─ __init__.py
│  │     │     ├─ _global_endpoint_manager.py
│  │     │     ├─ _global_partition_endpoint_manager_circuit_breaker.py
│  │     │     ├─ _global_partition_endpoint_manager_circuit_breaker_core.py
│  │     │     ├─ _global_partition_endpoint_manager_per_partition_automatic_failover.py
│  │     │     ├─ _global_secondary_index.py
│  │     │     ├─ _gone_retry_policy.py
│  │     │     ├─ _gone_retry_policy_base.py
│  │     │     ├─ _health_check_retry_policy.py
│  │     │     ├─ _inference_auth_policy.py
│  │     │     ├─ _inference_service.py
│  │     │     ├─ _location_cache.py
│  │     │     ├─ _partition.py
│  │     │     ├─ _partition_health_tracker.py
│  │     │     ├─ _query_advisor
│  │     │     │  ├─ query_advice_rules.json
│  │     │     │  ├─ _get_query_advice_info.py
│  │     │     │  ├─ _query_advice.py
│  │     │     │  ├─ _rule_directory.py
│  │     │     │  └─ __init__.py
│  │     │     ├─ _query_aggregate_utils.py
│  │     │     ├─ _query_builder.py
│  │     │     ├─ _query_iterable.py
│  │     │     ├─ _range.py
│  │     │     ├─ _range_partition_resolver.py
│  │     │     ├─ _read_items_helper.py
│  │     │     ├─ _request_object.py
│  │     │     ├─ _resource_throttle_retry_policy.py
│  │     │     ├─ _response_decoding.py
│  │     │     ├─ _retry_options.py
│  │     │     ├─ _retry_utility.py
│  │     │     ├─ _routing
│  │     │     │  ├─ aio
│  │     │     │  │  ├─ routing_map_provider.py
│  │     │     │  │  └─ __init__.py
│  │     │     │  ├─ collection_routing_map.py
│  │     │     │  ├─ feed_range_continuation.py
│  │     │     │  ├─ routing_map_provider.py
│  │     │     │  ├─ routing_range.py
│  │     │     │  ├─ _routing_map_provider_common.py
│  │     │     │  └─ __init__.py
│  │     │     ├─ _runtime_constants.py
│  │     │     ├─ _service_request_retry_policy.py
│  │     │     ├─ _service_response_retry_policy.py
│  │     │     ├─ _service_unavailable_retry_policy.py
│  │     │     ├─ _session.py
│  │     │     ├─ _session_retry_policy.py
│  │     │     ├─ _session_token_helpers.py
│  │     │     ├─ _synchronized_request.py
│  │     │     ├─ _timeout_failover_retry_policy.py
│  │     │     ├─ _user_agent_policy.py
│  │     │     ├─ _utils.py
│  │     │     ├─ _vector_session_token.py
│  │     │     ├─ _version.py
│  │     │     └─ __init__.py
│  │     ├─ azure_core-1.41.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ azure_cosmos-4.17.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ certifi
│  │     │  ├─ cacert.pem
│  │     │  ├─ core.py
│  │     │  ├─ py.typed
│  │     │  ├─ tests
│  │     │  │  ├─ test_certify.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ certifi-2026.7.22.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ charset_normalizer
│  │     │  ├─ api.py
│  │     │  ├─ cd.cp314-win_amd64.pyd
│  │     │  ├─ cd.py
│  │     │  ├─ cli
│  │     │  │  ├─ __init__.py
│  │     │  │  └─ __main__.py
│  │     │  ├─ constant.py
│  │     │  ├─ legacy.py
│  │     │  ├─ md.cp314-win_amd64.pyd
│  │     │  ├─ md.py
│  │     │  ├─ models.py
│  │     │  ├─ py.typed
│  │     │  ├─ utils.py
│  │     │  ├─ version.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ charset_normalizer-3.5.2.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ click
│  │     │  ├─ core.py
│  │     │  ├─ decorators.py
│  │     │  ├─ exceptions.py
│  │     │  ├─ formatting.py
│  │     │  ├─ globals.py
│  │     │  ├─ parser.py
│  │     │  ├─ py.typed
│  │     │  ├─ shell_completion.py
│  │     │  ├─ termui.py
│  │     │  ├─ testing.py
│  │     │  ├─ types.py
│  │     │  ├─ utils.py
│  │     │  ├─ _compat.py
│  │     │  ├─ _termui_impl.py
│  │     │  ├─ _textwrap.py
│  │     │  ├─ _utils.py
│  │     │  ├─ _winconsole.py
│  │     │  └─ __init__.py
│  │     ├─ click-8.5.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ colorama
│  │     │  ├─ ansi.py
│  │     │  ├─ ansitowin32.py
│  │     │  ├─ initialise.py
│  │     │  ├─ tests
│  │     │  │  ├─ ansitowin32_test.py
│  │     │  │  ├─ ansi_test.py
│  │     │  │  ├─ initialise_test.py
│  │     │  │  ├─ isatty_test.py
│  │     │  │  ├─ utils.py
│  │     │  │  ├─ winterm_test.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ win32.py
│  │     │  ├─ winterm.py
│  │     │  └─ __init__.py
│  │     ├─ colorama-0.4.6.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ dotenv
│  │     │  ├─ cli.py
│  │     │  ├─ ipython.py
│  │     │  ├─ main.py
│  │     │  ├─ parser.py
│  │     │  ├─ py.typed
│  │     │  ├─ variables.py
│  │     │  ├─ version.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ fastapi
│  │     │  ├─ .agents
│  │     │  │  └─ skills
│  │     │  │     └─ fastapi
│  │     │  │        ├─ references
│  │     │  │        │  ├─ dependencies.md
│  │     │  │        │  ├─ other-tools.md
│  │     │  │        │  ├─ path-operations.md
│  │     │  │        │  ├─ pydantic.md
│  │     │  │        │  ├─ responses.md
│  │     │  │        │  └─ streaming.md
│  │     │  │        └─ SKILL.md
│  │     │  ├─ applications.py
│  │     │  ├─ background.py
│  │     │  ├─ cli.py
│  │     │  ├─ concurrency.py
│  │     │  ├─ datastructures.py
│  │     │  ├─ dependencies
│  │     │  │  ├─ models.py
│  │     │  │  ├─ utils.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ encoders.py
│  │     │  ├─ exceptions.py
│  │     │  ├─ exception_handlers.py
│  │     │  ├─ logger.py
│  │     │  ├─ middleware
│  │     │  │  ├─ asyncexitstack.py
│  │     │  │  ├─ cors.py
│  │     │  │  ├─ gzip.py
│  │     │  │  ├─ httpsredirect.py
│  │     │  │  ├─ trustedhost.py
│  │     │  │  ├─ wsgi.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ openapi
│  │     │  │  ├─ constants.py
│  │     │  │  ├─ docs.py
│  │     │  │  ├─ models.py
│  │     │  │  ├─ utils.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ params.py
│  │     │  ├─ param_functions.py
│  │     │  ├─ py.typed
│  │     │  ├─ requests.py
│  │     │  ├─ responses.py
│  │     │  ├─ routing.py
│  │     │  ├─ security
│  │     │  │  ├─ api_key.py
│  │     │  │  ├─ base.py
│  │     │  │  ├─ http.py
│  │     │  │  ├─ oauth2.py
│  │     │  │  ├─ open_id_connect_url.py
│  │     │  │  ├─ utils.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ sse.py
│  │     │  ├─ staticfiles.py
│  │     │  ├─ telemetry
│  │     │  │  ├─ _api.py
│  │     │  │  ├─ _asgi.py
│  │     │  │  ├─ _runtime.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ templating.py
│  │     │  ├─ testclient.py
│  │     │  ├─ types.py
│  │     │  ├─ utils.py
│  │     │  ├─ websockets.py
│  │     │  ├─ _compat
│  │     │  │  ├─ shared.py
│  │     │  │  ├─ v2.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ fastapi-0.143.2.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ h11
│  │     │  ├─ py.typed
│  │     │  ├─ _abnf.py
│  │     │  ├─ _connection.py
│  │     │  ├─ _events.py
│  │     │  ├─ _headers.py
│  │     │  ├─ _readers.py
│  │     │  ├─ _receivebuffer.py
│  │     │  ├─ _state.py
│  │     │  ├─ _util.py
│  │     │  ├─ _version.py
│  │     │  ├─ _writers.py
│  │     │  └─ __init__.py
│  │     ├─ h11-0.16.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ httpcore
│  │     │  ├─ py.typed
│  │     │  ├─ _api.py
│  │     │  ├─ _async
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ connection_pool.py
│  │     │  │  ├─ http11.py
│  │     │  │  ├─ http2.py
│  │     │  │  ├─ http_proxy.py
│  │     │  │  ├─ interfaces.py
│  │     │  │  ├─ socks_proxy.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _backends
│  │     │  │  ├─ anyio.py
│  │     │  │  ├─ auto.py
│  │     │  │  ├─ base.py
│  │     │  │  ├─ mock.py
│  │     │  │  ├─ sync.py
│  │     │  │  ├─ trio.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _exceptions.py
│  │     │  ├─ _models.py
│  │     │  ├─ _ssl.py
│  │     │  ├─ _sync
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ connection_pool.py
│  │     │  │  ├─ http11.py
│  │     │  │  ├─ http2.py
│  │     │  │  ├─ http_proxy.py
│  │     │  │  ├─ interfaces.py
│  │     │  │  ├─ socks_proxy.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _synchronization.py
│  │     │  ├─ _trace.py
│  │     │  ├─ _utils.py
│  │     │  └─ __init__.py
│  │     ├─ httpcore-1.0.9.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ httpcore2
│  │     │  ├─ py.typed
│  │     │  ├─ _api.py
│  │     │  ├─ _async
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ connection_pool.py
│  │     │  │  ├─ http11.py
│  │     │  │  ├─ http2.py
│  │     │  │  ├─ http_proxy.py
│  │     │  │  ├─ interfaces.py
│  │     │  │  ├─ socks_proxy.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _backends
│  │     │  │  ├─ anyio.py
│  │     │  │  ├─ auto.py
│  │     │  │  ├─ base.py
│  │     │  │  ├─ mock.py
│  │     │  │  ├─ sync.py
│  │     │  │  ├─ trio.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _exceptions.py
│  │     │  ├─ _models.py
│  │     │  ├─ _ssl.py
│  │     │  ├─ _sync
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ connection_pool.py
│  │     │  │  ├─ http11.py
│  │     │  │  ├─ http2.py
│  │     │  │  ├─ http_proxy.py
│  │     │  │  ├─ interfaces.py
│  │     │  │  ├─ socks_proxy.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _synchronization.py
│  │     │  ├─ _trace.py
│  │     │  ├─ _utils.py
│  │     │  └─ __init__.py
│  │     ├─ httpcore2-2.13.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ httptools
│  │     │  ├─ parser
│  │     │  │  ├─ cparser.pxd
│  │     │  │  ├─ errors.py
│  │     │  │  ├─ parser.cp314-win_amd64.pyd
│  │     │  │  ├─ parser.pyi
│  │     │  │  ├─ parser.pyx
│  │     │  │  ├─ protocol.py
│  │     │  │  ├─ python.pxd
│  │     │  │  ├─ url_cparser.pxd
│  │     │  │  ├─ url_parser.cp314-win_amd64.pyd
│  │     │  │  ├─ url_parser.pyi
│  │     │  │  ├─ url_parser.pyx
│  │     │  │  └─ __init__.py
│  │     │  ├─ py.typed
│  │     │  ├─ _version.py
│  │     │  └─ __init__.py
│  │     ├─ httptools-0.9.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ LICENSE
│  │     │  │  └─ vendor
│  │     │  │     ├─ http-parser
│  │     │  │     │  └─ LICENSE-MIT
│  │     │  │     └─ llhttp
│  │     │  │        └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ httpx
│  │     │  ├─ py.typed
│  │     │  ├─ _api.py
│  │     │  ├─ _auth.py
│  │     │  ├─ _client.py
│  │     │  ├─ _config.py
│  │     │  ├─ _content.py
│  │     │  ├─ _decoders.py
│  │     │  ├─ _exceptions.py
│  │     │  ├─ _main.py
│  │     │  ├─ _models.py
│  │     │  ├─ _multipart.py
│  │     │  ├─ _status_codes.py
│  │     │  ├─ _transports
│  │     │  │  ├─ asgi.py
│  │     │  │  ├─ base.py
│  │     │  │  ├─ default.py
│  │     │  │  ├─ mock.py
│  │     │  │  ├─ wsgi.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _types.py
│  │     │  ├─ _urlparse.py
│  │     │  ├─ _urls.py
│  │     │  ├─ _utils.py
│  │     │  ├─ __init__.py
│  │     │  └─ __version__.py
│  │     ├─ httpx-0.28.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ httpx2
│  │     │  ├─ py.typed
│  │     │  ├─ websockets
│  │     │  │  ├─ _api.py
│  │     │  │  ├─ _exceptions.py
│  │     │  │  ├─ _ping.py
│  │     │  │  ├─ _transport.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _alias.py
│  │     │  ├─ _api.py
│  │     │  ├─ _auth.py
│  │     │  ├─ _client.py
│  │     │  ├─ _config.py
│  │     │  ├─ _content.py
│  │     │  ├─ _decoders.py
│  │     │  ├─ _exceptions.py
│  │     │  ├─ _main.py
│  │     │  ├─ _models.py
│  │     │  ├─ _multipart.py
│  │     │  ├─ _sse.py
│  │     │  ├─ _status_codes.py
│  │     │  ├─ _transports
│  │     │  │  ├─ asgi.py
│  │     │  │  ├─ base.py
│  │     │  │  ├─ default.py
│  │     │  │  ├─ mock.py
│  │     │  │  ├─ wsgi.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _types.py
│  │     │  ├─ _urlparse.py
│  │     │  ├─ _urls.py
│  │     │  ├─ _utils.py
│  │     │  ├─ __init__.py
│  │     │  └─ __version__.py
│  │     ├─ httpx2-2.13.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ idna
│  │     │  ├─ cli.py
│  │     │  ├─ codec.py
│  │     │  ├─ compat.py
│  │     │  ├─ core.py
│  │     │  ├─ idnadata.py
│  │     │  ├─ intranges.py
│  │     │  ├─ package_data.py
│  │     │  ├─ py.typed
│  │     │  ├─ uts46data.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ idna-3.20.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ iniconfig
│  │     │  ├─ exceptions.py
│  │     │  ├─ py.typed
│  │     │  ├─ _parse.py
│  │     │  ├─ _version.py
│  │     │  └─ __init__.py
│  │     ├─ iniconfig-2.3.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ jiter
│  │     │  ├─ jiter.cp314-win_amd64.pyd
│  │     │  ├─ py.typed
│  │     │  ├─ __init__.py
│  │     │  └─ __init__.pyi
│  │     ├─ jiter-0.17.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ sboms
│  │     │  │  └─ jiter-python.cyclonedx.json
│  │     │  └─ WHEEL
│  │     ├─ openai
│  │     │  ├─ auth
│  │     │  │  ├─ _workload.py
│  │     │  │  ├─ _x509.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ helpers
│  │     │  │  ├─ local_audio_player.py
│  │     │  │  ├─ microphone.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ lib
│  │     │  │  ├─ .keep
│  │     │  │  ├─ azure.py
│  │     │  │  ├─ bedrock.py
│  │     │  │  ├─ beta
│  │     │  │  │  ├─ agents
│  │     │  │  │  │  ├─ _artifacts.py
│  │     │  │  │  │  ├─ _files.py
│  │     │  │  │  │  ├─ _output.py
│  │     │  │  │  │  ├─ _result.py
│  │     │  │  │  │  ├─ _schema.py
│  │     │  │  │  │  ├─ _stream.py
│  │     │  │  │  │  ├─ _tools.py
│  │     │  │  │  │  ├─ _tool_error.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ browser.py
│  │     │  │  ├─ computer.py
│  │     │  │  ├─ decisions_tool_runner.py
│  │     │  │  ├─ live
│  │     │  │  │  ├─ README.md
│  │     │  │  │  ├─ _listeners.py
│  │     │  │  │  ├─ _transcript_grouper.py
│  │     │  │  │  ├─ _transcript_grouping.py
│  │     │  │  │  ├─ _transcript_state.py
│  │     │  │  │  ├─ _types.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ responses_tool_runner.py
│  │     │  │  ├─ responses_websocket
│  │     │  │  │  ├─ README.md
│  │     │  │  │  ├─ _accumulator.py
│  │     │  │  │  ├─ _session.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ streaming
│  │     │  │  │  ├─ agents
│  │     │  │  │  │  ├─ _dispatch.py
│  │     │  │  │  │  ├─ _streams.py
│  │     │  │  │  │  ├─ _tools.py
│  │     │  │  │  │  ├─ _types.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ chat
│  │     │  │  │  │  ├─ _completions.py
│  │     │  │  │  │  ├─ _events.py
│  │     │  │  │  │  ├─ _types.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ responses
│  │     │  │  │  │  ├─ _events.py
│  │     │  │  │  │  ├─ _responses.py
│  │     │  │  │  │  ├─ _types.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ _assistants.py
│  │     │  │  │  ├─ _deltas.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ tool_diagnostics.py
│  │     │  │  ├─ _azure_websocket.py
│  │     │  │  ├─ _bedrock_auth.py
│  │     │  │  ├─ _files.py
│  │     │  │  ├─ _old_api.py
│  │     │  │  ├─ _parsing
│  │     │  │  │  ├─ _audio.py
│  │     │  │  │  ├─ _completions.py
│  │     │  │  │  ├─ _embeddings.py
│  │     │  │  │  ├─ _responses.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ _pydantic.py
│  │     │  │  ├─ _realtime.py
│  │     │  │  ├─ _tools.py
│  │     │  │  ├─ _tool_lifecycle.py
│  │     │  │  ├─ _vector_stores.py
│  │     │  │  ├─ _webhooks.py
│  │     │  │  ├─ _websocket.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ pagination.py
│  │     │  ├─ providers
│  │     │  │  ├─ bedrock.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ py.typed
│  │     │  ├─ resources
│  │     │  │  ├─ admin
│  │     │  │  │  ├─ admin.py
│  │     │  │  │  ├─ organization
│  │     │  │  │  │  ├─ admin_api_keys.py
│  │     │  │  │  │  ├─ audit_logs.py
│  │     │  │  │  │  ├─ certificates.py
│  │     │  │  │  │  ├─ data_retention.py
│  │     │  │  │  │  ├─ external_storage.py
│  │     │  │  │  │  ├─ groups
│  │     │  │  │  │  │  ├─ groups.py
│  │     │  │  │  │  │  ├─ roles.py
│  │     │  │  │  │  │  ├─ users.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ invites.py
│  │     │  │  │  │  ├─ organization.py
│  │     │  │  │  │  ├─ projects
│  │     │  │  │  │  │  ├─ api_keys.py
│  │     │  │  │  │  │  ├─ certificates.py
│  │     │  │  │  │  │  ├─ data_retention.py
│  │     │  │  │  │  │  ├─ groups
│  │     │  │  │  │  │  │  ├─ groups.py
│  │     │  │  │  │  │  │  ├─ roles.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ hosted_tool_permissions.py
│  │     │  │  │  │  │  ├─ model_permissions.py
│  │     │  │  │  │  │  ├─ projects.py
│  │     │  │  │  │  │  ├─ rate_limits.py
│  │     │  │  │  │  │  ├─ roles.py
│  │     │  │  │  │  │  ├─ service_accounts
│  │     │  │  │  │  │  │  ├─ api_keys.py
│  │     │  │  │  │  │  │  ├─ service_accounts.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ spend_alerts.py
│  │     │  │  │  │  │  ├─ spend_limit.py
│  │     │  │  │  │  │  ├─ users
│  │     │  │  │  │  │  │  ├─ roles.py
│  │     │  │  │  │  │  │  ├─ users.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ roles.py
│  │     │  │  │  │  ├─ spend_alerts.py
│  │     │  │  │  │  ├─ spend_limit.py
│  │     │  │  │  │  ├─ usage.py
│  │     │  │  │  │  ├─ users
│  │     │  │  │  │  │  ├─ roles.py
│  │     │  │  │  │  │  ├─ users.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ audio
│  │     │  │  │  ├─ audio.py
│  │     │  │  │  ├─ speech.py
│  │     │  │  │  ├─ transcriptions.py
│  │     │  │  │  ├─ translations.py
│  │     │  │  │  ├─ voices.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ batches.py
│  │     │  │  ├─ beta
│  │     │  │  │  ├─ agents
│  │     │  │  │  │  ├─ agents.py
│  │     │  │  │  │  ├─ environments
│  │     │  │  │  │  │  ├─ environments.py
│  │     │  │  │  │  │  ├─ files.py
│  │     │  │  │  │  │  ├─ templates.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ sessions
│  │     │  │  │  │  │  ├─ artifacts.py
│  │     │  │  │  │  │  ├─ events.py
│  │     │  │  │  │  │  ├─ items.py
│  │     │  │  │  │  │  ├─ sessions.py
│  │     │  │  │  │  │  ├─ subagents
│  │     │  │  │  │  │  │  ├─ items.py
│  │     │  │  │  │  │  │  ├─ subagents.py
│  │     │  │  │  │  │  │  ├─ turns
│  │     │  │  │  │  │  │  │  ├─ items.py
│  │     │  │  │  │  │  │  │  ├─ turns.py
│  │     │  │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ traces.py
│  │     │  │  │  │  │  ├─ turns
│  │     │  │  │  │  │  │  ├─ items.py
│  │     │  │  │  │  │  │  ├─ turns.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ vaults
│  │     │  │  │  │  │  ├─ credentials.py
│  │     │  │  │  │  │  ├─ vaults.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ assistants.py
│  │     │  │  │  ├─ beta.py
│  │     │  │  │  ├─ chatkit
│  │     │  │  │  │  ├─ chatkit.py
│  │     │  │  │  │  ├─ sessions.py
│  │     │  │  │  │  ├─ threads.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ realtime
│  │     │  │  │  │  ├─ realtime.py
│  │     │  │  │  │  ├─ sessions.py
│  │     │  │  │  │  ├─ transcription_sessions.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ responses
│  │     │  │  │  │  ├─ input_items.py
│  │     │  │  │  │  ├─ input_tokens.py
│  │     │  │  │  │  ├─ responses.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ threads
│  │     │  │  │  │  ├─ messages.py
│  │     │  │  │  │  ├─ runs
│  │     │  │  │  │  │  ├─ runs.py
│  │     │  │  │  │  │  ├─ steps.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ threads.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ chat
│  │     │  │  │  ├─ chat.py
│  │     │  │  │  ├─ completions
│  │     │  │  │  │  ├─ completions.py
│  │     │  │  │  │  ├─ messages.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ completions.py
│  │     │  │  ├─ containers
│  │     │  │  │  ├─ containers.py
│  │     │  │  │  ├─ files
│  │     │  │  │  │  ├─ content.py
│  │     │  │  │  │  ├─ files.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ content_provenance_checks.py
│  │     │  │  ├─ conversations
│  │     │  │  │  ├─ api.md
│  │     │  │  │  ├─ conversations.py
│  │     │  │  │  ├─ items.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ decisions.py
│  │     │  │  ├─ embeddings.py
│  │     │  │  ├─ evals
│  │     │  │  │  ├─ evals.py
│  │     │  │  │  ├─ runs
│  │     │  │  │  │  ├─ output_items.py
│  │     │  │  │  │  ├─ runs.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ files.py
│  │     │  │  ├─ fine_tuning
│  │     │  │  │  ├─ alpha
│  │     │  │  │  │  ├─ alpha.py
│  │     │  │  │  │  ├─ graders.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ checkpoints
│  │     │  │  │  │  ├─ checkpoints.py
│  │     │  │  │  │  ├─ permissions.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ fine_tuning.py
│  │     │  │  │  ├─ jobs
│  │     │  │  │  │  ├─ checkpoints.py
│  │     │  │  │  │  ├─ jobs.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ images.py
│  │     │  │  ├─ live
│  │     │  │  │  ├─ api.md
│  │     │  │  │  ├─ forks.py
│  │     │  │  │  ├─ live.py
│  │     │  │  │  ├─ sessions.py
│  │     │  │  │  ├─ sideband.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ models.py
│  │     │  │  ├─ moderations.py
│  │     │  │  ├─ realtime
│  │     │  │  │  ├─ api.md
│  │     │  │  │  ├─ calls.py
│  │     │  │  │  ├─ client_secrets.py
│  │     │  │  │  ├─ realtime.py
│  │     │  │  │  ├─ translations
│  │     │  │  │  │  ├─ client_secrets.py
│  │     │  │  │  │  ├─ translations.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ responses
│  │     │  │  │  ├─ api.md
│  │     │  │  │  ├─ input_items.py
│  │     │  │  │  ├─ input_tokens.py
│  │     │  │  │  ├─ responses.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ safety
│  │     │  │  │  ├─ alerts.py
│  │     │  │  │  ├─ cases.py
│  │     │  │  │  ├─ safety.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ skills
│  │     │  │  │  ├─ content.py
│  │     │  │  │  ├─ skills.py
│  │     │  │  │  ├─ versions
│  │     │  │  │  │  ├─ content.py
│  │     │  │  │  │  ├─ versions.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ uploads
│  │     │  │  │  ├─ parts.py
│  │     │  │  │  ├─ uploads.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ vector_stores
│  │     │  │  │  ├─ files.py
│  │     │  │  │  ├─ file_batches.py
│  │     │  │  │  ├─ vector_stores.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ videos.py
│  │     │  │  ├─ webhooks
│  │     │  │  │  ├─ api.md
│  │     │  │  │  ├─ event_types.py
│  │     │  │  │  ├─ webhooks.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ types
│  │     │  │  ├─ admin
│  │     │  │  │  ├─ organization
│  │     │  │  │  │  ├─ admin_api_key.py
│  │     │  │  │  │  ├─ admin_api_key_create_params.py
│  │     │  │  │  │  ├─ admin_api_key_create_response.py
│  │     │  │  │  │  ├─ admin_api_key_delete_response.py
│  │     │  │  │  │  ├─ admin_api_key_list_params.py
│  │     │  │  │  │  ├─ audit_log_list_params.py
│  │     │  │  │  │  ├─ audit_log_list_response.py
│  │     │  │  │  │  ├─ aws_external_storage_provider.py
│  │     │  │  │  │  ├─ azure_external_storage_provider.py
│  │     │  │  │  │  ├─ certificate.py
│  │     │  │  │  │  ├─ certificate_activate_params.py
│  │     │  │  │  │  ├─ certificate_activate_response.py
│  │     │  │  │  │  ├─ certificate_create_params.py
│  │     │  │  │  │  ├─ certificate_deactivate_params.py
│  │     │  │  │  │  ├─ certificate_deactivate_response.py
│  │     │  │  │  │  ├─ certificate_delete_response.py
│  │     │  │  │  │  ├─ certificate_list_params.py
│  │     │  │  │  │  ├─ certificate_list_response.py
│  │     │  │  │  │  ├─ certificate_retrieve_params.py
│  │     │  │  │  │  ├─ certificate_update_params.py
│  │     │  │  │  │  ├─ cost_quantity_unit.py
│  │     │  │  │  │  ├─ data_retention_update_params.py
│  │     │  │  │  │  ├─ external_storage_configuration.py
│  │     │  │  │  │  ├─ external_storage_create_params.py
│  │     │  │  │  │  ├─ external_storage_deleted.py
│  │     │  │  │  │  ├─ external_storage_list_params.py
│  │     │  │  │  │  ├─ gcp_external_storage_provider.py
│  │     │  │  │  │  ├─ group.py
│  │     │  │  │  │  ├─ groups
│  │     │  │  │  │  │  ├─ organization_group_user.py
│  │     │  │  │  │  │  ├─ role_create_params.py
│  │     │  │  │  │  │  ├─ role_create_response.py
│  │     │  │  │  │  │  ├─ role_delete_response.py
│  │     │  │  │  │  │  ├─ role_list_params.py
│  │     │  │  │  │  │  ├─ role_list_response.py
│  │     │  │  │  │  │  ├─ role_retrieve_response.py
│  │     │  │  │  │  │  ├─ user_create_params.py
│  │     │  │  │  │  │  ├─ user_create_response.py
│  │     │  │  │  │  │  ├─ user_delete_response.py
│  │     │  │  │  │  │  ├─ user_list_params.py
│  │     │  │  │  │  │  ├─ user_retrieve_response.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ group_create_params.py
│  │     │  │  │  │  ├─ group_delete_response.py
│  │     │  │  │  │  ├─ group_list_params.py
│  │     │  │  │  │  ├─ group_update_params.py
│  │     │  │  │  │  ├─ group_update_response.py
│  │     │  │  │  │  ├─ invite.py
│  │     │  │  │  │  ├─ invite_create_params.py
│  │     │  │  │  │  ├─ invite_delete_response.py
│  │     │  │  │  │  ├─ invite_list_params.py
│  │     │  │  │  │  ├─ oci_external_storage_provider.py
│  │     │  │  │  │  ├─ organization_data_retention.py
│  │     │  │  │  │  ├─ organization_spend_alert.py
│  │     │  │  │  │  ├─ organization_spend_alert_deleted.py
│  │     │  │  │  │  ├─ organization_spend_limit.py
│  │     │  │  │  │  ├─ organization_spend_limit_deleted.py
│  │     │  │  │  │  ├─ organization_user.py
│  │     │  │  │  │  ├─ project.py
│  │     │  │  │  │  ├─ projects
│  │     │  │  │  │  │  ├─ api_key_delete_response.py
│  │     │  │  │  │  │  ├─ api_key_list_params.py
│  │     │  │  │  │  │  ├─ api_key_update_params.py
│  │     │  │  │  │  │  ├─ certificate_activate_params.py
│  │     │  │  │  │  │  ├─ certificate_activate_response.py
│  │     │  │  │  │  │  ├─ certificate_deactivate_params.py
│  │     │  │  │  │  │  ├─ certificate_deactivate_response.py
│  │     │  │  │  │  │  ├─ certificate_list_params.py
│  │     │  │  │  │  │  ├─ certificate_list_response.py
│  │     │  │  │  │  │  ├─ data_retention_update_params.py
│  │     │  │  │  │  │  ├─ groups
│  │     │  │  │  │  │  │  ├─ role_create_params.py
│  │     │  │  │  │  │  │  ├─ role_create_response.py
│  │     │  │  │  │  │  │  ├─ role_delete_response.py
│  │     │  │  │  │  │  │  ├─ role_list_params.py
│  │     │  │  │  │  │  │  ├─ role_list_response.py
│  │     │  │  │  │  │  │  ├─ role_retrieve_response.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ group_create_params.py
│  │     │  │  │  │  │  ├─ group_delete_response.py
│  │     │  │  │  │  │  ├─ group_list_params.py
│  │     │  │  │  │  │  ├─ group_retrieve_params.py
│  │     │  │  │  │  │  ├─ hosted_tool_permission_update_params.py
│  │     │  │  │  │  │  ├─ model_permission_update_params.py
│  │     │  │  │  │  │  ├─ project_api_key.py
│  │     │  │  │  │  │  ├─ project_data_retention.py
│  │     │  │  │  │  │  ├─ project_group.py
│  │     │  │  │  │  │  ├─ project_hosted_tool_permissions.py
│  │     │  │  │  │  │  ├─ project_model_permissions.py
│  │     │  │  │  │  │  ├─ project_model_permissions_deleted.py
│  │     │  │  │  │  │  ├─ project_rate_limit.py
│  │     │  │  │  │  │  ├─ project_service_account.py
│  │     │  │  │  │  │  ├─ project_spend_alert.py
│  │     │  │  │  │  │  ├─ project_spend_alert_deleted.py
│  │     │  │  │  │  │  ├─ project_spend_limit.py
│  │     │  │  │  │  │  ├─ project_spend_limit_deleted.py
│  │     │  │  │  │  │  ├─ project_user.py
│  │     │  │  │  │  │  ├─ rate_limit_list_rate_limits_params.py
│  │     │  │  │  │  │  ├─ rate_limit_update_rate_limit_params.py
│  │     │  │  │  │  │  ├─ role_create_params.py
│  │     │  │  │  │  │  ├─ role_delete_response.py
│  │     │  │  │  │  │  ├─ role_list_params.py
│  │     │  │  │  │  │  ├─ role_update_params.py
│  │     │  │  │  │  │  ├─ service_accounts
│  │     │  │  │  │  │  │  ├─ api_key_create_params.py
│  │     │  │  │  │  │  │  ├─ api_key_create_response.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ service_account_create_params.py
│  │     │  │  │  │  │  ├─ service_account_create_response.py
│  │     │  │  │  │  │  ├─ service_account_delete_response.py
│  │     │  │  │  │  │  ├─ service_account_list_params.py
│  │     │  │  │  │  │  ├─ service_account_update_params.py
│  │     │  │  │  │  │  ├─ spend_alert_create_params.py
│  │     │  │  │  │  │  ├─ spend_alert_list_params.py
│  │     │  │  │  │  │  ├─ spend_alert_update_params.py
│  │     │  │  │  │  │  ├─ spend_limit_update_params.py
│  │     │  │  │  │  │  ├─ users
│  │     │  │  │  │  │  │  ├─ role_create_params.py
│  │     │  │  │  │  │  │  ├─ role_create_response.py
│  │     │  │  │  │  │  │  ├─ role_delete_response.py
│  │     │  │  │  │  │  │  ├─ role_list_params.py
│  │     │  │  │  │  │  │  ├─ role_list_response.py
│  │     │  │  │  │  │  │  ├─ role_retrieve_response.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ user_create_params.py
│  │     │  │  │  │  │  ├─ user_delete_response.py
│  │     │  │  │  │  │  ├─ user_list_params.py
│  │     │  │  │  │  │  ├─ user_update_params.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ project_create_params.py
│  │     │  │  │  │  ├─ project_list_params.py
│  │     │  │  │  │  ├─ project_residency.py
│  │     │  │  │  │  ├─ project_update_params.py
│  │     │  │  │  │  ├─ role.py
│  │     │  │  │  │  ├─ role_create_params.py
│  │     │  │  │  │  ├─ role_delete_response.py
│  │     │  │  │  │  ├─ role_list_params.py
│  │     │  │  │  │  ├─ role_update_params.py
│  │     │  │  │  │  ├─ spend_alert_create_params.py
│  │     │  │  │  │  ├─ spend_alert_list_params.py
│  │     │  │  │  │  ├─ spend_alert_update_params.py
│  │     │  │  │  │  ├─ spend_limit_update_params.py
│  │     │  │  │  │  ├─ usage_audio_speeches_params.py
│  │     │  │  │  │  ├─ usage_audio_speeches_response.py
│  │     │  │  │  │  ├─ usage_audio_transcriptions_params.py
│  │     │  │  │  │  ├─ usage_audio_transcriptions_response.py
│  │     │  │  │  │  ├─ usage_code_interpreter_sessions_params.py
│  │     │  │  │  │  ├─ usage_code_interpreter_sessions_response.py
│  │     │  │  │  │  ├─ usage_completions_params.py
│  │     │  │  │  │  ├─ usage_completions_response.py
│  │     │  │  │  │  ├─ usage_costs_params.py
│  │     │  │  │  │  ├─ usage_costs_response.py
│  │     │  │  │  │  ├─ usage_decisions_params.py
│  │     │  │  │  │  ├─ usage_decisions_response.py
│  │     │  │  │  │  ├─ usage_embeddings_params.py
│  │     │  │  │  │  ├─ usage_embeddings_response.py
│  │     │  │  │  │  ├─ usage_file_search_calls_params.py
│  │     │  │  │  │  ├─ usage_file_search_calls_response.py
│  │     │  │  │  │  ├─ usage_images_params.py
│  │     │  │  │  │  ├─ usage_images_response.py
│  │     │  │  │  │  ├─ usage_moderations_params.py
│  │     │  │  │  │  ├─ usage_moderations_response.py
│  │     │  │  │  │  ├─ usage_vector_stores_params.py
│  │     │  │  │  │  ├─ usage_vector_stores_response.py
│  │     │  │  │  │  ├─ usage_web_search_calls_params.py
│  │     │  │  │  │  ├─ usage_web_search_calls_response.py
│  │     │  │  │  │  ├─ users
│  │     │  │  │  │  │  ├─ role_create_params.py
│  │     │  │  │  │  │  ├─ role_create_response.py
│  │     │  │  │  │  │  ├─ role_delete_response.py
│  │     │  │  │  │  │  ├─ role_list_params.py
│  │     │  │  │  │  │  ├─ role_list_response.py
│  │     │  │  │  │  │  ├─ role_retrieve_response.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ user_delete_response.py
│  │     │  │  │  │  ├─ user_list_params.py
│  │     │  │  │  │  ├─ user_update_params.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ audio
│  │     │  │  │  ├─ speech_create_params.py
│  │     │  │  │  ├─ speech_model.py
│  │     │  │  │  ├─ transcription.py
│  │     │  │  │  ├─ transcription_create_params.py
│  │     │  │  │  ├─ transcription_create_response.py
│  │     │  │  │  ├─ transcription_diarized.py
│  │     │  │  │  ├─ transcription_diarized_segment.py
│  │     │  │  │  ├─ transcription_include.py
│  │     │  │  │  ├─ transcription_language.py
│  │     │  │  │  ├─ transcription_segment.py
│  │     │  │  │  ├─ transcription_stream_event.py
│  │     │  │  │  ├─ transcription_text_delta_event.py
│  │     │  │  │  ├─ transcription_text_done_event.py
│  │     │  │  │  ├─ transcription_text_segment_event.py
│  │     │  │  │  ├─ transcription_verbose.py
│  │     │  │  │  ├─ transcription_word.py
│  │     │  │  │  ├─ translation.py
│  │     │  │  │  ├─ translation_create_params.py
│  │     │  │  │  ├─ translation_create_response.py
│  │     │  │  │  ├─ translation_verbose.py
│  │     │  │  │  ├─ voice.py
│  │     │  │  │  ├─ voice_create_params.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ audio_model.py
│  │     │  │  ├─ audio_response_format.py
│  │     │  │  ├─ auto_file_chunking_strategy_param.py
│  │     │  │  ├─ batch.py
│  │     │  │  ├─ batch_create_params.py
│  │     │  │  ├─ batch_error.py
│  │     │  │  ├─ batch_list_params.py
│  │     │  │  ├─ batch_request_counts.py
│  │     │  │  ├─ batch_usage.py
│  │     │  │  ├─ beta
│  │     │  │  │  ├─ agent.py
│  │     │  │  │  ├─ agents
│  │     │  │  │  │  ├─ environments
│  │     │  │  │  │  │  ├─ environment_file.py
│  │     │  │  │  │  │  ├─ environment_template.py
│  │     │  │  │  │  │  ├─ environment_template_deleted.py
│  │     │  │  │  │  │  ├─ file_create_params.py
│  │     │  │  │  │  │  ├─ file_list_params.py
│  │     │  │  │  │  │  ├─ template_create_params.py
│  │     │  │  │  │  │  ├─ template_list_params.py
│  │     │  │  │  │  │  ├─ template_update_params.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ environment_create_params.py
│  │     │  │  │  │  ├─ environment_info.py
│  │     │  │  │  │  ├─ environment_list_params.py
│  │     │  │  │  │  ├─ sessions
│  │     │  │  │  │  │  ├─ artifact_list_params.py
│  │     │  │  │  │  │  ├─ event_create_params.py
│  │     │  │  │  │  │  ├─ item_list_params.py
│  │     │  │  │  │  │  ├─ session_artifact.py
│  │     │  │  │  │  │  ├─ session_artifact_deleted.py
│  │     │  │  │  │  │  ├─ session_trace.py
│  │     │  │  │  │  │  ├─ subagents
│  │     │  │  │  │  │  │  ├─ item_list_params.py
│  │     │  │  │  │  │  │  ├─ turns
│  │     │  │  │  │  │  │  │  ├─ item_list_params.py
│  │     │  │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  │  ├─ turn_list_params.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ subagent_list_params.py
│  │     │  │  │  │  │  ├─ trace_list_params.py
│  │     │  │  │  │  │  ├─ turn.py
│  │     │  │  │  │  │  ├─ turns
│  │     │  │  │  │  │  │  ├─ item_list_params.py
│  │     │  │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  │  ├─ turn_list_params.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ session_create_params.py
│  │     │  │  │  │  ├─ session_list_params.py
│  │     │  │  │  │  ├─ session_update_params.py
│  │     │  │  │  │  ├─ vault.py
│  │     │  │  │  │  ├─ vaults
│  │     │  │  │  │  │  ├─ credential.py
│  │     │  │  │  │  │  ├─ credential_auth.py
│  │     │  │  │  │  │  ├─ credential_auth_create_param.py
│  │     │  │  │  │  │  ├─ credential_auth_rotate_param.py
│  │     │  │  │  │  │  ├─ credential_create_params.py
│  │     │  │  │  │  │  ├─ credential_deleted.py
│  │     │  │  │  │  │  ├─ credential_list_params.py
│  │     │  │  │  │  │  ├─ credential_networking.py
│  │     │  │  │  │  │  ├─ credential_networking_param.py
│  │     │  │  │  │  │  ├─ credential_update_params.py
│  │     │  │  │  │  │  ├─ mcp_oauth_token_endpoint_auth.py
│  │     │  │  │  │  │  ├─ mcp_oauth_token_endpoint_auth_create_param.py
│  │     │  │  │  │  │  ├─ mcp_oauth_token_endpoint_auth_rotate_param.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ vault_create_params.py
│  │     │  │  │  │  ├─ vault_deleted.py
│  │     │  │  │  │  ├─ vault_list_params.py
│  │     │  │  │  │  ├─ vault_status.py
│  │     │  │  │  │  ├─ vault_status_filter_param.py
│  │     │  │  │  │  ├─ vault_update_params.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ agent_browser_authentication_cancel_param.py
│  │     │  │  │  ├─ agent_browser_authentication_cancel_param_param.py
│  │     │  │  │  ├─ agent_browser_authentication_submit_param.py
│  │     │  │  │  ├─ agent_browser_authentication_submit_param_param.py
│  │     │  │  │  ├─ agent_browser_origin_access_param.py
│  │     │  │  │  ├─ agent_browser_origin_access_param_param.py
│  │     │  │  │  ├─ agent_close_subagent_call_item.py
│  │     │  │  │  ├─ agent_command_execution_item.py
│  │     │  │  │  ├─ agent_content.py
│  │     │  │  │  ├─ agent_create_params.py
│  │     │  │  │  ├─ agent_create_subagent_call_item.py
│  │     │  │  │  ├─ agent_deleted.py
│  │     │  │  │  ├─ agent_function_call_item.py
│  │     │  │  │  ├─ agent_function_call_output.py
│  │     │  │  │  ├─ agent_function_call_output_param.py
│  │     │  │  │  ├─ agent_function_call_status.py
│  │     │  │  │  ├─ agent_interrupt_subagent_call_item.py
│  │     │  │  │  ├─ agent_list_params.py
│  │     │  │  │  ├─ agent_mcp_call_item.py
│  │     │  │  │  ├─ agent_output_command_execution_output_delta_event.py
│  │     │  │  │  ├─ agent_output_item.py
│  │     │  │  │  ├─ agent_output_item_status.py
│  │     │  │  │  ├─ agent_reasoning.py
│  │     │  │  │  ├─ agent_reasoning_item.py
│  │     │  │  │  ├─ agent_reasoning_param.py
│  │     │  │  │  ├─ agent_resume_subagent_call_item.py
│  │     │  │  │  ├─ agent_send_subagent_input_call_item.py
│  │     │  │  │  ├─ agent_session.py
│  │     │  │  │  ├─ agent_session_assistant_message.py
│  │     │  │  │  ├─ agent_session_created_event.py
│  │     │  │  │  ├─ agent_session_deleted.py
│  │     │  │  │  ├─ agent_session_environment_connected_event.py
│  │     │  │  │  ├─ agent_session_environment_disconnected_event.py
│  │     │  │  │  ├─ agent_session_environment_expired_event.py
│  │     │  │  │  ├─ agent_session_environment_failed_event.py
│  │     │  │  │  ├─ agent_session_environment_pending_event.py
│  │     │  │  │  ├─ agent_session_environment_ready_event.py
│  │     │  │  │  ├─ agent_session_environment_reset_event.py
│  │     │  │  │  ├─ agent_session_environment_state.py
│  │     │  │  │  ├─ agent_session_environment_suspended_event.py
│  │     │  │  │  ├─ agent_session_error_event.py
│  │     │  │  │  ├─ agent_session_event.py
│  │     │  │  │  ├─ agent_session_failed_event.py
│  │     │  │  │  ├─ agent_session_idle_event.py
│  │     │  │  │  ├─ agent_session_input_message_param.py
│  │     │  │  │  ├─ agent_session_input_param.py
│  │     │  │  │  ├─ agent_session_in_progress_event.py
│  │     │  │  │  ├─ agent_session_item.py
│  │     │  │  │  ├─ agent_session_message.py
│  │     │  │  │  ├─ agent_session_message_content.py
│  │     │  │  │  ├─ agent_session_requires_action_event.py
│  │     │  │  │  ├─ agent_session_subagent_active_event.py
│  │     │  │  │  ├─ agent_session_subagent_closed_event.py
│  │     │  │  │  ├─ agent_session_subagent_created_event.py
│  │     │  │  │  ├─ agent_session_turn_cancelled_event.py
│  │     │  │  │  ├─ agent_session_turn_completed_event.py
│  │     │  │  │  ├─ agent_session_turn_content_part_added_event.py
│  │     │  │  │  ├─ agent_session_turn_content_part_done_event.py
│  │     │  │  │  ├─ agent_session_turn_created_event.py
│  │     │  │  │  ├─ agent_session_turn_failed_event.py
│  │     │  │  │  ├─ agent_session_turn_in_progress_event.py
│  │     │  │  │  ├─ agent_session_turn_item_added_event.py
│  │     │  │  │  ├─ agent_session_turn_item_done_event.py
│  │     │  │  │  ├─ agent_session_turn_output_text_delta_event.py
│  │     │  │  │  ├─ agent_session_turn_output_text_done_event.py
│  │     │  │  │  ├─ agent_session_turn_reasoning_summary_part_added_event.py
│  │     │  │  │  ├─ agent_session_turn_reasoning_summary_part_done_event.py
│  │     │  │  │  ├─ agent_session_turn_reasoning_summary_text_delta_event.py
│  │     │  │  │  ├─ agent_session_turn_reasoning_summary_text_done_event.py
│  │     │  │  │  ├─ agent_text.py
│  │     │  │  │  ├─ agent_text_param.py
│  │     │  │  │  ├─ agent_tool.py
│  │     │  │  │  ├─ agent_tool_param.py
│  │     │  │  │  ├─ agent_update_params.py
│  │     │  │  │  ├─ agent_wait_for_subagents_call_item.py
│  │     │  │  │  ├─ agent_web_search_call_item.py
│  │     │  │  │  ├─ assistant.py
│  │     │  │  │  ├─ assistant_create_params.py
│  │     │  │  │  ├─ assistant_deleted.py
│  │     │  │  │  ├─ assistant_list_params.py
│  │     │  │  │  ├─ assistant_response_format_option.py
│  │     │  │  │  ├─ assistant_response_format_option_param.py
│  │     │  │  │  ├─ assistant_stream_event.py
│  │     │  │  │  ├─ assistant_tool.py
│  │     │  │  │  ├─ assistant_tool_choice.py
│  │     │  │  │  ├─ assistant_tool_choice_function.py
│  │     │  │  │  ├─ assistant_tool_choice_function_param.py
│  │     │  │  │  ├─ assistant_tool_choice_option.py
│  │     │  │  │  ├─ assistant_tool_choice_option_param.py
│  │     │  │  │  ├─ assistant_tool_choice_param.py
│  │     │  │  │  ├─ assistant_tool_param.py
│  │     │  │  │  ├─ assistant_update_params.py
│  │     │  │  │  ├─ beta_apply_patch_tool.py
│  │     │  │  │  ├─ beta_apply_patch_tool_param.py
│  │     │  │  │  ├─ beta_compacted_response.py
│  │     │  │  │  ├─ beta_computer_action.py
│  │     │  │  │  ├─ beta_computer_action_list.py
│  │     │  │  │  ├─ beta_computer_action_list_param.py
│  │     │  │  │  ├─ beta_computer_action_param.py
│  │     │  │  │  ├─ beta_computer_tool.py
│  │     │  │  │  ├─ beta_computer_tool_param.py
│  │     │  │  │  ├─ beta_computer_use_preview_tool.py
│  │     │  │  │  ├─ beta_computer_use_preview_tool_param.py
│  │     │  │  │  ├─ beta_container_auto.py
│  │     │  │  │  ├─ beta_container_auto_param.py
│  │     │  │  │  ├─ beta_container_network_policy_allowlist.py
│  │     │  │  │  ├─ beta_container_network_policy_allowlist_param.py
│  │     │  │  │  ├─ beta_container_network_policy_disabled.py
│  │     │  │  │  ├─ beta_container_network_policy_disabled_param.py
│  │     │  │  │  ├─ beta_container_network_policy_domain_secret.py
│  │     │  │  │  ├─ beta_container_network_policy_domain_secret_param.py
│  │     │  │  │  ├─ beta_container_reference.py
│  │     │  │  │  ├─ beta_container_reference_param.py
│  │     │  │  │  ├─ beta_custom_tool.py
│  │     │  │  │  ├─ beta_custom_tool_param.py
│  │     │  │  │  ├─ beta_easy_input_message.py
│  │     │  │  │  ├─ beta_easy_input_message_param.py
│  │     │  │  │  ├─ beta_file_search_tool.py
│  │     │  │  │  ├─ beta_file_search_tool_param.py
│  │     │  │  │  ├─ beta_function_shell_tool.py
│  │     │  │  │  ├─ beta_function_shell_tool_param.py
│  │     │  │  │  ├─ beta_function_tool.py
│  │     │  │  │  ├─ beta_function_tool_param.py
│  │     │  │  │  ├─ beta_image_detail.py
│  │     │  │  │  ├─ beta_inline_skill.py
│  │     │  │  │  ├─ beta_inline_skill_param.py
│  │     │  │  │  ├─ beta_inline_skill_source.py
│  │     │  │  │  ├─ beta_inline_skill_source_param.py
│  │     │  │  │  ├─ beta_local_environment.py
│  │     │  │  │  ├─ beta_local_environment_param.py
│  │     │  │  │  ├─ beta_local_skill.py
│  │     │  │  │  ├─ beta_local_skill_param.py
│  │     │  │  │  ├─ beta_mcp_tool_call_error.py
│  │     │  │  │  ├─ beta_mcp_tool_call_error_param.py
│  │     │  │  │  ├─ beta_namespace_tool.py
│  │     │  │  │  ├─ beta_namespace_tool_param.py
│  │     │  │  │  ├─ beta_response.py
│  │     │  │  │  ├─ beta_responses_client_event.py
│  │     │  │  │  ├─ beta_responses_client_event_param.py
│  │     │  │  │  ├─ beta_responses_server_event.py
│  │     │  │  │  ├─ beta_response_apply_patch_tool_call.py
│  │     │  │  │  ├─ beta_response_apply_patch_tool_call_output.py
│  │     │  │  │  ├─ beta_response_audio_delta_event.py
│  │     │  │  │  ├─ beta_response_audio_done_event.py
│  │     │  │  │  ├─ beta_response_audio_transcript_delta_event.py
│  │     │  │  │  ├─ beta_response_audio_transcript_done_event.py
│  │     │  │  │  ├─ beta_response_code_interpreter_call_code_delta_event.py
│  │     │  │  │  ├─ beta_response_code_interpreter_call_code_done_event.py
│  │     │  │  │  ├─ beta_response_code_interpreter_call_completed_event.py
│  │     │  │  │  ├─ beta_response_code_interpreter_call_interpreting_event.py
│  │     │  │  │  ├─ beta_response_code_interpreter_call_in_progress_event.py
│  │     │  │  │  ├─ beta_response_code_interpreter_tool_call.py
│  │     │  │  │  ├─ beta_response_code_interpreter_tool_call_param.py
│  │     │  │  │  ├─ beta_response_compaction_compacting_event.py
│  │     │  │  │  ├─ beta_response_compaction_item.py
│  │     │  │  │  ├─ beta_response_compaction_item_param.py
│  │     │  │  │  ├─ beta_response_compaction_item_param_param.py
│  │     │  │  │  ├─ beta_response_completed_event.py
│  │     │  │  │  ├─ beta_response_computer_tool_call.py
│  │     │  │  │  ├─ beta_response_computer_tool_call_output_item.py
│  │     │  │  │  ├─ beta_response_computer_tool_call_output_screenshot.py
│  │     │  │  │  ├─ beta_response_computer_tool_call_output_screenshot_param.py
│  │     │  │  │  ├─ beta_response_computer_tool_call_param.py
│  │     │  │  │  ├─ beta_response_configuration_update_item.py
│  │     │  │  │  ├─ beta_response_configuration_update_item_param.py
│  │     │  │  │  ├─ beta_response_configuration_update_item_param_param.py
│  │     │  │  │  ├─ beta_response_container_reference.py
│  │     │  │  │  ├─ beta_response_content_part_added_event.py
│  │     │  │  │  ├─ beta_response_content_part_done_event.py
│  │     │  │  │  ├─ beta_response_conversation_param.py
│  │     │  │  │  ├─ beta_response_conversation_param_param.py
│  │     │  │  │  ├─ beta_response_created_event.py
│  │     │  │  │  ├─ beta_response_custom_tool_call.py
│  │     │  │  │  ├─ beta_response_custom_tool_call_input_delta_event.py
│  │     │  │  │  ├─ beta_response_custom_tool_call_input_done_event.py
│  │     │  │  │  ├─ beta_response_custom_tool_call_item.py
│  │     │  │  │  ├─ beta_response_custom_tool_call_output.py
│  │     │  │  │  ├─ beta_response_custom_tool_call_output_item.py
│  │     │  │  │  ├─ beta_response_custom_tool_call_output_param.py
│  │     │  │  │  ├─ beta_response_custom_tool_call_param.py
│  │     │  │  │  ├─ beta_response_error.py
│  │     │  │  │  ├─ beta_response_error_event.py
│  │     │  │  │  ├─ beta_response_failed_event.py
│  │     │  │  │  ├─ beta_response_file_search_call_completed_event.py
│  │     │  │  │  ├─ beta_response_file_search_call_in_progress_event.py
│  │     │  │  │  ├─ beta_response_file_search_call_searching_event.py
│  │     │  │  │  ├─ beta_response_file_search_tool_call.py
│  │     │  │  │  ├─ beta_response_file_search_tool_call_param.py
│  │     │  │  │  ├─ beta_response_format_text_config.py
│  │     │  │  │  ├─ beta_response_format_text_config_param.py
│  │     │  │  │  ├─ beta_response_format_text_json_schema_config.py
│  │     │  │  │  ├─ beta_response_format_text_json_schema_config_param.py
│  │     │  │  │  ├─ beta_response_function_call_arguments_delta_event.py
│  │     │  │  │  ├─ beta_response_function_call_arguments_done_event.py
│  │     │  │  │  ├─ beta_response_function_call_output_item.py
│  │     │  │  │  ├─ beta_response_function_call_output_item_list.py
│  │     │  │  │  ├─ beta_response_function_call_output_item_list_param.py
│  │     │  │  │  ├─ beta_response_function_call_output_item_param.py
│  │     │  │  │  ├─ beta_response_function_shell_call_output_content.py
│  │     │  │  │  ├─ beta_response_function_shell_call_output_content_param.py
│  │     │  │  │  ├─ beta_response_function_shell_tool_call.py
│  │     │  │  │  ├─ beta_response_function_shell_tool_call_output.py
│  │     │  │  │  ├─ beta_response_function_tool_call.py
│  │     │  │  │  ├─ beta_response_function_tool_call_item.py
│  │     │  │  │  ├─ beta_response_function_tool_call_output_item.py
│  │     │  │  │  ├─ beta_response_function_tool_call_param.py
│  │     │  │  │  ├─ beta_response_function_web_search.py
│  │     │  │  │  ├─ beta_response_function_web_search_param.py
│  │     │  │  │  ├─ beta_response_image_gen_call_completed_event.py
│  │     │  │  │  ├─ beta_response_image_gen_call_generating_event.py
│  │     │  │  │  ├─ beta_response_image_gen_call_in_progress_event.py
│  │     │  │  │  ├─ beta_response_image_gen_call_partial_image_event.py
│  │     │  │  │  ├─ beta_response_includable.py
│  │     │  │  │  ├─ beta_response_incomplete_event.py
│  │     │  │  │  ├─ beta_response_inject_created_event.py
│  │     │  │  │  ├─ beta_response_inject_event.py
│  │     │  │  │  ├─ beta_response_inject_event_param.py
│  │     │  │  │  ├─ beta_response_inject_failed_event.py
│  │     │  │  │  ├─ beta_response_input.py
│  │     │  │  │  ├─ beta_response_input_content.py
│  │     │  │  │  ├─ beta_response_input_content_param.py
│  │     │  │  │  ├─ beta_response_input_file.py
│  │     │  │  │  ├─ beta_response_input_file_content.py
│  │     │  │  │  ├─ beta_response_input_file_content_param.py
│  │     │  │  │  ├─ beta_response_input_file_param.py
│  │     │  │  │  ├─ beta_response_input_image.py
│  │     │  │  │  ├─ beta_response_input_image_content.py
│  │     │  │  │  ├─ beta_response_input_image_content_param.py
│  │     │  │  │  ├─ beta_response_input_image_param.py
│  │     │  │  │  ├─ beta_response_input_item.py
│  │     │  │  │  ├─ beta_response_input_item_param.py
│  │     │  │  │  ├─ beta_response_input_message_content_list.py
│  │     │  │  │  ├─ beta_response_input_message_content_list_param.py
│  │     │  │  │  ├─ beta_response_input_message_item.py
│  │     │  │  │  ├─ beta_response_input_param.py
│  │     │  │  │  ├─ beta_response_input_text.py
│  │     │  │  │  ├─ beta_response_input_text_content.py
│  │     │  │  │  ├─ beta_response_input_text_content_param.py
│  │     │  │  │  ├─ beta_response_input_text_param.py
│  │     │  │  │  ├─ beta_response_in_progress_event.py
│  │     │  │  │  ├─ beta_response_item.py
│  │     │  │  │  ├─ beta_response_local_environment.py
│  │     │  │  │  ├─ beta_response_mcp_call_arguments_delta_event.py
│  │     │  │  │  ├─ beta_response_mcp_call_arguments_done_event.py
│  │     │  │  │  ├─ beta_response_mcp_call_completed_event.py
│  │     │  │  │  ├─ beta_response_mcp_call_failed_event.py
│  │     │  │  │  ├─ beta_response_mcp_call_in_progress_event.py
│  │     │  │  │  ├─ beta_response_mcp_list_tools_completed_event.py
│  │     │  │  │  ├─ beta_response_mcp_list_tools_failed_event.py
│  │     │  │  │  ├─ beta_response_mcp_list_tools_in_progress_event.py
│  │     │  │  │  ├─ beta_response_output_item.py
│  │     │  │  │  ├─ beta_response_output_item_added_event.py
│  │     │  │  │  ├─ beta_response_output_item_done_event.py
│  │     │  │  │  ├─ beta_response_output_message.py
│  │     │  │  │  ├─ beta_response_output_message_param.py
│  │     │  │  │  ├─ beta_response_output_refusal.py
│  │     │  │  │  ├─ beta_response_output_refusal_param.py
│  │     │  │  │  ├─ beta_response_output_text.py
│  │     │  │  │  ├─ beta_response_output_text_annotation_added_event.py
│  │     │  │  │  ├─ beta_response_output_text_param.py
│  │     │  │  │  ├─ beta_response_prompt.py
│  │     │  │  │  ├─ beta_response_prompt_param.py
│  │     │  │  │  ├─ beta_response_queued_event.py
│  │     │  │  │  ├─ beta_response_reasoning_item.py
│  │     │  │  │  ├─ beta_response_reasoning_item_param.py
│  │     │  │  │  ├─ beta_response_reasoning_summary_part_added_event.py
│  │     │  │  │  ├─ beta_response_reasoning_summary_part_done_event.py
│  │     │  │  │  ├─ beta_response_reasoning_summary_text_delta_event.py
│  │     │  │  │  ├─ beta_response_reasoning_summary_text_done_event.py
│  │     │  │  │  ├─ beta_response_reasoning_text_delta_event.py
│  │     │  │  │  ├─ beta_response_reasoning_text_done_event.py
│  │     │  │  │  ├─ beta_response_refusal_delta_event.py
│  │     │  │  │  ├─ beta_response_refusal_done_event.py
│  │     │  │  │  ├─ beta_response_shell_call_command_added_event.py
│  │     │  │  │  ├─ beta_response_shell_call_command_delta_event.py
│  │     │  │  │  ├─ beta_response_shell_call_command_done_event.py
│  │     │  │  │  ├─ beta_response_shell_call_output_content_delta_event.py
│  │     │  │  │  ├─ beta_response_shell_call_output_content_done_event.py
│  │     │  │  │  ├─ beta_response_status.py
│  │     │  │  │  ├─ beta_response_steer_accepted_event.py
│  │     │  │  │  ├─ beta_response_steer_error_code.py
│  │     │  │  │  ├─ beta_response_steer_event.py
│  │     │  │  │  ├─ beta_response_steer_event_param.py
│  │     │  │  │  ├─ beta_response_steer_failed_event.py
│  │     │  │  │  ├─ beta_response_steer_input.py
│  │     │  │  │  ├─ beta_response_steer_input_content.py
│  │     │  │  │  ├─ beta_response_steer_input_content_param.py
│  │     │  │  │  ├─ beta_response_steer_input_param.py
│  │     │  │  │  ├─ beta_response_steer_pending_event.py
│  │     │  │  │  ├─ beta_response_steer_pending_reason.py
│  │     │  │  │  ├─ beta_response_steer_required_input.py
│  │     │  │  │  ├─ beta_response_stream_event.py
│  │     │  │  │  ├─ beta_response_text_config.py
│  │     │  │  │  ├─ beta_response_text_config_param.py
│  │     │  │  │  ├─ beta_response_text_delta_event.py
│  │     │  │  │  ├─ beta_response_text_done_event.py
│  │     │  │  │  ├─ beta_response_tool_search_call.py
│  │     │  │  │  ├─ beta_response_tool_search_output_item.py
│  │     │  │  │  ├─ beta_response_tool_search_output_item_param.py
│  │     │  │  │  ├─ beta_response_tool_search_output_item_param_param.py
│  │     │  │  │  ├─ beta_response_usage.py
│  │     │  │  │  ├─ beta_response_web_search_call_completed_event.py
│  │     │  │  │  ├─ beta_response_web_search_call_in_progress_event.py
│  │     │  │  │  ├─ beta_response_web_search_call_searching_event.py
│  │     │  │  │  ├─ beta_service_tier.py
│  │     │  │  │  ├─ beta_skill_reference.py
│  │     │  │  │  ├─ beta_skill_reference_param.py
│  │     │  │  │  ├─ beta_tool.py
│  │     │  │  │  ├─ beta_tool_choice_allowed.py
│  │     │  │  │  ├─ beta_tool_choice_allowed_param.py
│  │     │  │  │  ├─ beta_tool_choice_apply_patch.py
│  │     │  │  │  ├─ beta_tool_choice_apply_patch_param.py
│  │     │  │  │  ├─ beta_tool_choice_custom.py
│  │     │  │  │  ├─ beta_tool_choice_custom_param.py
│  │     │  │  │  ├─ beta_tool_choice_function.py
│  │     │  │  │  ├─ beta_tool_choice_function_param.py
│  │     │  │  │  ├─ beta_tool_choice_mcp.py
│  │     │  │  │  ├─ beta_tool_choice_mcp_param.py
│  │     │  │  │  ├─ beta_tool_choice_options.py
│  │     │  │  │  ├─ beta_tool_choice_shell.py
│  │     │  │  │  ├─ beta_tool_choice_shell_param.py
│  │     │  │  │  ├─ beta_tool_choice_types.py
│  │     │  │  │  ├─ beta_tool_choice_types_param.py
│  │     │  │  │  ├─ beta_tool_param.py
│  │     │  │  │  ├─ beta_tool_search_output_namespace_tool.py
│  │     │  │  │  ├─ beta_tool_search_output_namespace_tool_param.py
│  │     │  │  │  ├─ beta_tool_search_tool.py
│  │     │  │  │  ├─ beta_tool_search_tool_param.py
│  │     │  │  │  ├─ beta_web_search_preview_tool.py
│  │     │  │  │  ├─ beta_web_search_preview_tool_param.py
│  │     │  │  │  ├─ beta_web_search_tool.py
│  │     │  │  │  ├─ beta_web_search_tool_param.py
│  │     │  │  │  ├─ chat
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ chatkit
│  │     │  │  │  │  ├─ chatkit_attachment.py
│  │     │  │  │  │  ├─ chatkit_response_output_text.py
│  │     │  │  │  │  ├─ chatkit_thread.py
│  │     │  │  │  │  ├─ chatkit_thread_assistant_message_item.py
│  │     │  │  │  │  ├─ chatkit_thread_item_list.py
│  │     │  │  │  │  ├─ chatkit_thread_user_message_item.py
│  │     │  │  │  │  ├─ chatkit_widget_item.py
│  │     │  │  │  │  ├─ chat_session.py
│  │     │  │  │  │  ├─ chat_session_automatic_thread_titling.py
│  │     │  │  │  │  ├─ chat_session_chatkit_configuration.py
│  │     │  │  │  │  ├─ chat_session_chatkit_configuration_param.py
│  │     │  │  │  │  ├─ chat_session_expires_after_param.py
│  │     │  │  │  │  ├─ chat_session_file_upload.py
│  │     │  │  │  │  ├─ chat_session_history.py
│  │     │  │  │  │  ├─ chat_session_rate_limits.py
│  │     │  │  │  │  ├─ chat_session_rate_limits_param.py
│  │     │  │  │  │  ├─ chat_session_status.py
│  │     │  │  │  │  ├─ chat_session_workflow_param.py
│  │     │  │  │  │  ├─ session_create_params.py
│  │     │  │  │  │  ├─ thread_delete_response.py
│  │     │  │  │  │  ├─ thread_list_items_params.py
│  │     │  │  │  │  ├─ thread_list_params.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ chatkit_workflow.py
│  │     │  │  │  ├─ code_interpreter_tool.py
│  │     │  │  │  ├─ code_interpreter_tool_param.py
│  │     │  │  │  ├─ environment.py
│  │     │  │  │  ├─ environment_param.py
│  │     │  │  │  ├─ file_search_tool.py
│  │     │  │  │  ├─ file_search_tool_param.py
│  │     │  │  │  ├─ function_tool.py
│  │     │  │  │  ├─ function_tool_param.py
│  │     │  │  │  ├─ hosted_environment_file.py
│  │     │  │  │  ├─ hosted_environment_file_id.py
│  │     │  │  │  ├─ hosted_environment_file_param.py
│  │     │  │  │  ├─ hosted_plugin.py
│  │     │  │  │  ├─ hosted_plugin_param.py
│  │     │  │  │  ├─ hosted_skill.py
│  │     │  │  │  ├─ hosted_skill_param.py
│  │     │  │  │  ├─ hosted_skill_reference.py
│  │     │  │  │  ├─ inline_capability_source_param.py
│  │     │  │  │  ├─ input_content.py
│  │     │  │  │  ├─ input_content_param.py
│  │     │  │  │  ├─ mcp_transport.py
│  │     │  │  │  ├─ mcp_transport_param.py
│  │     │  │  │  ├─ multi_agent_config.py
│  │     │  │  │  ├─ multi_agent_config_param.py
│  │     │  │  │  ├─ output_text.py
│  │     │  │  │  ├─ persisted_agent_tool.py
│  │     │  │  │  ├─ persisted_agent_tool_param.py
│  │     │  │  │  ├─ persisted_mcp_transport.py
│  │     │  │  │  ├─ persisted_mcp_transport_param.py
│  │     │  │  │  ├─ realtime
│  │     │  │  │  │  ├─ conversation_created_event.py
│  │     │  │  │  │  ├─ conversation_item.py
│  │     │  │  │  │  ├─ conversation_item_content.py
│  │     │  │  │  │  ├─ conversation_item_content_param.py
│  │     │  │  │  │  ├─ conversation_item_created_event.py
│  │     │  │  │  │  ├─ conversation_item_create_event.py
│  │     │  │  │  │  ├─ conversation_item_create_event_param.py
│  │     │  │  │  │  ├─ conversation_item_deleted_event.py
│  │     │  │  │  │  ├─ conversation_item_delete_event.py
│  │     │  │  │  │  ├─ conversation_item_delete_event_param.py
│  │     │  │  │  │  ├─ conversation_item_input_audio_transcription_completed_event.py
│  │     │  │  │  │  ├─ conversation_item_input_audio_transcription_delta_event.py
│  │     │  │  │  │  ├─ conversation_item_input_audio_transcription_failed_event.py
│  │     │  │  │  │  ├─ conversation_item_param.py
│  │     │  │  │  │  ├─ conversation_item_retrieve_event.py
│  │     │  │  │  │  ├─ conversation_item_retrieve_event_param.py
│  │     │  │  │  │  ├─ conversation_item_truncated_event.py
│  │     │  │  │  │  ├─ conversation_item_truncate_event.py
│  │     │  │  │  │  ├─ conversation_item_truncate_event_param.py
│  │     │  │  │  │  ├─ conversation_item_with_reference.py
│  │     │  │  │  │  ├─ conversation_item_with_reference_param.py
│  │     │  │  │  │  ├─ error_event.py
│  │     │  │  │  │  ├─ input_audio_buffer_append_event.py
│  │     │  │  │  │  ├─ input_audio_buffer_append_event_param.py
│  │     │  │  │  │  ├─ input_audio_buffer_cleared_event.py
│  │     │  │  │  │  ├─ input_audio_buffer_clear_event.py
│  │     │  │  │  │  ├─ input_audio_buffer_clear_event_param.py
│  │     │  │  │  │  ├─ input_audio_buffer_committed_event.py
│  │     │  │  │  │  ├─ input_audio_buffer_commit_event.py
│  │     │  │  │  │  ├─ input_audio_buffer_commit_event_param.py
│  │     │  │  │  │  ├─ input_audio_buffer_speech_started_event.py
│  │     │  │  │  │  ├─ input_audio_buffer_speech_stopped_event.py
│  │     │  │  │  │  ├─ rate_limits_updated_event.py
│  │     │  │  │  │  ├─ realtime_client_event.py
│  │     │  │  │  │  ├─ realtime_client_event_param.py
│  │     │  │  │  │  ├─ realtime_connect_params.py
│  │     │  │  │  │  ├─ realtime_response.py
│  │     │  │  │  │  ├─ realtime_response_status.py
│  │     │  │  │  │  ├─ realtime_response_usage.py
│  │     │  │  │  │  ├─ realtime_server_event.py
│  │     │  │  │  │  ├─ response_audio_delta_event.py
│  │     │  │  │  │  ├─ response_audio_done_event.py
│  │     │  │  │  │  ├─ response_audio_transcript_delta_event.py
│  │     │  │  │  │  ├─ response_audio_transcript_done_event.py
│  │     │  │  │  │  ├─ response_cancel_event.py
│  │     │  │  │  │  ├─ response_cancel_event_param.py
│  │     │  │  │  │  ├─ response_content_part_added_event.py
│  │     │  │  │  │  ├─ response_content_part_done_event.py
│  │     │  │  │  │  ├─ response_created_event.py
│  │     │  │  │  │  ├─ response_create_event.py
│  │     │  │  │  │  ├─ response_create_event_param.py
│  │     │  │  │  │  ├─ response_done_event.py
│  │     │  │  │  │  ├─ response_function_call_arguments_delta_event.py
│  │     │  │  │  │  ├─ response_function_call_arguments_done_event.py
│  │     │  │  │  │  ├─ response_output_item_added_event.py
│  │     │  │  │  │  ├─ response_output_item_done_event.py
│  │     │  │  │  │  ├─ response_text_delta_event.py
│  │     │  │  │  │  ├─ response_text_done_event.py
│  │     │  │  │  │  ├─ session.py
│  │     │  │  │  │  ├─ session_created_event.py
│  │     │  │  │  │  ├─ session_create_params.py
│  │     │  │  │  │  ├─ session_create_response.py
│  │     │  │  │  │  ├─ session_updated_event.py
│  │     │  │  │  │  ├─ session_update_event.py
│  │     │  │  │  │  ├─ session_update_event_param.py
│  │     │  │  │  │  ├─ transcription_session.py
│  │     │  │  │  │  ├─ transcription_session_create_params.py
│  │     │  │  │  │  ├─ transcription_session_update.py
│  │     │  │  │  │  ├─ transcription_session_updated_event.py
│  │     │  │  │  │  ├─ transcription_session_update_param.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ responses
│  │     │  │  │  │  ├─ beta_response_item_list.py
│  │     │  │  │  │  ├─ input_item_list_params.py
│  │     │  │  │  │  ├─ input_token_count_params.py
│  │     │  │  │  │  ├─ input_token_count_response.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ response_compact_params.py
│  │     │  │  │  ├─ response_create_params.py
│  │     │  │  │  ├─ response_retrieve_params.py
│  │     │  │  │  ├─ session_error.py
│  │     │  │  │  ├─ session_turn_error.py
│  │     │  │  │  ├─ setup_command_param.py
│  │     │  │  │  ├─ subagent.py
│  │     │  │  │  ├─ summary_text.py
│  │     │  │  │  ├─ text_format.py
│  │     │  │  │  ├─ text_format_param.py
│  │     │  │  │  ├─ thread.py
│  │     │  │  │  ├─ threads
│  │     │  │  │  │  ├─ annotation.py
│  │     │  │  │  │  ├─ annotation_delta.py
│  │     │  │  │  │  ├─ file_citation_annotation.py
│  │     │  │  │  │  ├─ file_citation_delta_annotation.py
│  │     │  │  │  │  ├─ file_path_annotation.py
│  │     │  │  │  │  ├─ file_path_delta_annotation.py
│  │     │  │  │  │  ├─ image_file.py
│  │     │  │  │  │  ├─ image_file_content_block.py
│  │     │  │  │  │  ├─ image_file_content_block_param.py
│  │     │  │  │  │  ├─ image_file_delta.py
│  │     │  │  │  │  ├─ image_file_delta_block.py
│  │     │  │  │  │  ├─ image_file_param.py
│  │     │  │  │  │  ├─ image_url.py
│  │     │  │  │  │  ├─ image_url_content_block.py
│  │     │  │  │  │  ├─ image_url_content_block_param.py
│  │     │  │  │  │  ├─ image_url_delta.py
│  │     │  │  │  │  ├─ image_url_delta_block.py
│  │     │  │  │  │  ├─ image_url_param.py
│  │     │  │  │  │  ├─ message.py
│  │     │  │  │  │  ├─ message_content.py
│  │     │  │  │  │  ├─ message_content_delta.py
│  │     │  │  │  │  ├─ message_content_part_param.py
│  │     │  │  │  │  ├─ message_create_params.py
│  │     │  │  │  │  ├─ message_deleted.py
│  │     │  │  │  │  ├─ message_delta.py
│  │     │  │  │  │  ├─ message_delta_event.py
│  │     │  │  │  │  ├─ message_list_params.py
│  │     │  │  │  │  ├─ message_update_params.py
│  │     │  │  │  │  ├─ refusal_content_block.py
│  │     │  │  │  │  ├─ refusal_delta_block.py
│  │     │  │  │  │  ├─ required_action_function_tool_call.py
│  │     │  │  │  │  ├─ run.py
│  │     │  │  │  │  ├─ runs
│  │     │  │  │  │  │  ├─ code_interpreter_logs.py
│  │     │  │  │  │  │  ├─ code_interpreter_output_image.py
│  │     │  │  │  │  │  ├─ code_interpreter_tool_call.py
│  │     │  │  │  │  │  ├─ code_interpreter_tool_call_delta.py
│  │     │  │  │  │  │  ├─ file_search_tool_call.py
│  │     │  │  │  │  │  ├─ file_search_tool_call_delta.py
│  │     │  │  │  │  │  ├─ function_tool_call.py
│  │     │  │  │  │  │  ├─ function_tool_call_delta.py
│  │     │  │  │  │  │  ├─ message_creation_step_details.py
│  │     │  │  │  │  │  ├─ run_step.py
│  │     │  │  │  │  │  ├─ run_step_delta.py
│  │     │  │  │  │  │  ├─ run_step_delta_event.py
│  │     │  │  │  │  │  ├─ run_step_delta_message_delta.py
│  │     │  │  │  │  │  ├─ run_step_include.py
│  │     │  │  │  │  │  ├─ step_list_params.py
│  │     │  │  │  │  │  ├─ step_retrieve_params.py
│  │     │  │  │  │  │  ├─ tool_call.py
│  │     │  │  │  │  │  ├─ tool_calls_step_details.py
│  │     │  │  │  │  │  ├─ tool_call_delta.py
│  │     │  │  │  │  │  ├─ tool_call_delta_object.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ run_create_params.py
│  │     │  │  │  │  ├─ run_list_params.py
│  │     │  │  │  │  ├─ run_status.py
│  │     │  │  │  │  ├─ run_submit_tool_outputs_params.py
│  │     │  │  │  │  ├─ run_update_params.py
│  │     │  │  │  │  ├─ text.py
│  │     │  │  │  │  ├─ text_content_block.py
│  │     │  │  │  │  ├─ text_content_block_param.py
│  │     │  │  │  │  ├─ text_delta.py
│  │     │  │  │  │  ├─ text_delta_block.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ thread_create_and_run_params.py
│  │     │  │  │  ├─ thread_create_params.py
│  │     │  │  │  ├─ thread_deleted.py
│  │     │  │  │  ├─ thread_update_params.py
│  │     │  │  │  ├─ token_usage.py
│  │     │  │  │  ├─ web_search_action.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ chat
│  │     │  │  │  ├─ chat_completion.py
│  │     │  │  │  ├─ chat_completion_allowed_tools_param.py
│  │     │  │  │  ├─ chat_completion_allowed_tool_choice_param.py
│  │     │  │  │  ├─ chat_completion_assistant_message_param.py
│  │     │  │  │  ├─ chat_completion_audio.py
│  │     │  │  │  ├─ chat_completion_audio_param.py
│  │     │  │  │  ├─ chat_completion_chunk.py
│  │     │  │  │  ├─ chat_completion_content_part_image.py
│  │     │  │  │  ├─ chat_completion_content_part_image_param.py
│  │     │  │  │  ├─ chat_completion_content_part_input_audio_param.py
│  │     │  │  │  ├─ chat_completion_content_part_param.py
│  │     │  │  │  ├─ chat_completion_content_part_refusal_param.py
│  │     │  │  │  ├─ chat_completion_content_part_text.py
│  │     │  │  │  ├─ chat_completion_content_part_text_param.py
│  │     │  │  │  ├─ chat_completion_custom_tool_param.py
│  │     │  │  │  ├─ chat_completion_deleted.py
│  │     │  │  │  ├─ chat_completion_developer_message_param.py
│  │     │  │  │  ├─ chat_completion_function_call_option_param.py
│  │     │  │  │  ├─ chat_completion_function_message_param.py
│  │     │  │  │  ├─ chat_completion_function_tool.py
│  │     │  │  │  ├─ chat_completion_function_tool_param.py
│  │     │  │  │  ├─ chat_completion_message.py
│  │     │  │  │  ├─ chat_completion_message_custom_tool_call.py
│  │     │  │  │  ├─ chat_completion_message_custom_tool_call_param.py
│  │     │  │  │  ├─ chat_completion_message_function_tool_call.py
│  │     │  │  │  ├─ chat_completion_message_function_tool_call_param.py
│  │     │  │  │  ├─ chat_completion_message_param.py
│  │     │  │  │  ├─ chat_completion_message_tool_call.py
│  │     │  │  │  ├─ chat_completion_message_tool_call_param.py
│  │     │  │  │  ├─ chat_completion_message_tool_call_union_param.py
│  │     │  │  │  ├─ chat_completion_modality.py
│  │     │  │  │  ├─ chat_completion_named_tool_choice_custom_param.py
│  │     │  │  │  ├─ chat_completion_named_tool_choice_param.py
│  │     │  │  │  ├─ chat_completion_prediction_content_param.py
│  │     │  │  │  ├─ chat_completion_reasoning_effort.py
│  │     │  │  │  ├─ chat_completion_role.py
│  │     │  │  │  ├─ chat_completion_store_message.py
│  │     │  │  │  ├─ chat_completion_stream_options_param.py
│  │     │  │  │  ├─ chat_completion_system_message_param.py
│  │     │  │  │  ├─ chat_completion_token_logprob.py
│  │     │  │  │  ├─ chat_completion_tool_choice_option_param.py
│  │     │  │  │  ├─ chat_completion_tool_message_param.py
│  │     │  │  │  ├─ chat_completion_tool_param.py
│  │     │  │  │  ├─ chat_completion_tool_union_param.py
│  │     │  │  │  ├─ chat_completion_user_message_param.py
│  │     │  │  │  ├─ completions
│  │     │  │  │  │  ├─ message_list_params.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ completion_create_params.py
│  │     │  │  │  ├─ completion_list_params.py
│  │     │  │  │  ├─ completion_update_params.py
│  │     │  │  │  ├─ parsed_chat_completion.py
│  │     │  │  │  ├─ parsed_function_tool_call.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ chat_model.py
│  │     │  │  ├─ completion.py
│  │     │  │  ├─ completion_choice.py
│  │     │  │  ├─ completion_create_params.py
│  │     │  │  ├─ completion_usage.py
│  │     │  │  ├─ containers
│  │     │  │  │  ├─ files
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ file_create_params.py
│  │     │  │  │  ├─ file_create_response.py
│  │     │  │  │  ├─ file_list_params.py
│  │     │  │  │  ├─ file_list_response.py
│  │     │  │  │  ├─ file_retrieve_response.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ container_create_params.py
│  │     │  │  ├─ container_create_response.py
│  │     │  │  ├─ container_list_params.py
│  │     │  │  ├─ container_list_response.py
│  │     │  │  ├─ container_retrieve_response.py
│  │     │  │  ├─ content_provenance_check.py
│  │     │  │  ├─ content_provenance_check_create_params.py
│  │     │  │  ├─ conversations
│  │     │  │  │  ├─ computer_screenshot_content.py
│  │     │  │  │  ├─ conversation.py
│  │     │  │  │  ├─ conversation_create_params.py
│  │     │  │  │  ├─ conversation_deleted_resource.py
│  │     │  │  │  ├─ conversation_item.py
│  │     │  │  │  ├─ conversation_item_list.py
│  │     │  │  │  ├─ conversation_update_params.py
│  │     │  │  │  ├─ input_file_content.py
│  │     │  │  │  ├─ input_file_content_param.py
│  │     │  │  │  ├─ input_image_content.py
│  │     │  │  │  ├─ input_image_content_param.py
│  │     │  │  │  ├─ input_text_content.py
│  │     │  │  │  ├─ input_text_content_param.py
│  │     │  │  │  ├─ item_create_params.py
│  │     │  │  │  ├─ item_list_params.py
│  │     │  │  │  ├─ item_retrieve_params.py
│  │     │  │  │  ├─ message.py
│  │     │  │  │  ├─ output_text_content.py
│  │     │  │  │  ├─ output_text_content_param.py
│  │     │  │  │  ├─ refusal_content.py
│  │     │  │  │  ├─ refusal_content_param.py
│  │     │  │  │  ├─ summary_text_content.py
│  │     │  │  │  ├─ text_content.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ create_embedding_response.py
│  │     │  │  ├─ decision.py
│  │     │  │  ├─ decision_create_params.py
│  │     │  │  ├─ decision_input_image_param.py
│  │     │  │  ├─ decision_input_message_param.py
│  │     │  │  ├─ decision_input_part_union_param.py
│  │     │  │  ├─ decision_input_text_param.py
│  │     │  │  ├─ deleted_skill.py
│  │     │  │  ├─ embedding.py
│  │     │  │  ├─ embedding_create_params.py
│  │     │  │  ├─ embedding_model.py
│  │     │  │  ├─ evals
│  │     │  │  │  ├─ create_eval_completions_run_data_source.py
│  │     │  │  │  ├─ create_eval_completions_run_data_source_param.py
│  │     │  │  │  ├─ create_eval_jsonl_run_data_source.py
│  │     │  │  │  ├─ create_eval_jsonl_run_data_source_param.py
│  │     │  │  │  ├─ eval_api_error.py
│  │     │  │  │  ├─ runs
│  │     │  │  │  │  ├─ output_item_list_params.py
│  │     │  │  │  │  ├─ output_item_list_response.py
│  │     │  │  │  │  ├─ output_item_retrieve_response.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ run_cancel_response.py
│  │     │  │  │  ├─ run_create_params.py
│  │     │  │  │  ├─ run_create_response.py
│  │     │  │  │  ├─ run_delete_response.py
│  │     │  │  │  ├─ run_list_params.py
│  │     │  │  │  ├─ run_list_response.py
│  │     │  │  │  ├─ run_retrieve_response.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ eval_create_params.py
│  │     │  │  ├─ eval_create_response.py
│  │     │  │  ├─ eval_custom_data_source_config.py
│  │     │  │  ├─ eval_delete_response.py
│  │     │  │  ├─ eval_list_params.py
│  │     │  │  ├─ eval_list_response.py
│  │     │  │  ├─ eval_retrieve_response.py
│  │     │  │  ├─ eval_stored_completions_data_source_config.py
│  │     │  │  ├─ eval_update_params.py
│  │     │  │  ├─ eval_update_response.py
│  │     │  │  ├─ file_chunking_strategy.py
│  │     │  │  ├─ file_chunking_strategy_param.py
│  │     │  │  ├─ file_content.py
│  │     │  │  ├─ file_create_params.py
│  │     │  │  ├─ file_deleted.py
│  │     │  │  ├─ file_list_params.py
│  │     │  │  ├─ file_object.py
│  │     │  │  ├─ file_purpose.py
│  │     │  │  ├─ fine_tuning
│  │     │  │  │  ├─ alpha
│  │     │  │  │  │  ├─ grader_run_params.py
│  │     │  │  │  │  ├─ grader_run_response.py
│  │     │  │  │  │  ├─ grader_validate_params.py
│  │     │  │  │  │  ├─ grader_validate_response.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ checkpoints
│  │     │  │  │  │  ├─ permission_create_params.py
│  │     │  │  │  │  ├─ permission_create_response.py
│  │     │  │  │  │  ├─ permission_delete_response.py
│  │     │  │  │  │  ├─ permission_list_params.py
│  │     │  │  │  │  ├─ permission_list_response.py
│  │     │  │  │  │  ├─ permission_retrieve_params.py
│  │     │  │  │  │  ├─ permission_retrieve_response.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ dpo_hyperparameters.py
│  │     │  │  │  ├─ dpo_hyperparameters_param.py
│  │     │  │  │  ├─ dpo_method.py
│  │     │  │  │  ├─ dpo_method_param.py
│  │     │  │  │  ├─ fine_tuning_job.py
│  │     │  │  │  ├─ fine_tuning_job_event.py
│  │     │  │  │  ├─ fine_tuning_job_integration.py
│  │     │  │  │  ├─ fine_tuning_job_wandb_integration.py
│  │     │  │  │  ├─ fine_tuning_job_wandb_integration_object.py
│  │     │  │  │  ├─ jobs
│  │     │  │  │  │  ├─ checkpoint_list_params.py
│  │     │  │  │  │  ├─ fine_tuning_job_checkpoint.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ job_create_params.py
│  │     │  │  │  ├─ job_list_events_params.py
│  │     │  │  │  ├─ job_list_params.py
│  │     │  │  │  ├─ reinforcement_hyperparameters.py
│  │     │  │  │  ├─ reinforcement_hyperparameters_param.py
│  │     │  │  │  ├─ reinforcement_method.py
│  │     │  │  │  ├─ reinforcement_method_param.py
│  │     │  │  │  ├─ supervised_hyperparameters.py
│  │     │  │  │  ├─ supervised_hyperparameters_param.py
│  │     │  │  │  ├─ supervised_method.py
│  │     │  │  │  ├─ supervised_method_param.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ graders
│  │     │  │  │  ├─ grader_inputs.py
│  │     │  │  │  ├─ grader_inputs_param.py
│  │     │  │  │  ├─ label_model_grader.py
│  │     │  │  │  ├─ label_model_grader_param.py
│  │     │  │  │  ├─ multi_grader.py
│  │     │  │  │  ├─ multi_grader_param.py
│  │     │  │  │  ├─ python_grader.py
│  │     │  │  │  ├─ python_grader_param.py
│  │     │  │  │  ├─ score_model_grader.py
│  │     │  │  │  ├─ score_model_grader_param.py
│  │     │  │  │  ├─ string_check_grader.py
│  │     │  │  │  ├─ string_check_grader_param.py
│  │     │  │  │  ├─ text_similarity_grader.py
│  │     │  │  │  ├─ text_similarity_grader_param.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ image.py
│  │     │  │  ├─ images_response.py
│  │     │  │  ├─ image_create_variation_params.py
│  │     │  │  ├─ image_edit_completed_event.py
│  │     │  │  ├─ image_edit_params.py
│  │     │  │  ├─ image_edit_partial_image_event.py
│  │     │  │  ├─ image_edit_stream_event.py
│  │     │  │  ├─ image_generate_params.py
│  │     │  │  ├─ image_gen_completed_event.py
│  │     │  │  ├─ image_gen_partial_image_event.py
│  │     │  │  ├─ image_gen_stream_event.py
│  │     │  │  ├─ image_input_reference_param.py
│  │     │  │  ├─ image_model.py
│  │     │  │  ├─ live
│  │     │  │  │  ├─ audio_format.py
│  │     │  │  │  ├─ audio_format_param.py
│  │     │  │  │  ├─ built_in_voice.py
│  │     │  │  │  ├─ client_config.py
│  │     │  │  │  ├─ client_config_param.py
│  │     │  │  │  ├─ client_delegation.py
│  │     │  │  │  ├─ client_delegation_param.py
│  │     │  │  │  ├─ client_event.py
│  │     │  │  │  ├─ client_event_param.py
│  │     │  │  │  ├─ commentary_appended_event.py
│  │     │  │  │  ├─ commentary_append_event.py
│  │     │  │  │  ├─ commentary_append_event_param.py
│  │     │  │  │  ├─ connect_client_event.py
│  │     │  │  │  ├─ connect_client_event_param.py
│  │     │  │  │  ├─ connect_server_event.py
│  │     │  │  │  ├─ custom_voice.py
│  │     │  │  │  ├─ custom_voice_param.py
│  │     │  │  │  ├─ data_channel_config.py
│  │     │  │  │  ├─ data_channel_config_param.py
│  │     │  │  │  ├─ delegation_created_event.py
│  │     │  │  │  ├─ error.py
│  │     │  │  │  ├─ error_event.py
│  │     │  │  │  ├─ fork_client_event.py
│  │     │  │  │  ├─ fork_client_event_param.py
│  │     │  │  │  ├─ fork_server_event.py
│  │     │  │  │  ├─ fork_session_config.py
│  │     │  │  │  ├─ fork_session_config_param.py
│  │     │  │  │  ├─ fork_session_start_event.py
│  │     │  │  │  ├─ fork_session_start_event_param.py
│  │     │  │  │  ├─ function_tool.py
│  │     │  │  │  ├─ function_tool_param.py
│  │     │  │  │  ├─ info_event.py
│  │     │  │  │  ├─ initial_item.py
│  │     │  │  │  ├─ initial_item_param.py
│  │     │  │  │  ├─ input_audio_append_event.py
│  │     │  │  │  ├─ input_audio_append_event_param.py
│  │     │  │  │  ├─ input_audio_muted_event.py
│  │     │  │  │  ├─ input_audio_mute_event.py
│  │     │  │  │  ├─ input_audio_mute_event_param.py
│  │     │  │  │  ├─ input_audio_unmuted_event.py
│  │     │  │  │  ├─ input_audio_unmute_event.py
│  │     │  │  │  ├─ input_audio_unmute_event_param.py
│  │     │  │  │  ├─ input_transcript_delta_event.py
│  │     │  │  │  ├─ instructions_appended_event.py
│  │     │  │  │  ├─ instructions_append_event.py
│  │     │  │  │  ├─ instructions_append_event_param.py
│  │     │  │  │  ├─ live_create_params.py
│  │     │  │  │  ├─ live_create_response.py
│  │     │  │  │  ├─ media_session_config_param.py
│  │     │  │  │  ├─ media_session_fork_config_param.py
│  │     │  │  │  ├─ output_audio_delta_event.py
│  │     │  │  │  ├─ output_transcript_delta_event.py
│  │     │  │  │  ├─ responses_delegation_config.py
│  │     │  │  │  ├─ responses_delegation_config_param.py
│  │     │  │  │  ├─ responses_delegation_update_config.py
│  │     │  │  │  ├─ responses_delegation_update_config_param.py
│  │     │  │  │  ├─ response_create_event.py
│  │     │  │  │  ├─ response_create_event_param.py
│  │     │  │  │  ├─ response_event.py
│  │     │  │  │  ├─ response_item_create_event.py
│  │     │  │  │  ├─ response_item_create_event_param.py
│  │     │  │  │  ├─ server_event.py
│  │     │  │  │  ├─ server_event_selector.py
│  │     │  │  │  ├─ server_event_selector_param.py
│  │     │  │  │  ├─ session_accept_params.py
│  │     │  │  │  ├─ session_closed_event.py
│  │     │  │  │  ├─ session_close_event.py
│  │     │  │  │  ├─ session_close_event_param.py
│  │     │  │  │  ├─ session_config.py
│  │     │  │  │  ├─ session_config_param.py
│  │     │  │  │  ├─ session_fork_params.py
│  │     │  │  │  ├─ session_fork_response.py
│  │     │  │  │  ├─ session_refer_params.py
│  │     │  │  │  ├─ session_reject_params.py
│  │     │  │  │  ├─ session_resource.py
│  │     │  │  │  ├─ session_started_event.py
│  │     │  │  │  ├─ session_start_event.py
│  │     │  │  │  ├─ session_start_event_param.py
│  │     │  │  │  ├─ session_updated_event.py
│  │     │  │  │  ├─ session_update_config.py
│  │     │  │  │  ├─ session_update_config_param.py
│  │     │  │  │  ├─ session_update_event.py
│  │     │  │  │  ├─ session_update_event_param.py
│  │     │  │  │  ├─ session_usage.py
│  │     │  │  │  ├─ session_usage_updated_event.py
│  │     │  │  │  ├─ sideband_connect_params.py
│  │     │  │  │  ├─ thinking_appended_event.py
│  │     │  │  │  ├─ thinking_append_event.py
│  │     │  │  │  ├─ thinking_append_event_param.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ model.py
│  │     │  │  ├─ model_deleted.py
│  │     │  │  ├─ moderation.py
│  │     │  │  ├─ moderation_create_params.py
│  │     │  │  ├─ moderation_create_response.py
│  │     │  │  ├─ moderation_image_url_input_param.py
│  │     │  │  ├─ moderation_model.py
│  │     │  │  ├─ moderation_multi_modal_input_param.py
│  │     │  │  ├─ moderation_text_input_param.py
│  │     │  │  ├─ other_file_chunking_strategy_object.py
│  │     │  │  ├─ realtime
│  │     │  │  │  ├─ audio_transcription.py
│  │     │  │  │  ├─ audio_transcription_param.py
│  │     │  │  │  ├─ call_accept_params.py
│  │     │  │  │  ├─ call_create_params.py
│  │     │  │  │  ├─ call_refer_params.py
│  │     │  │  │  ├─ call_reject_params.py
│  │     │  │  │  ├─ client_secret_create_params.py
│  │     │  │  │  ├─ client_secret_create_response.py
│  │     │  │  │  ├─ conversation_created_event.py
│  │     │  │  │  ├─ conversation_item.py
│  │     │  │  │  ├─ conversation_item_added.py
│  │     │  │  │  ├─ conversation_item_created_event.py
│  │     │  │  │  ├─ conversation_item_create_event.py
│  │     │  │  │  ├─ conversation_item_create_event_param.py
│  │     │  │  │  ├─ conversation_item_deleted_event.py
│  │     │  │  │  ├─ conversation_item_delete_event.py
│  │     │  │  │  ├─ conversation_item_delete_event_param.py
│  │     │  │  │  ├─ conversation_item_done.py
│  │     │  │  │  ├─ conversation_item_input_audio_transcription_completed_event.py
│  │     │  │  │  ├─ conversation_item_input_audio_transcription_delta_event.py
│  │     │  │  │  ├─ conversation_item_input_audio_transcription_failed_event.py
│  │     │  │  │  ├─ conversation_item_input_audio_transcription_segment.py
│  │     │  │  │  ├─ conversation_item_param.py
│  │     │  │  │  ├─ conversation_item_retrieve_event.py
│  │     │  │  │  ├─ conversation_item_retrieve_event_param.py
│  │     │  │  │  ├─ conversation_item_truncated_event.py
│  │     │  │  │  ├─ conversation_item_truncate_event.py
│  │     │  │  │  ├─ conversation_item_truncate_event_param.py
│  │     │  │  │  ├─ input_audio_buffer_append_event.py
│  │     │  │  │  ├─ input_audio_buffer_append_event_param.py
│  │     │  │  │  ├─ input_audio_buffer_cleared_event.py
│  │     │  │  │  ├─ input_audio_buffer_clear_event.py
│  │     │  │  │  ├─ input_audio_buffer_clear_event_param.py
│  │     │  │  │  ├─ input_audio_buffer_committed_event.py
│  │     │  │  │  ├─ input_audio_buffer_commit_event.py
│  │     │  │  │  ├─ input_audio_buffer_commit_event_param.py
│  │     │  │  │  ├─ input_audio_buffer_dtmf_event_received_event.py
│  │     │  │  │  ├─ input_audio_buffer_speech_started_event.py
│  │     │  │  │  ├─ input_audio_buffer_speech_stopped_event.py
│  │     │  │  │  ├─ input_audio_buffer_timeout_triggered.py
│  │     │  │  │  ├─ log_prob_properties.py
│  │     │  │  │  ├─ mcp_list_tools_completed.py
│  │     │  │  │  ├─ mcp_list_tools_failed.py
│  │     │  │  │  ├─ mcp_list_tools_in_progress.py
│  │     │  │  │  ├─ noise_reduction_type.py
│  │     │  │  │  ├─ output_audio_buffer_clear_event.py
│  │     │  │  │  ├─ output_audio_buffer_clear_event_param.py
│  │     │  │  │  ├─ rate_limits_updated_event.py
│  │     │  │  │  ├─ realtime_audio_config.py
│  │     │  │  │  ├─ realtime_audio_config_input.py
│  │     │  │  │  ├─ realtime_audio_config_input_param.py
│  │     │  │  │  ├─ realtime_audio_config_output.py
│  │     │  │  │  ├─ realtime_audio_config_output_param.py
│  │     │  │  │  ├─ realtime_audio_config_param.py
│  │     │  │  │  ├─ realtime_audio_formats.py
│  │     │  │  │  ├─ realtime_audio_formats_param.py
│  │     │  │  │  ├─ realtime_audio_input_turn_detection.py
│  │     │  │  │  ├─ realtime_audio_input_turn_detection_param.py
│  │     │  │  │  ├─ realtime_client_event.py
│  │     │  │  │  ├─ realtime_client_event_param.py
│  │     │  │  │  ├─ realtime_connect_params.py
│  │     │  │  │  ├─ realtime_conversation_item_assistant_message.py
│  │     │  │  │  ├─ realtime_conversation_item_assistant_message_param.py
│  │     │  │  │  ├─ realtime_conversation_item_function_call.py
│  │     │  │  │  ├─ realtime_conversation_item_function_call_output.py
│  │     │  │  │  ├─ realtime_conversation_item_function_call_output_param.py
│  │     │  │  │  ├─ realtime_conversation_item_function_call_param.py
│  │     │  │  │  ├─ realtime_conversation_item_system_message.py
│  │     │  │  │  ├─ realtime_conversation_item_system_message_param.py
│  │     │  │  │  ├─ realtime_conversation_item_user_message.py
│  │     │  │  │  ├─ realtime_conversation_item_user_message_param.py
│  │     │  │  │  ├─ realtime_error.py
│  │     │  │  │  ├─ realtime_error_event.py
│  │     │  │  │  ├─ realtime_function_tool.py
│  │     │  │  │  ├─ realtime_function_tool_param.py
│  │     │  │  │  ├─ realtime_mcphttp_error.py
│  │     │  │  │  ├─ realtime_mcphttp_error_param.py
│  │     │  │  │  ├─ realtime_mcp_approval_request.py
│  │     │  │  │  ├─ realtime_mcp_approval_request_param.py
│  │     │  │  │  ├─ realtime_mcp_approval_response.py
│  │     │  │  │  ├─ realtime_mcp_approval_response_param.py
│  │     │  │  │  ├─ realtime_mcp_list_tools.py
│  │     │  │  │  ├─ realtime_mcp_list_tools_param.py
│  │     │  │  │  ├─ realtime_mcp_protocol_error.py
│  │     │  │  │  ├─ realtime_mcp_protocol_error_param.py
│  │     │  │  │  ├─ realtime_mcp_tool_call.py
│  │     │  │  │  ├─ realtime_mcp_tool_call_param.py
│  │     │  │  │  ├─ realtime_mcp_tool_execution_error.py
│  │     │  │  │  ├─ realtime_mcp_tool_execution_error_param.py
│  │     │  │  │  ├─ realtime_reasoning.py
│  │     │  │  │  ├─ realtime_reasoning_effort.py
│  │     │  │  │  ├─ realtime_reasoning_param.py
│  │     │  │  │  ├─ realtime_response.py
│  │     │  │  │  ├─ realtime_response_create_audio_output.py
│  │     │  │  │  ├─ realtime_response_create_audio_output_param.py
│  │     │  │  │  ├─ realtime_response_create_mcp_tool.py
│  │     │  │  │  ├─ realtime_response_create_mcp_tool_param.py
│  │     │  │  │  ├─ realtime_response_create_params.py
│  │     │  │  │  ├─ realtime_response_create_params_param.py
│  │     │  │  │  ├─ realtime_response_status.py
│  │     │  │  │  ├─ realtime_response_usage.py
│  │     │  │  │  ├─ realtime_response_usage_input_token_details.py
│  │     │  │  │  ├─ realtime_response_usage_output_token_details.py
│  │     │  │  │  ├─ realtime_server_event.py
│  │     │  │  │  ├─ realtime_session_create_request.py
│  │     │  │  │  ├─ realtime_session_create_request_param.py
│  │     │  │  │  ├─ realtime_session_create_response.py
│  │     │  │  │  ├─ realtime_tools_config.py
│  │     │  │  │  ├─ realtime_tools_config_param.py
│  │     │  │  │  ├─ realtime_tools_config_union.py
│  │     │  │  │  ├─ realtime_tools_config_union_param.py
│  │     │  │  │  ├─ realtime_tool_choice_config.py
│  │     │  │  │  ├─ realtime_tool_choice_config_param.py
│  │     │  │  │  ├─ realtime_tracing_config.py
│  │     │  │  │  ├─ realtime_tracing_config_param.py
│  │     │  │  │  ├─ realtime_transcription_session_audio.py
│  │     │  │  │  ├─ realtime_transcription_session_audio_input.py
│  │     │  │  │  ├─ realtime_transcription_session_audio_input_param.py
│  │     │  │  │  ├─ realtime_transcription_session_audio_input_turn_detection.py
│  │     │  │  │  ├─ realtime_transcription_session_audio_input_turn_detection_param.py
│  │     │  │  │  ├─ realtime_transcription_session_audio_param.py
│  │     │  │  │  ├─ realtime_transcription_session_create_request.py
│  │     │  │  │  ├─ realtime_transcription_session_create_request_param.py
│  │     │  │  │  ├─ realtime_transcription_session_create_response.py
│  │     │  │  │  ├─ realtime_transcription_session_turn_detection.py
│  │     │  │  │  ├─ realtime_translation_client_secret_create_response.py
│  │     │  │  │  ├─ realtime_translation_session.py
│  │     │  │  │  ├─ realtime_translation_session_create_request_param.py
│  │     │  │  │  ├─ realtime_truncation.py
│  │     │  │  │  ├─ realtime_truncation_param.py
│  │     │  │  │  ├─ realtime_truncation_retention_ratio.py
│  │     │  │  │  ├─ realtime_truncation_retention_ratio_param.py
│  │     │  │  │  ├─ response_audio_delta_event.py
│  │     │  │  │  ├─ response_audio_done_event.py
│  │     │  │  │  ├─ response_audio_transcript_delta_event.py
│  │     │  │  │  ├─ response_audio_transcript_done_event.py
│  │     │  │  │  ├─ response_cancel_event.py
│  │     │  │  │  ├─ response_cancel_event_param.py
│  │     │  │  │  ├─ response_content_part_added_event.py
│  │     │  │  │  ├─ response_content_part_done_event.py
│  │     │  │  │  ├─ response_created_event.py
│  │     │  │  │  ├─ response_create_event.py
│  │     │  │  │  ├─ response_create_event_param.py
│  │     │  │  │  ├─ response_done_event.py
│  │     │  │  │  ├─ response_function_call_arguments_delta_event.py
│  │     │  │  │  ├─ response_function_call_arguments_done_event.py
│  │     │  │  │  ├─ response_mcp_call_arguments_delta.py
│  │     │  │  │  ├─ response_mcp_call_arguments_done.py
│  │     │  │  │  ├─ response_mcp_call_completed.py
│  │     │  │  │  ├─ response_mcp_call_failed.py
│  │     │  │  │  ├─ response_mcp_call_in_progress.py
│  │     │  │  │  ├─ response_output_item_added_event.py
│  │     │  │  │  ├─ response_output_item_done_event.py
│  │     │  │  │  ├─ response_text_delta_event.py
│  │     │  │  │  ├─ response_text_done_event.py
│  │     │  │  │  ├─ session_created_event.py
│  │     │  │  │  ├─ session_updated_event.py
│  │     │  │  │  ├─ session_update_event.py
│  │     │  │  │  ├─ session_update_event_param.py
│  │     │  │  │  ├─ translations
│  │     │  │  │  │  ├─ client_secret_create_params.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ responses
│  │     │  │  │  ├─ apply_patch_tool.py
│  │     │  │  │  ├─ apply_patch_tool_param.py
│  │     │  │  │  ├─ compacted_response.py
│  │     │  │  │  ├─ computer_action.py
│  │     │  │  │  ├─ computer_action_list.py
│  │     │  │  │  ├─ computer_action_list_param.py
│  │     │  │  │  ├─ computer_action_param.py
│  │     │  │  │  ├─ computer_tool.py
│  │     │  │  │  ├─ computer_tool_param.py
│  │     │  │  │  ├─ computer_use_preview_tool.py
│  │     │  │  │  ├─ computer_use_preview_tool_param.py
│  │     │  │  │  ├─ container_auto.py
│  │     │  │  │  ├─ container_auto_param.py
│  │     │  │  │  ├─ container_network_policy_allowlist.py
│  │     │  │  │  ├─ container_network_policy_allowlist_param.py
│  │     │  │  │  ├─ container_network_policy_disabled.py
│  │     │  │  │  ├─ container_network_policy_disabled_param.py
│  │     │  │  │  ├─ container_network_policy_domain_secret.py
│  │     │  │  │  ├─ container_network_policy_domain_secret_param.py
│  │     │  │  │  ├─ container_reference.py
│  │     │  │  │  ├─ container_reference_param.py
│  │     │  │  │  ├─ custom_tool.py
│  │     │  │  │  ├─ custom_tool_param.py
│  │     │  │  │  ├─ easy_input_message.py
│  │     │  │  │  ├─ easy_input_message_param.py
│  │     │  │  │  ├─ file_search_tool.py
│  │     │  │  │  ├─ file_search_tool_param.py
│  │     │  │  │  ├─ function_shell_tool.py
│  │     │  │  │  ├─ function_shell_tool_param.py
│  │     │  │  │  ├─ function_tool.py
│  │     │  │  │  ├─ function_tool_param.py
│  │     │  │  │  ├─ image_detail.py
│  │     │  │  │  ├─ inline_skill.py
│  │     │  │  │  ├─ inline_skill_param.py
│  │     │  │  │  ├─ inline_skill_source.py
│  │     │  │  │  ├─ inline_skill_source_param.py
│  │     │  │  │  ├─ input_item_list_params.py
│  │     │  │  │  ├─ input_token_count_params.py
│  │     │  │  │  ├─ input_token_count_response.py
│  │     │  │  │  ├─ local_environment.py
│  │     │  │  │  ├─ local_environment_param.py
│  │     │  │  │  ├─ local_skill.py
│  │     │  │  │  ├─ local_skill_param.py
│  │     │  │  │  ├─ mcp_tool_call_error.py
│  │     │  │  │  ├─ mcp_tool_call_error_param.py
│  │     │  │  │  ├─ namespace_tool.py
│  │     │  │  │  ├─ namespace_tool_param.py
│  │     │  │  │  ├─ parsed_response.py
│  │     │  │  │  ├─ response.py
│  │     │  │  │  ├─ responses_client_event.py
│  │     │  │  │  ├─ responses_client_event_param.py
│  │     │  │  │  ├─ responses_server_event.py
│  │     │  │  │  ├─ response_apply_patch_tool_call.py
│  │     │  │  │  ├─ response_apply_patch_tool_call_output.py
│  │     │  │  │  ├─ response_audio_delta_event.py
│  │     │  │  │  ├─ response_audio_done_event.py
│  │     │  │  │  ├─ response_audio_transcript_delta_event.py
│  │     │  │  │  ├─ response_audio_transcript_done_event.py
│  │     │  │  │  ├─ response_code_interpreter_call_code_delta_event.py
│  │     │  │  │  ├─ response_code_interpreter_call_code_done_event.py
│  │     │  │  │  ├─ response_code_interpreter_call_completed_event.py
│  │     │  │  │  ├─ response_code_interpreter_call_interpreting_event.py
│  │     │  │  │  ├─ response_code_interpreter_call_in_progress_event.py
│  │     │  │  │  ├─ response_code_interpreter_tool_call.py
│  │     │  │  │  ├─ response_code_interpreter_tool_call_param.py
│  │     │  │  │  ├─ response_compaction_compacting_event.py
│  │     │  │  │  ├─ response_compaction_item.py
│  │     │  │  │  ├─ response_compaction_item_param.py
│  │     │  │  │  ├─ response_compaction_item_param_param.py
│  │     │  │  │  ├─ response_compact_params.py
│  │     │  │  │  ├─ response_completed_event.py
│  │     │  │  │  ├─ response_computer_tool_call.py
│  │     │  │  │  ├─ response_computer_tool_call_output_item.py
│  │     │  │  │  ├─ response_computer_tool_call_output_screenshot.py
│  │     │  │  │  ├─ response_computer_tool_call_output_screenshot_param.py
│  │     │  │  │  ├─ response_computer_tool_call_param.py
│  │     │  │  │  ├─ response_configuration_update_item.py
│  │     │  │  │  ├─ response_configuration_update_item_param.py
│  │     │  │  │  ├─ response_configuration_update_item_param_param.py
│  │     │  │  │  ├─ response_container_reference.py
│  │     │  │  │  ├─ response_content_part_added_event.py
│  │     │  │  │  ├─ response_content_part_done_event.py
│  │     │  │  │  ├─ response_conversation_param.py
│  │     │  │  │  ├─ response_conversation_param_param.py
│  │     │  │  │  ├─ response_created_event.py
│  │     │  │  │  ├─ response_create_params.py
│  │     │  │  │  ├─ response_custom_tool_call.py
│  │     │  │  │  ├─ response_custom_tool_call_input_delta_event.py
│  │     │  │  │  ├─ response_custom_tool_call_input_done_event.py
│  │     │  │  │  ├─ response_custom_tool_call_item.py
│  │     │  │  │  ├─ response_custom_tool_call_output.py
│  │     │  │  │  ├─ response_custom_tool_call_output_item.py
│  │     │  │  │  ├─ response_custom_tool_call_output_param.py
│  │     │  │  │  ├─ response_custom_tool_call_param.py
│  │     │  │  │  ├─ response_error.py
│  │     │  │  │  ├─ response_error_event.py
│  │     │  │  │  ├─ response_failed_event.py
│  │     │  │  │  ├─ response_file_search_call_completed_event.py
│  │     │  │  │  ├─ response_file_search_call_in_progress_event.py
│  │     │  │  │  ├─ response_file_search_call_searching_event.py
│  │     │  │  │  ├─ response_file_search_tool_call.py
│  │     │  │  │  ├─ response_file_search_tool_call_param.py
│  │     │  │  │  ├─ response_format_text_config.py
│  │     │  │  │  ├─ response_format_text_config_param.py
│  │     │  │  │  ├─ response_format_text_json_schema_config.py
│  │     │  │  │  ├─ response_format_text_json_schema_config_param.py
│  │     │  │  │  ├─ response_function_call_arguments_delta_event.py
│  │     │  │  │  ├─ response_function_call_arguments_done_event.py
│  │     │  │  │  ├─ response_function_call_output_item.py
│  │     │  │  │  ├─ response_function_call_output_item_list.py
│  │     │  │  │  ├─ response_function_call_output_item_list_param.py
│  │     │  │  │  ├─ response_function_call_output_item_param.py
│  │     │  │  │  ├─ response_function_shell_call_output_content.py
│  │     │  │  │  ├─ response_function_shell_call_output_content_param.py
│  │     │  │  │  ├─ response_function_shell_tool_call.py
│  │     │  │  │  ├─ response_function_shell_tool_call_output.py
│  │     │  │  │  ├─ response_function_tool_call.py
│  │     │  │  │  ├─ response_function_tool_call_item.py
│  │     │  │  │  ├─ response_function_tool_call_output_item.py
│  │     │  │  │  ├─ response_function_tool_call_param.py
│  │     │  │  │  ├─ response_function_web_search.py
│  │     │  │  │  ├─ response_function_web_search_param.py
│  │     │  │  │  ├─ response_image_gen_call_completed_event.py
│  │     │  │  │  ├─ response_image_gen_call_generating_event.py
│  │     │  │  │  ├─ response_image_gen_call_in_progress_event.py
│  │     │  │  │  ├─ response_image_gen_call_partial_image_event.py
│  │     │  │  │  ├─ response_includable.py
│  │     │  │  │  ├─ response_incomplete_event.py
│  │     │  │  │  ├─ response_input.py
│  │     │  │  │  ├─ response_input_audio.py
│  │     │  │  │  ├─ response_input_audio_param.py
│  │     │  │  │  ├─ response_input_content.py
│  │     │  │  │  ├─ response_input_content_param.py
│  │     │  │  │  ├─ response_input_file.py
│  │     │  │  │  ├─ response_input_file_content.py
│  │     │  │  │  ├─ response_input_file_content_param.py
│  │     │  │  │  ├─ response_input_file_param.py
│  │     │  │  │  ├─ response_input_image.py
│  │     │  │  │  ├─ response_input_image_content.py
│  │     │  │  │  ├─ response_input_image_content_param.py
│  │     │  │  │  ├─ response_input_image_param.py
│  │     │  │  │  ├─ response_input_item.py
│  │     │  │  │  ├─ response_input_item_param.py
│  │     │  │  │  ├─ response_input_message_content_list.py
│  │     │  │  │  ├─ response_input_message_content_list_param.py
│  │     │  │  │  ├─ response_input_message_item.py
│  │     │  │  │  ├─ response_input_param.py
│  │     │  │  │  ├─ response_input_text.py
│  │     │  │  │  ├─ response_input_text_content.py
│  │     │  │  │  ├─ response_input_text_content_param.py
│  │     │  │  │  ├─ response_input_text_param.py
│  │     │  │  │  ├─ response_in_progress_event.py
│  │     │  │  │  ├─ response_item.py
│  │     │  │  │  ├─ response_item_list.py
│  │     │  │  │  ├─ response_local_environment.py
│  │     │  │  │  ├─ response_mcp_call_arguments_delta_event.py
│  │     │  │  │  ├─ response_mcp_call_arguments_done_event.py
│  │     │  │  │  ├─ response_mcp_call_completed_event.py
│  │     │  │  │  ├─ response_mcp_call_failed_event.py
│  │     │  │  │  ├─ response_mcp_call_in_progress_event.py
│  │     │  │  │  ├─ response_mcp_list_tools_completed_event.py
│  │     │  │  │  ├─ response_mcp_list_tools_failed_event.py
│  │     │  │  │  ├─ response_mcp_list_tools_in_progress_event.py
│  │     │  │  │  ├─ response_output_item.py
│  │     │  │  │  ├─ response_output_item_added_event.py
│  │     │  │  │  ├─ response_output_item_done_event.py
│  │     │  │  │  ├─ response_output_message.py
│  │     │  │  │  ├─ response_output_message_param.py
│  │     │  │  │  ├─ response_output_refusal.py
│  │     │  │  │  ├─ response_output_refusal_param.py
│  │     │  │  │  ├─ response_output_text.py
│  │     │  │  │  ├─ response_output_text_annotation_added_event.py
│  │     │  │  │  ├─ response_output_text_param.py
│  │     │  │  │  ├─ response_prompt.py
│  │     │  │  │  ├─ response_prompt_param.py
│  │     │  │  │  ├─ response_queued_event.py
│  │     │  │  │  ├─ response_reasoning_item.py
│  │     │  │  │  ├─ response_reasoning_item_param.py
│  │     │  │  │  ├─ response_reasoning_summary_part_added_event.py
│  │     │  │  │  ├─ response_reasoning_summary_part_done_event.py
│  │     │  │  │  ├─ response_reasoning_summary_text_delta_event.py
│  │     │  │  │  ├─ response_reasoning_summary_text_done_event.py
│  │     │  │  │  ├─ response_reasoning_text_delta_event.py
│  │     │  │  │  ├─ response_reasoning_text_done_event.py
│  │     │  │  │  ├─ response_refusal_delta_event.py
│  │     │  │  │  ├─ response_refusal_done_event.py
│  │     │  │  │  ├─ response_retrieve_params.py
│  │     │  │  │  ├─ response_shell_call_command_added_event.py
│  │     │  │  │  ├─ response_shell_call_command_delta_event.py
│  │     │  │  │  ├─ response_shell_call_command_done_event.py
│  │     │  │  │  ├─ response_shell_call_output_content_delta_event.py
│  │     │  │  │  ├─ response_shell_call_output_content_done_event.py
│  │     │  │  │  ├─ response_status.py
│  │     │  │  │  ├─ response_steer_accepted_event.py
│  │     │  │  │  ├─ response_steer_error_code.py
│  │     │  │  │  ├─ response_steer_event.py
│  │     │  │  │  ├─ response_steer_event_param.py
│  │     │  │  │  ├─ response_steer_failed_event.py
│  │     │  │  │  ├─ response_steer_input.py
│  │     │  │  │  ├─ response_steer_input_content.py
│  │     │  │  │  ├─ response_steer_input_content_param.py
│  │     │  │  │  ├─ response_steer_input_param.py
│  │     │  │  │  ├─ response_steer_pending_event.py
│  │     │  │  │  ├─ response_steer_pending_reason.py
│  │     │  │  │  ├─ response_steer_required_input.py
│  │     │  │  │  ├─ response_stream_event.py
│  │     │  │  │  ├─ response_text_config.py
│  │     │  │  │  ├─ response_text_config_param.py
│  │     │  │  │  ├─ response_text_delta_event.py
│  │     │  │  │  ├─ response_text_done_event.py
│  │     │  │  │  ├─ response_tool_search_call.py
│  │     │  │  │  ├─ response_tool_search_output_item.py
│  │     │  │  │  ├─ response_tool_search_output_item_param.py
│  │     │  │  │  ├─ response_tool_search_output_item_param_param.py
│  │     │  │  │  ├─ response_usage.py
│  │     │  │  │  ├─ response_web_search_call_completed_event.py
│  │     │  │  │  ├─ response_web_search_call_in_progress_event.py
│  │     │  │  │  ├─ response_web_search_call_searching_event.py
│  │     │  │  │  ├─ service_tier.py
│  │     │  │  │  ├─ skill_reference.py
│  │     │  │  │  ├─ skill_reference_param.py
│  │     │  │  │  ├─ tool.py
│  │     │  │  │  ├─ tool_choice_allowed.py
│  │     │  │  │  ├─ tool_choice_allowed_param.py
│  │     │  │  │  ├─ tool_choice_apply_patch.py
│  │     │  │  │  ├─ tool_choice_apply_patch_param.py
│  │     │  │  │  ├─ tool_choice_custom.py
│  │     │  │  │  ├─ tool_choice_custom_param.py
│  │     │  │  │  ├─ tool_choice_function.py
│  │     │  │  │  ├─ tool_choice_function_param.py
│  │     │  │  │  ├─ tool_choice_mcp.py
│  │     │  │  │  ├─ tool_choice_mcp_param.py
│  │     │  │  │  ├─ tool_choice_options.py
│  │     │  │  │  ├─ tool_choice_shell.py
│  │     │  │  │  ├─ tool_choice_shell_param.py
│  │     │  │  │  ├─ tool_choice_types.py
│  │     │  │  │  ├─ tool_choice_types_param.py
│  │     │  │  │  ├─ tool_param.py
│  │     │  │  │  ├─ tool_search_output_namespace_tool.py
│  │     │  │  │  ├─ tool_search_output_namespace_tool_param.py
│  │     │  │  │  ├─ tool_search_tool.py
│  │     │  │  │  ├─ tool_search_tool_param.py
│  │     │  │  │  ├─ web_search_preview_tool.py
│  │     │  │  │  ├─ web_search_preview_tool_param.py
│  │     │  │  │  ├─ web_search_tool.py
│  │     │  │  │  ├─ web_search_tool_param.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ safety
│  │     │  │  │  ├─ safety_alert.py
│  │     │  │  │  ├─ safety_case.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ shared
│  │     │  │  │  ├─ all_models.py
│  │     │  │  │  ├─ chat_model.py
│  │     │  │  │  ├─ comparison_filter.py
│  │     │  │  │  ├─ compound_filter.py
│  │     │  │  │  ├─ custom_tool_input_format.py
│  │     │  │  │  ├─ error_object.py
│  │     │  │  │  ├─ function_definition.py
│  │     │  │  │  ├─ function_parameters.py
│  │     │  │  │  ├─ metadata.py
│  │     │  │  │  ├─ oauth_error_code.py
│  │     │  │  │  ├─ reasoning.py
│  │     │  │  │  ├─ reasoning_effort.py
│  │     │  │  │  ├─ responses_model.py
│  │     │  │  │  ├─ response_format_json_object.py
│  │     │  │  │  ├─ response_format_json_schema.py
│  │     │  │  │  ├─ response_format_text.py
│  │     │  │  │  ├─ response_format_text_grammar.py
│  │     │  │  │  ├─ response_format_text_python.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ shared_params
│  │     │  │  │  ├─ chat_model.py
│  │     │  │  │  ├─ comparison_filter.py
│  │     │  │  │  ├─ compound_filter.py
│  │     │  │  │  ├─ custom_tool_input_format.py
│  │     │  │  │  ├─ function_definition.py
│  │     │  │  │  ├─ function_parameters.py
│  │     │  │  │  ├─ metadata.py
│  │     │  │  │  ├─ oauth_error_code.py
│  │     │  │  │  ├─ reasoning.py
│  │     │  │  │  ├─ reasoning_effort.py
│  │     │  │  │  ├─ responses_model.py
│  │     │  │  │  ├─ response_format_json_object.py
│  │     │  │  │  ├─ response_format_json_schema.py
│  │     │  │  │  ├─ response_format_text.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ skill.py
│  │     │  │  ├─ skills
│  │     │  │  │  ├─ deleted_skill_version.py
│  │     │  │  │  ├─ skill_version.py
│  │     │  │  │  ├─ skill_version_list.py
│  │     │  │  │  ├─ versions
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ version_create_params.py
│  │     │  │  │  ├─ version_list_params.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ skill_create_params.py
│  │     │  │  ├─ skill_list.py
│  │     │  │  ├─ skill_list_params.py
│  │     │  │  ├─ skill_update_params.py
│  │     │  │  ├─ static_file_chunking_strategy.py
│  │     │  │  ├─ static_file_chunking_strategy_object.py
│  │     │  │  ├─ static_file_chunking_strategy_object_param.py
│  │     │  │  ├─ static_file_chunking_strategy_param.py
│  │     │  │  ├─ upload.py
│  │     │  │  ├─ uploads
│  │     │  │  │  ├─ part_create_params.py
│  │     │  │  │  ├─ upload_part.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ upload_complete_params.py
│  │     │  │  ├─ upload_create_params.py
│  │     │  │  ├─ vector_store.py
│  │     │  │  ├─ vector_stores
│  │     │  │  │  ├─ file_batch_create_params.py
│  │     │  │  │  ├─ file_batch_list_files_params.py
│  │     │  │  │  ├─ file_content_response.py
│  │     │  │  │  ├─ file_create_params.py
│  │     │  │  │  ├─ file_list_params.py
│  │     │  │  │  ├─ file_update_params.py
│  │     │  │  │  ├─ vector_store_file.py
│  │     │  │  │  ├─ vector_store_file_batch.py
│  │     │  │  │  ├─ vector_store_file_deleted.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ vector_store_create_params.py
│  │     │  │  ├─ vector_store_deleted.py
│  │     │  │  ├─ vector_store_list_params.py
│  │     │  │  ├─ vector_store_search_params.py
│  │     │  │  ├─ vector_store_search_response.py
│  │     │  │  ├─ vector_store_update_params.py
│  │     │  │  ├─ video.py
│  │     │  │  ├─ video_create_character_params.py
│  │     │  │  ├─ video_create_character_response.py
│  │     │  │  ├─ video_create_error.py
│  │     │  │  ├─ video_create_params.py
│  │     │  │  ├─ video_delete_response.py
│  │     │  │  ├─ video_download_content_params.py
│  │     │  │  ├─ video_edit_params.py
│  │     │  │  ├─ video_extend_params.py
│  │     │  │  ├─ video_get_character_response.py
│  │     │  │  ├─ video_list_params.py
│  │     │  │  ├─ video_model.py
│  │     │  │  ├─ video_model_param.py
│  │     │  │  ├─ video_remix_params.py
│  │     │  │  ├─ video_seconds.py
│  │     │  │  ├─ video_size.py
│  │     │  │  ├─ webhooks
│  │     │  │  │  ├─ agent_environment_expired_webhook_event.py
│  │     │  │  │  ├─ agent_environment_failed_webhook_event.py
│  │     │  │  │  ├─ agent_environment_ready_webhook_event.py
│  │     │  │  │  ├─ agent_environment_suspended_webhook_event.py
│  │     │  │  │  ├─ agent_session_action_required_webhook_event.py
│  │     │  │  │  ├─ agent_session_created_webhook_event.py
│  │     │  │  │  ├─ agent_session_failed_webhook_event.py
│  │     │  │  │  ├─ agent_session_idle_webhook_event.py
│  │     │  │  │  ├─ agent_session_in_progress_webhook_event.py
│  │     │  │  │  ├─ batch_cancelled_webhook_event.py
│  │     │  │  │  ├─ batch_completed_webhook_event.py
│  │     │  │  │  ├─ batch_expired_webhook_event.py
│  │     │  │  │  ├─ batch_failed_webhook_event.py
│  │     │  │  │  ├─ deleted_webhook_endpoint.py
│  │     │  │  │  ├─ eval_run_canceled_webhook_event.py
│  │     │  │  │  ├─ eval_run_failed_webhook_event.py
│  │     │  │  │  ├─ eval_run_succeeded_webhook_event.py
│  │     │  │  │  ├─ fine_tuning_job_cancelled_webhook_event.py
│  │     │  │  │  ├─ fine_tuning_job_failed_webhook_event.py
│  │     │  │  │  ├─ fine_tuning_job_succeeded_webhook_event.py
│  │     │  │  │  ├─ live_call_incoming_webhook_event.py
│  │     │  │  │  ├─ live_transport_incoming_webhook_event.py
│  │     │  │  │  ├─ realtime_call_incoming_webhook_event.py
│  │     │  │  │  ├─ response_cancelled_webhook_event.py
│  │     │  │  │  ├─ response_completed_webhook_event.py
│  │     │  │  │  ├─ response_failed_webhook_event.py
│  │     │  │  │  ├─ response_incomplete_webhook_event.py
│  │     │  │  │  ├─ safety_alert_created_webhook_event.py
│  │     │  │  │  ├─ safety_deactivation_issued_webhook_event.py
│  │     │  │  │  ├─ safety_identifier_blocked_webhook_event.py
│  │     │  │  │  ├─ safety_org_alert_created_webhook_event.py
│  │     │  │  │  ├─ safety_warning_issued_webhook_event.py
│  │     │  │  │  ├─ unwrap_webhook_event.py
│  │     │  │  │  ├─ webhook_create_params.py
│  │     │  │  │  ├─ webhook_endpoint.py
│  │     │  │  │  ├─ webhook_endpoint_list.py
│  │     │  │  │  ├─ webhook_endpoint_test_result.py
│  │     │  │  │  ├─ webhook_endpoint_with_secret.py
│  │     │  │  │  ├─ webhook_event_type_list.py
│  │     │  │  │  ├─ webhook_list_params.py
│  │     │  │  │  ├─ webhook_rotate_secret_params.py
│  │     │  │  │  ├─ webhook_test_params.py
│  │     │  │  │  ├─ webhook_update_params.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ websocket_connection_options.py
│  │     │  │  ├─ websocket_reconnection.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ version.py
│  │     │  ├─ _base_client.py
│  │     │  ├─ _client.py
│  │     │  ├─ _compat.py
│  │     │  ├─ _constants.py
│  │     │  ├─ _data_residency.py
│  │     │  ├─ _event_handler.py
│  │     │  ├─ _exceptions.py
│  │     │  ├─ _extras
│  │     │  │  ├─ numpy_proxy.py
│  │     │  │  ├─ pandas_proxy.py
│  │     │  │  ├─ sounddevice_proxy.py
│  │     │  │  ├─ _common.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _files.py
│  │     │  ├─ _httpx2.py
│  │     │  ├─ _legacy_response.py
│  │     │  ├─ _models.py
│  │     │  ├─ _module_client.py
│  │     │  ├─ _multipart.py
│  │     │  ├─ _provider.py
│  │     │  ├─ _qs.py
│  │     │  ├─ _resource.py
│  │     │  ├─ _response.py
│  │     │  ├─ _send_queue.py
│  │     │  ├─ _streaming.py
│  │     │  ├─ _streaming_cleanup.py
│  │     │  ├─ _types.py
│  │     │  ├─ _utils
│  │     │  │  ├─ _compat.py
│  │     │  │  ├─ _datetime_parse.py
│  │     │  │  ├─ _json.py
│  │     │  │  ├─ _logs.py
│  │     │  │  ├─ _path.py
│  │     │  │  ├─ _proxy.py
│  │     │  │  ├─ _reflection.py
│  │     │  │  ├─ _resources_proxy.py
│  │     │  │  ├─ _streams.py
│  │     │  │  ├─ _sync.py
│  │     │  │  ├─ _transform.py
│  │     │  │  ├─ _typing.py
│  │     │  │  ├─ _utils.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _vendor
│  │     │  │  ├─ httpx_aiohttp
│  │     │  │  │  ├─ client.py
│  │     │  │  │  ├─ FORK.md
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ README.md
│  │     │  │  │  ├─ transport.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _version.py
│  │     │  └─ __init__.py
│  │     ├─ openai-3.31.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ opentelemetry
│  │     │  ├─ attributes
│  │     │  │  ├─ py.typed
│  │     │  │  └─ __init__.py
│  │     │  ├─ baggage
│  │     │  │  ├─ propagation
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ py.typed
│  │     │  │  └─ __init__.py
│  │     │  ├─ context
│  │     │  │  ├─ context.py
│  │     │  │  ├─ contextvars_context.py
│  │     │  │  ├─ py.typed
│  │     │  │  └─ __init__.py
│  │     │  ├─ environment_variables
│  │     │  │  ├─ py.typed
│  │     │  │  └─ __init__.py
│  │     │  ├─ metrics
│  │     │  │  ├─ py.typed
│  │     │  │  ├─ _internal
│  │     │  │  │  ├─ instrument.py
│  │     │  │  │  ├─ observation.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ propagate
│  │     │  │  ├─ py.typed
│  │     │  │  └─ __init__.py
│  │     │  ├─ propagators
│  │     │  │  ├─ composite.py
│  │     │  │  ├─ py.typed
│  │     │  │  ├─ textmap.py
│  │     │  │  └─ _envcarrier.py
│  │     │  ├─ py.typed
│  │     │  ├─ trace
│  │     │  │  ├─ propagation
│  │     │  │  │  ├─ tracecontext.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ py.typed
│  │     │  │  ├─ span.py
│  │     │  │  ├─ status.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ util
│  │     │  │  ├─ py.typed
│  │     │  │  ├─ re.py
│  │     │  │  ├─ types.py
│  │     │  │  ├─ _decorator.py
│  │     │  │  ├─ _importlib_metadata.py
│  │     │  │  ├─ _once.py
│  │     │  │  └─ _providers.py
│  │     │  ├─ version
│  │     │  │  ├─ py.typed
│  │     │  │  └─ __init__.py
│  │     │  └─ _logs
│  │     │     ├─ py.typed
│  │     │     ├─ severity
│  │     │     │  └─ __init__.py
│  │     │     ├─ _internal
│  │     │     │  └─ __init__.py
│  │     │     └─ __init__.py
│  │     ├─ opentelemetry_api-1.45.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ packaging
│  │     │  ├─ dependency_groups.py
│  │     │  ├─ direct_url.py
│  │     │  ├─ errors.py
│  │     │  ├─ licenses
│  │     │  │  ├─ _spdx.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ markers.py
│  │     │  ├─ metadata.py
│  │     │  ├─ py.typed
│  │     │  ├─ pylock.py
│  │     │  ├─ ranges.py
│  │     │  ├─ requirements.py
│  │     │  ├─ specifiers.py
│  │     │  ├─ tags.py
│  │     │  ├─ utils.py
│  │     │  ├─ version.py
│  │     │  ├─ _elffile.py
│  │     │  ├─ _manylinux.py
│  │     │  ├─ _musllinux.py
│  │     │  ├─ _parser.py
│  │     │  ├─ _ranges.py
│  │     │  ├─ _structures.py
│  │     │  ├─ _tokenizer.py
│  │     │  └─ __init__.py
│  │     ├─ packaging-26.3.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ LICENSE
│  │     │  │  ├─ LICENSE.APACHE
│  │     │  │  └─ LICENSE.BSD
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ pip
│  │     │  ├─ py.typed
│  │     │  ├─ _internal
│  │     │  │  ├─ build_env.py
│  │     │  │  ├─ cache.py
│  │     │  │  ├─ cli
│  │     │  │  │  ├─ autocompletion.py
│  │     │  │  │  ├─ base_command.py
│  │     │  │  │  ├─ cmdoptions.py
│  │     │  │  │  ├─ command_context.py
│  │     │  │  │  ├─ index_command.py
│  │     │  │  │  ├─ main.py
│  │     │  │  │  ├─ main_parser.py
│  │     │  │  │  ├─ parser.py
│  │     │  │  │  ├─ progress_bars.py
│  │     │  │  │  ├─ req_command.py
│  │     │  │  │  ├─ spinners.py
│  │     │  │  │  ├─ status_codes.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ commands
│  │     │  │  │  ├─ cache.py
│  │     │  │  │  ├─ check.py
│  │     │  │  │  ├─ completion.py
│  │     │  │  │  ├─ configuration.py
│  │     │  │  │  ├─ debug.py
│  │     │  │  │  ├─ download.py
│  │     │  │  │  ├─ freeze.py
│  │     │  │  │  ├─ hash.py
│  │     │  │  │  ├─ help.py
│  │     │  │  │  ├─ index.py
│  │     │  │  │  ├─ inspect.py
│  │     │  │  │  ├─ install.py
│  │     │  │  │  ├─ list.py
│  │     │  │  │  ├─ lock.py
│  │     │  │  │  ├─ search.py
│  │     │  │  │  ├─ show.py
│  │     │  │  │  ├─ uninstall.py
│  │     │  │  │  ├─ wheel.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ configuration.py
│  │     │  │  ├─ distributions
│  │     │  │  │  ├─ base.py
│  │     │  │  │  ├─ installed.py
│  │     │  │  │  ├─ sdist.py
│  │     │  │  │  ├─ wheel.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ exceptions.py
│  │     │  │  ├─ index
│  │     │  │  │  ├─ collector.py
│  │     │  │  │  ├─ package_finder.py
│  │     │  │  │  ├─ sources.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ locations
│  │     │  │  │  ├─ base.py
│  │     │  │  │  ├─ _distutils.py
│  │     │  │  │  ├─ _sysconfig.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ main.py
│  │     │  │  ├─ metadata
│  │     │  │  │  ├─ base.py
│  │     │  │  │  ├─ importlib
│  │     │  │  │  │  ├─ _compat.py
│  │     │  │  │  │  ├─ _dists.py
│  │     │  │  │  │  ├─ _envs.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ pkg_resources.py
│  │     │  │  │  ├─ _json.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ models
│  │     │  │  │  ├─ candidate.py
│  │     │  │  │  ├─ direct_url.py
│  │     │  │  │  ├─ format_control.py
│  │     │  │  │  ├─ index.py
│  │     │  │  │  ├─ installation_report.py
│  │     │  │  │  ├─ link.py
│  │     │  │  │  ├─ pylock.py
│  │     │  │  │  ├─ scheme.py
│  │     │  │  │  ├─ search_scope.py
│  │     │  │  │  ├─ selection_prefs.py
│  │     │  │  │  ├─ target_python.py
│  │     │  │  │  ├─ wheel.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ network
│  │     │  │  │  ├─ auth.py
│  │     │  │  │  ├─ cache.py
│  │     │  │  │  ├─ download.py
│  │     │  │  │  ├─ lazy_wheel.py
│  │     │  │  │  ├─ session.py
│  │     │  │  │  ├─ utils.py
│  │     │  │  │  ├─ xmlrpc.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ operations
│  │     │  │  │  ├─ build
│  │     │  │  │  │  ├─ build_tracker.py
│  │     │  │  │  │  ├─ metadata.py
│  │     │  │  │  │  ├─ metadata_editable.py
│  │     │  │  │  │  ├─ wheel.py
│  │     │  │  │  │  ├─ wheel_editable.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ check.py
│  │     │  │  │  ├─ freeze.py
│  │     │  │  │  ├─ install
│  │     │  │  │  │  ├─ wheel.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ prepare.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ pyproject.py
│  │     │  │  ├─ req
│  │     │  │  │  ├─ constructors.py
│  │     │  │  │  ├─ req_dependency_group.py
│  │     │  │  │  ├─ req_file.py
│  │     │  │  │  ├─ req_install.py
│  │     │  │  │  ├─ req_set.py
│  │     │  │  │  ├─ req_uninstall.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ resolution
│  │     │  │  │  ├─ base.py
│  │     │  │  │  ├─ legacy
│  │     │  │  │  │  ├─ resolver.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ resolvelib
│  │     │  │  │  │  ├─ base.py
│  │     │  │  │  │  ├─ candidates.py
│  │     │  │  │  │  ├─ factory.py
│  │     │  │  │  │  ├─ found_candidates.py
│  │     │  │  │  │  ├─ provider.py
│  │     │  │  │  │  ├─ reporter.py
│  │     │  │  │  │  ├─ requirements.py
│  │     │  │  │  │  ├─ resolver.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ self_outdated_check.py
│  │     │  │  ├─ utils
│  │     │  │  │  ├─ appdirs.py
│  │     │  │  │  ├─ compat.py
│  │     │  │  │  ├─ compatibility_tags.py
│  │     │  │  │  ├─ datetime.py
│  │     │  │  │  ├─ deprecation.py
│  │     │  │  │  ├─ direct_url_helpers.py
│  │     │  │  │  ├─ egg_link.py
│  │     │  │  │  ├─ entrypoints.py
│  │     │  │  │  ├─ filesystem.py
│  │     │  │  │  ├─ filetypes.py
│  │     │  │  │  ├─ glibc.py
│  │     │  │  │  ├─ hashes.py
│  │     │  │  │  ├─ logging.py
│  │     │  │  │  ├─ misc.py
│  │     │  │  │  ├─ packaging.py
│  │     │  │  │  ├─ retry.py
│  │     │  │  │  ├─ subprocess.py
│  │     │  │  │  ├─ temp_dir.py
│  │     │  │  │  ├─ unpacking.py
│  │     │  │  │  ├─ urls.py
│  │     │  │  │  ├─ virtualenv.py
│  │     │  │  │  ├─ wheel.py
│  │     │  │  │  ├─ _jaraco_text.py
│  │     │  │  │  ├─ _log.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ vcs
│  │     │  │  │  ├─ bazaar.py
│  │     │  │  │  ├─ git.py
│  │     │  │  │  ├─ mercurial.py
│  │     │  │  │  ├─ subversion.py
│  │     │  │  │  ├─ versioncontrol.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ wheel_builder.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _vendor
│  │     │  │  ├─ cachecontrol
│  │     │  │  │  ├─ adapter.py
│  │     │  │  │  ├─ cache.py
│  │     │  │  │  ├─ caches
│  │     │  │  │  │  ├─ file_cache.py
│  │     │  │  │  │  ├─ redis_cache.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ controller.py
│  │     │  │  │  ├─ filewrapper.py
│  │     │  │  │  ├─ heuristics.py
│  │     │  │  │  ├─ LICENSE.txt
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ serialize.py
│  │     │  │  │  ├─ wrapper.py
│  │     │  │  │  ├─ _cmd.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ certifi
│  │     │  │  │  ├─ cacert.pem
│  │     │  │  │  ├─ core.py
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ __init__.py
│  │     │  │  │  └─ __main__.py
│  │     │  │  ├─ dependency_groups
│  │     │  │  │  ├─ LICENSE.txt
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ _implementation.py
│  │     │  │  │  ├─ _lint_dependency_groups.py
│  │     │  │  │  ├─ _pip_wrapper.py
│  │     │  │  │  ├─ _toml_compat.py
│  │     │  │  │  ├─ __init__.py
│  │     │  │  │  └─ __main__.py
│  │     │  │  ├─ distlib
│  │     │  │  │  ├─ compat.py
│  │     │  │  │  ├─ LICENSE.txt
│  │     │  │  │  ├─ resources.py
│  │     │  │  │  ├─ scripts.py
│  │     │  │  │  ├─ t32.exe
│  │     │  │  │  ├─ t64-arm.exe
│  │     │  │  │  ├─ t64.exe
│  │     │  │  │  ├─ util.py
│  │     │  │  │  ├─ w32.exe
│  │     │  │  │  ├─ w64-arm.exe
│  │     │  │  │  ├─ w64.exe
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ distro
│  │     │  │  │  ├─ distro.py
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ __init__.py
│  │     │  │  │  └─ __main__.py
│  │     │  │  ├─ idna
│  │     │  │  │  ├─ codec.py
│  │     │  │  │  ├─ compat.py
│  │     │  │  │  ├─ core.py
│  │     │  │  │  ├─ idnadata.py
│  │     │  │  │  ├─ intranges.py
│  │     │  │  │  ├─ LICENSE.md
│  │     │  │  │  ├─ package_data.py
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ uts46data.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ msgpack
│  │     │  │  │  ├─ COPYING
│  │     │  │  │  ├─ exceptions.py
│  │     │  │  │  ├─ ext.py
│  │     │  │  │  ├─ fallback.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ packaging
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ LICENSE.APACHE
│  │     │  │  │  ├─ LICENSE.BSD
│  │     │  │  │  ├─ licenses
│  │     │  │  │  │  ├─ _spdx.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ markers.py
│  │     │  │  │  ├─ metadata.py
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ requirements.py
│  │     │  │  │  ├─ specifiers.py
│  │     │  │  │  ├─ tags.py
│  │     │  │  │  ├─ utils.py
│  │     │  │  │  ├─ version.py
│  │     │  │  │  ├─ _elffile.py
│  │     │  │  │  ├─ _manylinux.py
│  │     │  │  │  ├─ _musllinux.py
│  │     │  │  │  ├─ _parser.py
│  │     │  │  │  ├─ _structures.py
│  │     │  │  │  ├─ _tokenizer.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ pkg_resources
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ platformdirs
│  │     │  │  │  ├─ android.py
│  │     │  │  │  ├─ api.py
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ macos.py
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ unix.py
│  │     │  │  │  ├─ version.py
│  │     │  │  │  ├─ windows.py
│  │     │  │  │  ├─ __init__.py
│  │     │  │  │  └─ __main__.py
│  │     │  │  ├─ pygments
│  │     │  │  │  ├─ console.py
│  │     │  │  │  ├─ filter.py
│  │     │  │  │  ├─ filters
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ formatter.py
│  │     │  │  │  ├─ formatters
│  │     │  │  │  │  ├─ _mapping.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ lexer.py
│  │     │  │  │  ├─ lexers
│  │     │  │  │  │  ├─ python.py
│  │     │  │  │  │  ├─ _mapping.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ modeline.py
│  │     │  │  │  ├─ plugin.py
│  │     │  │  │  ├─ regexopt.py
│  │     │  │  │  ├─ scanner.py
│  │     │  │  │  ├─ sphinxext.py
│  │     │  │  │  ├─ style.py
│  │     │  │  │  ├─ styles
│  │     │  │  │  │  ├─ _mapping.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ token.py
│  │     │  │  │  ├─ unistring.py
│  │     │  │  │  ├─ util.py
│  │     │  │  │  ├─ __init__.py
│  │     │  │  │  └─ __main__.py
│  │     │  │  ├─ pyproject_hooks
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ _impl.py
│  │     │  │  │  ├─ _in_process
│  │     │  │  │  │  ├─ _in_process.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ README.rst
│  │     │  │  ├─ requests
│  │     │  │  │  ├─ adapters.py
│  │     │  │  │  ├─ api.py
│  │     │  │  │  ├─ auth.py
│  │     │  │  │  ├─ certs.py
│  │     │  │  │  ├─ compat.py
│  │     │  │  │  ├─ cookies.py
│  │     │  │  │  ├─ exceptions.py
│  │     │  │  │  ├─ help.py
│  │     │  │  │  ├─ hooks.py
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ models.py
│  │     │  │  │  ├─ packages.py
│  │     │  │  │  ├─ sessions.py
│  │     │  │  │  ├─ status_codes.py
│  │     │  │  │  ├─ structures.py
│  │     │  │  │  ├─ utils.py
│  │     │  │  │  ├─ _internal_utils.py
│  │     │  │  │  ├─ __init__.py
│  │     │  │  │  └─ __version__.py
│  │     │  │  ├─ resolvelib
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ providers.py
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ reporters.py
│  │     │  │  │  ├─ resolvers
│  │     │  │  │  │  ├─ abstract.py
│  │     │  │  │  │  ├─ criterion.py
│  │     │  │  │  │  ├─ exceptions.py
│  │     │  │  │  │  ├─ resolution.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ structs.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ rich
│  │     │  │  │  ├─ abc.py
│  │     │  │  │  ├─ align.py
│  │     │  │  │  ├─ ansi.py
│  │     │  │  │  ├─ bar.py
│  │     │  │  │  ├─ box.py
│  │     │  │  │  ├─ cells.py
│  │     │  │  │  ├─ color.py
│  │     │  │  │  ├─ color_triplet.py
│  │     │  │  │  ├─ columns.py
│  │     │  │  │  ├─ console.py
│  │     │  │  │  ├─ constrain.py
│  │     │  │  │  ├─ containers.py
│  │     │  │  │  ├─ control.py
│  │     │  │  │  ├─ default_styles.py
│  │     │  │  │  ├─ diagnose.py
│  │     │  │  │  ├─ emoji.py
│  │     │  │  │  ├─ errors.py
│  │     │  │  │  ├─ filesize.py
│  │     │  │  │  ├─ file_proxy.py
│  │     │  │  │  ├─ highlighter.py
│  │     │  │  │  ├─ json.py
│  │     │  │  │  ├─ jupyter.py
│  │     │  │  │  ├─ layout.py
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ live.py
│  │     │  │  │  ├─ live_render.py
│  │     │  │  │  ├─ logging.py
│  │     │  │  │  ├─ markup.py
│  │     │  │  │  ├─ measure.py
│  │     │  │  │  ├─ padding.py
│  │     │  │  │  ├─ pager.py
│  │     │  │  │  ├─ palette.py
│  │     │  │  │  ├─ panel.py
│  │     │  │  │  ├─ pretty.py
│  │     │  │  │  ├─ progress.py
│  │     │  │  │  ├─ progress_bar.py
│  │     │  │  │  ├─ prompt.py
│  │     │  │  │  ├─ protocol.py
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ region.py
│  │     │  │  │  ├─ repr.py
│  │     │  │  │  ├─ rule.py
│  │     │  │  │  ├─ scope.py
│  │     │  │  │  ├─ screen.py
│  │     │  │  │  ├─ segment.py
│  │     │  │  │  ├─ spinner.py
│  │     │  │  │  ├─ status.py
│  │     │  │  │  ├─ style.py
│  │     │  │  │  ├─ styled.py
│  │     │  │  │  ├─ syntax.py
│  │     │  │  │  ├─ table.py
│  │     │  │  │  ├─ terminal_theme.py
│  │     │  │  │  ├─ text.py
│  │     │  │  │  ├─ theme.py
│  │     │  │  │  ├─ themes.py
│  │     │  │  │  ├─ traceback.py
│  │     │  │  │  ├─ tree.py
│  │     │  │  │  ├─ _cell_widths.py
│  │     │  │  │  ├─ _emoji_codes.py
│  │     │  │  │  ├─ _emoji_replace.py
│  │     │  │  │  ├─ _export_format.py
│  │     │  │  │  ├─ _extension.py
│  │     │  │  │  ├─ _fileno.py
│  │     │  │  │  ├─ _inspect.py
│  │     │  │  │  ├─ _log_render.py
│  │     │  │  │  ├─ _loop.py
│  │     │  │  │  ├─ _null_file.py
│  │     │  │  │  ├─ _palettes.py
│  │     │  │  │  ├─ _pick.py
│  │     │  │  │  ├─ _ratio.py
│  │     │  │  │  ├─ _spinners.py
│  │     │  │  │  ├─ _stack.py
│  │     │  │  │  ├─ _timer.py
│  │     │  │  │  ├─ _win32_console.py
│  │     │  │  │  ├─ _windows.py
│  │     │  │  │  ├─ _windows_renderer.py
│  │     │  │  │  ├─ _wrap.py
│  │     │  │  │  ├─ __init__.py
│  │     │  │  │  └─ __main__.py
│  │     │  │  ├─ tomli
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ _parser.py
│  │     │  │  │  ├─ _re.py
│  │     │  │  │  ├─ _types.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ tomli_w
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ _writer.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ truststore
│  │     │  │  │  ├─ LICENSE
│  │     │  │  │  ├─ py.typed
│  │     │  │  │  ├─ _api.py
│  │     │  │  │  ├─ _macos.py
│  │     │  │  │  ├─ _openssl.py
│  │     │  │  │  ├─ _ssl_constants.py
│  │     │  │  │  ├─ _windows.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ urllib3
│  │     │  │  │  ├─ connection.py
│  │     │  │  │  ├─ connectionpool.py
│  │     │  │  │  ├─ contrib
│  │     │  │  │  │  ├─ appengine.py
│  │     │  │  │  │  ├─ ntlmpool.py
│  │     │  │  │  │  ├─ pyopenssl.py
│  │     │  │  │  │  ├─ securetransport.py
│  │     │  │  │  │  ├─ socks.py
│  │     │  │  │  │  ├─ _appengine_environ.py
│  │     │  │  │  │  ├─ _securetransport
│  │     │  │  │  │  │  ├─ bindings.py
│  │     │  │  │  │  │  ├─ low_level.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ exceptions.py
│  │     │  │  │  ├─ fields.py
│  │     │  │  │  ├─ filepost.py
│  │     │  │  │  ├─ LICENSE.txt
│  │     │  │  │  ├─ packages
│  │     │  │  │  │  ├─ backports
│  │     │  │  │  │  │  ├─ makefile.py
│  │     │  │  │  │  │  ├─ weakref_finalize.py
│  │     │  │  │  │  │  └─ __init__.py
│  │     │  │  │  │  ├─ six.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ poolmanager.py
│  │     │  │  │  ├─ request.py
│  │     │  │  │  ├─ response.py
│  │     │  │  │  ├─ util
│  │     │  │  │  │  ├─ connection.py
│  │     │  │  │  │  ├─ proxy.py
│  │     │  │  │  │  ├─ queue.py
│  │     │  │  │  │  ├─ request.py
│  │     │  │  │  │  ├─ response.py
│  │     │  │  │  │  ├─ retry.py
│  │     │  │  │  │  ├─ ssltransport.py
│  │     │  │  │  │  ├─ ssl_.py
│  │     │  │  │  │  ├─ ssl_match_hostname.py
│  │     │  │  │  │  ├─ timeout.py
│  │     │  │  │  │  ├─ url.py
│  │     │  │  │  │  ├─ wait.py
│  │     │  │  │  │  └─ __init__.py
│  │     │  │  │  ├─ _collections.py
│  │     │  │  │  ├─ _version.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ vendor.txt
│  │     │  │  └─ __init__.py
│  │     │  ├─ __init__.py
│  │     │  ├─ __main__.py
│  │     │  └─ __pip-runner__.py
│  │     ├─ pip-25.3.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ AUTHORS.txt
│  │     │  │  ├─ LICENSE.txt
│  │     │  │  └─ src
│  │     │  │     └─ pip
│  │     │  │        └─ _vendor
│  │     │  │           ├─ cachecontrol
│  │     │  │           │  └─ LICENSE.txt
│  │     │  │           ├─ certifi
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ dependency_groups
│  │     │  │           │  └─ LICENSE.txt
│  │     │  │           ├─ distlib
│  │     │  │           │  └─ LICENSE.txt
│  │     │  │           ├─ distro
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ idna
│  │     │  │           │  └─ LICENSE.md
│  │     │  │           ├─ msgpack
│  │     │  │           │  └─ COPYING
│  │     │  │           ├─ packaging
│  │     │  │           │  ├─ LICENSE
│  │     │  │           │  ├─ LICENSE.APACHE
│  │     │  │           │  └─ LICENSE.BSD
│  │     │  │           ├─ pkg_resources
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ platformdirs
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ pygments
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ pyproject_hooks
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ requests
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ resolvelib
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ rich
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ tomli
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ tomli_w
│  │     │  │           │  └─ LICENSE
│  │     │  │           ├─ truststore
│  │     │  │           │  └─ LICENSE
│  │     │  │           └─ urllib3
│  │     │  │              └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ pluggy
│  │     │  ├─ py.typed
│  │     │  ├─ _caller.py
│  │     │  ├─ _callers.py
│  │     │  ├─ _compat.py
│  │     │  ├─ _config.py
│  │     │  ├─ _decorators.py
│  │     │  ├─ _execution.py
│  │     │  ├─ _hooks.py
│  │     │  ├─ _impl.py
│  │     │  ├─ _manager.py
│  │     │  ├─ _result.py
│  │     │  ├─ _tracing.py
│  │     │  ├─ _warnings.py
│  │     │  └─ __init__.py
│  │     ├─ pluggy-1.7.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ py.py
│  │     ├─ pydantic
│  │     │  ├─ aliases.py
│  │     │  ├─ alias_generators.py
│  │     │  ├─ annotated_handlers.py
│  │     │  ├─ class_validators.py
│  │     │  ├─ color.py
│  │     │  ├─ config.py
│  │     │  ├─ dataclasses.py
│  │     │  ├─ datetime_parse.py
│  │     │  ├─ decorator.py
│  │     │  ├─ deprecated
│  │     │  │  ├─ class_validators.py
│  │     │  │  ├─ config.py
│  │     │  │  ├─ copy_internals.py
│  │     │  │  ├─ decorator.py
│  │     │  │  ├─ json.py
│  │     │  │  ├─ parse.py
│  │     │  │  ├─ tools.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ env_settings.py
│  │     │  ├─ errors.py
│  │     │  ├─ error_wrappers.py
│  │     │  ├─ experimental
│  │     │  │  ├─ arguments_schema.py
│  │     │  │  ├─ missing_sentinel.py
│  │     │  │  ├─ pipeline.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ fields.py
│  │     │  ├─ functional_serializers.py
│  │     │  ├─ functional_validators.py
│  │     │  ├─ generics.py
│  │     │  ├─ json.py
│  │     │  ├─ json_schema.py
│  │     │  ├─ main.py
│  │     │  ├─ mypy.py
│  │     │  ├─ networks.py
│  │     │  ├─ parse.py
│  │     │  ├─ plugin
│  │     │  │  ├─ _loader.py
│  │     │  │  ├─ _schema_validator.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ py.typed
│  │     │  ├─ root_model.py
│  │     │  ├─ schema.py
│  │     │  ├─ tools.py
│  │     │  ├─ types.py
│  │     │  ├─ type_adapter.py
│  │     │  ├─ typing.py
│  │     │  ├─ utils.py
│  │     │  ├─ v1
│  │     │  │  ├─ annotated_types.py
│  │     │  │  ├─ class_validators.py
│  │     │  │  ├─ color.py
│  │     │  │  ├─ config.py
│  │     │  │  ├─ dataclasses.py
│  │     │  │  ├─ datetime_parse.py
│  │     │  │  ├─ decorator.py
│  │     │  │  ├─ env_settings.py
│  │     │  │  ├─ errors.py
│  │     │  │  ├─ error_wrappers.py
│  │     │  │  ├─ fields.py
│  │     │  │  ├─ generics.py
│  │     │  │  ├─ json.py
│  │     │  │  ├─ main.py
│  │     │  │  ├─ mypy.py
│  │     │  │  ├─ networks.py
│  │     │  │  ├─ parse.py
│  │     │  │  ├─ py.typed
│  │     │  │  ├─ schema.py
│  │     │  │  ├─ tools.py
│  │     │  │  ├─ types.py
│  │     │  │  ├─ typing.py
│  │     │  │  ├─ utils.py
│  │     │  │  ├─ validators.py
│  │     │  │  ├─ version.py
│  │     │  │  ├─ _hypothesis_plugin.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ validate_call_decorator.py
│  │     │  ├─ validators.py
│  │     │  ├─ version.py
│  │     │  ├─ warnings.py
│  │     │  ├─ _internal
│  │     │  │  ├─ _config.py
│  │     │  │  ├─ _core_metadata.py
│  │     │  │  ├─ _core_utils.py
│  │     │  │  ├─ _dataclasses.py
│  │     │  │  ├─ _decorators.py
│  │     │  │  ├─ _decorators_v1.py
│  │     │  │  ├─ _discriminated_union.py
│  │     │  │  ├─ _docs_extraction.py
│  │     │  │  ├─ _fields.py
│  │     │  │  ├─ _forward_ref.py
│  │     │  │  ├─ _generate_schema.py
│  │     │  │  ├─ _generics.py
│  │     │  │  ├─ _git.py
│  │     │  │  ├─ _import_utils.py
│  │     │  │  ├─ _known_annotated_metadata.py
│  │     │  │  ├─ _mock_val_ser.py
│  │     │  │  ├─ _model_construction.py
│  │     │  │  ├─ _namespace_utils.py
│  │     │  │  ├─ _repr.py
│  │     │  │  ├─ _schema_gather.py
│  │     │  │  ├─ _schema_generation_shared.py
│  │     │  │  ├─ _serializers.py
│  │     │  │  ├─ _signature.py
│  │     │  │  ├─ _type_refs.py
│  │     │  │  ├─ _typing_extra.py
│  │     │  │  ├─ _utils.py
│  │     │  │  ├─ _validate_call.py
│  │     │  │  ├─ _validators.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _migration.py
│  │     │  └─ __init__.py
│  │     ├─ pydantic-2.14.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ pydantic_core
│  │     │  ├─ core_schema.py
│  │     │  ├─ py.typed
│  │     │  ├─ _pydantic_core
│  │     │  │  ├─ _schema_gather.pyi
│  │     │  │  └─ __init__.pyi
│  │     │  ├─ _pydantic_core.cp314-win_amd64.pyd
│  │     │  └─ __init__.py
│  │     ├─ pydantic_core-2.50.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ sboms
│  │     │  │  └─ pydantic-core.cyclonedx.json
│  │     │  └─ WHEEL
│  │     ├─ pygments
│  │     │  ├─ cmdline.py
│  │     │  ├─ console.py
│  │     │  ├─ filter.py
│  │     │  ├─ filters
│  │     │  │  └─ __init__.py
│  │     │  ├─ formatter.py
│  │     │  ├─ formatters
│  │     │  │  ├─ bbcode.py
│  │     │  │  ├─ groff.py
│  │     │  │  ├─ html.py
│  │     │  │  ├─ img.py
│  │     │  │  ├─ irc.py
│  │     │  │  ├─ latex.py
│  │     │  │  ├─ other.py
│  │     │  │  ├─ pangomarkup.py
│  │     │  │  ├─ rtf.py
│  │     │  │  ├─ svg.py
│  │     │  │  ├─ terminal.py
│  │     │  │  ├─ terminal256.py
│  │     │  │  ├─ _mapping.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ lexer.py
│  │     │  ├─ lexers
│  │     │  │  ├─ actionscript.py
│  │     │  │  ├─ ada.py
│  │     │  │  ├─ agile.py
│  │     │  │  ├─ algebra.py
│  │     │  │  ├─ ambient.py
│  │     │  │  ├─ amdgpu.py
│  │     │  │  ├─ ampl.py
│  │     │  │  ├─ apdlexer.py
│  │     │  │  ├─ apl.py
│  │     │  │  ├─ archetype.py
│  │     │  │  ├─ arrow.py
│  │     │  │  ├─ arturo.py
│  │     │  │  ├─ asc.py
│  │     │  │  ├─ asm.py
│  │     │  │  ├─ asn1.py
│  │     │  │  ├─ automation.py
│  │     │  │  ├─ bare.py
│  │     │  │  ├─ basic.py
│  │     │  │  ├─ bdd.py
│  │     │  │  ├─ berry.py
│  │     │  │  ├─ bibtex.py
│  │     │  │  ├─ bitbake.py
│  │     │  │  ├─ blueprint.py
│  │     │  │  ├─ boa.py
│  │     │  │  ├─ bqn.py
│  │     │  │  ├─ business.py
│  │     │  │  ├─ capnproto.py
│  │     │  │  ├─ carbon.py
│  │     │  │  ├─ cddl.py
│  │     │  │  ├─ cel.py
│  │     │  │  ├─ chapel.py
│  │     │  │  ├─ clean.py
│  │     │  │  ├─ codeql.py
│  │     │  │  ├─ comal.py
│  │     │  │  ├─ compiled.py
│  │     │  │  ├─ configs.py
│  │     │  │  ├─ console.py
│  │     │  │  ├─ cplint.py
│  │     │  │  ├─ crystal.py
│  │     │  │  ├─ csound.py
│  │     │  │  ├─ css.py
│  │     │  │  ├─ c_cpp.py
│  │     │  │  ├─ c_like.py
│  │     │  │  ├─ d.py
│  │     │  │  ├─ dalvik.py
│  │     │  │  ├─ data.py
│  │     │  │  ├─ dax.py
│  │     │  │  ├─ devicetree.py
│  │     │  │  ├─ diff.py
│  │     │  │  ├─ dns.py
│  │     │  │  ├─ dotnet.py
│  │     │  │  ├─ dsls.py
│  │     │  │  ├─ dylan.py
│  │     │  │  ├─ ecl.py
│  │     │  │  ├─ eiffel.py
│  │     │  │  ├─ elm.py
│  │     │  │  ├─ elpi.py
│  │     │  │  ├─ email.py
│  │     │  │  ├─ erlang.py
│  │     │  │  ├─ esoteric.py
│  │     │  │  ├─ ezhil.py
│  │     │  │  ├─ factor.py
│  │     │  │  ├─ fantom.py
│  │     │  │  ├─ felix.py
│  │     │  │  ├─ fift.py
│  │     │  │  ├─ floscript.py
│  │     │  │  ├─ forth.py
│  │     │  │  ├─ fortran.py
│  │     │  │  ├─ foxpro.py
│  │     │  │  ├─ freefem.py
│  │     │  │  ├─ func.py
│  │     │  │  ├─ functional.py
│  │     │  │  ├─ futhark.py
│  │     │  │  ├─ gcodelexer.py
│  │     │  │  ├─ gdscript.py
│  │     │  │  ├─ gleam.py
│  │     │  │  ├─ go.py
│  │     │  │  ├─ grammar_notation.py
│  │     │  │  ├─ graph.py
│  │     │  │  ├─ graphics.py
│  │     │  │  ├─ graphql.py
│  │     │  │  ├─ graphviz.py
│  │     │  │  ├─ gsql.py
│  │     │  │  ├─ hare.py
│  │     │  │  ├─ haskell.py
│  │     │  │  ├─ haxe.py
│  │     │  │  ├─ hdl.py
│  │     │  │  ├─ hexdump.py
│  │     │  │  ├─ html.py
│  │     │  │  ├─ idl.py
│  │     │  │  ├─ igor.py
│  │     │  │  ├─ inferno.py
│  │     │  │  ├─ installers.py
│  │     │  │  ├─ int_fiction.py
│  │     │  │  ├─ iolang.py
│  │     │  │  ├─ j.py
│  │     │  │  ├─ javascript.py
│  │     │  │  ├─ jmespath.py
│  │     │  │  ├─ jslt.py
│  │     │  │  ├─ json5.py
│  │     │  │  ├─ jsonnet.py
│  │     │  │  ├─ jsx.py
│  │     │  │  ├─ julia.py
│  │     │  │  ├─ jvm.py
│  │     │  │  ├─ kuin.py
│  │     │  │  ├─ kusto.py
│  │     │  │  ├─ ldap.py
│  │     │  │  ├─ lean.py
│  │     │  │  ├─ lilypond.py
│  │     │  │  ├─ lisp.py
│  │     │  │  ├─ macaulay2.py
│  │     │  │  ├─ make.py
│  │     │  │  ├─ maple.py
│  │     │  │  ├─ markup.py
│  │     │  │  ├─ math.py
│  │     │  │  ├─ matlab.py
│  │     │  │  ├─ maxima.py
│  │     │  │  ├─ meson.py
│  │     │  │  ├─ mime.py
│  │     │  │  ├─ minecraft.py
│  │     │  │  ├─ mips.py
│  │     │  │  ├─ ml.py
│  │     │  │  ├─ modeling.py
│  │     │  │  ├─ modula2.py
│  │     │  │  ├─ mojo.py
│  │     │  │  ├─ monte.py
│  │     │  │  ├─ mosel.py
│  │     │  │  ├─ ncl.py
│  │     │  │  ├─ nimrod.py
│  │     │  │  ├─ nit.py
│  │     │  │  ├─ nix.py
│  │     │  │  ├─ numbair.py
│  │     │  │  ├─ oberon.py
│  │     │  │  ├─ objective.py
│  │     │  │  ├─ ooc.py
│  │     │  │  ├─ openscad.py
│  │     │  │  ├─ other.py
│  │     │  │  ├─ parasail.py
│  │     │  │  ├─ parsers.py
│  │     │  │  ├─ pascal.py
│  │     │  │  ├─ pawn.py
│  │     │  │  ├─ pddl.py
│  │     │  │  ├─ perl.py
│  │     │  │  ├─ phix.py
│  │     │  │  ├─ php.py
│  │     │  │  ├─ pointless.py
│  │     │  │  ├─ pony.py
│  │     │  │  ├─ praat.py
│  │     │  │  ├─ procfile.py
│  │     │  │  ├─ prolog.py
│  │     │  │  ├─ promql.py
│  │     │  │  ├─ prql.py
│  │     │  │  ├─ ptx.py
│  │     │  │  ├─ purescript.py
│  │     │  │  ├─ python.py
│  │     │  │  ├─ q.py
│  │     │  │  ├─ qlik.py
│  │     │  │  ├─ qvt.py
│  │     │  │  ├─ r.py
│  │     │  │  ├─ rdf.py
│  │     │  │  ├─ rebol.py
│  │     │  │  ├─ rego.py
│  │     │  │  ├─ rell.py
│  │     │  │  ├─ resource.py
│  │     │  │  ├─ ride.py
│  │     │  │  ├─ rita.py
│  │     │  │  ├─ rnc.py
│  │     │  │  ├─ roboconf.py
│  │     │  │  ├─ robotframework.py
│  │     │  │  ├─ ruby.py
│  │     │  │  ├─ rust.py
│  │     │  │  ├─ sas.py
│  │     │  │  ├─ savi.py
│  │     │  │  ├─ scdoc.py
│  │     │  │  ├─ scripting.py
│  │     │  │  ├─ sgf.py
│  │     │  │  ├─ shell.py
│  │     │  │  ├─ sieve.py
│  │     │  │  ├─ slash.py
│  │     │  │  ├─ smalltalk.py
│  │     │  │  ├─ smithy.py
│  │     │  │  ├─ smv.py
│  │     │  │  ├─ snobol.py
│  │     │  │  ├─ solidity.py
│  │     │  │  ├─ soong.py
│  │     │  │  ├─ sophia.py
│  │     │  │  ├─ special.py
│  │     │  │  ├─ spice.py
│  │     │  │  ├─ sql.py
│  │     │  │  ├─ srcinfo.py
│  │     │  │  ├─ stata.py
│  │     │  │  ├─ supercollider.py
│  │     │  │  ├─ tablegen.py
│  │     │  │  ├─ tact.py
│  │     │  │  ├─ tal.py
│  │     │  │  ├─ tcl.py
│  │     │  │  ├─ teal.py
│  │     │  │  ├─ templates.py
│  │     │  │  ├─ teraterm.py
│  │     │  │  ├─ testing.py
│  │     │  │  ├─ text.py
│  │     │  │  ├─ textedit.py
│  │     │  │  ├─ textfmts.py
│  │     │  │  ├─ theorem.py
│  │     │  │  ├─ thingsdb.py
│  │     │  │  ├─ tlb.py
│  │     │  │  ├─ tls.py
│  │     │  │  ├─ tnt.py
│  │     │  │  ├─ trafficscript.py
│  │     │  │  ├─ typoscript.py
│  │     │  │  ├─ typst.py
│  │     │  │  ├─ ul4.py
│  │     │  │  ├─ unicon.py
│  │     │  │  ├─ urbi.py
│  │     │  │  ├─ usd.py
│  │     │  │  ├─ varnish.py
│  │     │  │  ├─ verification.py
│  │     │  │  ├─ verifpal.py
│  │     │  │  ├─ vip.py
│  │     │  │  ├─ vyper.py
│  │     │  │  ├─ web.py
│  │     │  │  ├─ webassembly.py
│  │     │  │  ├─ webidl.py
│  │     │  │  ├─ webmisc.py
│  │     │  │  ├─ wgsl.py
│  │     │  │  ├─ whiley.py
│  │     │  │  ├─ wowtoc.py
│  │     │  │  ├─ wren.py
│  │     │  │  ├─ x10.py
│  │     │  │  ├─ xorg.py
│  │     │  │  ├─ yang.py
│  │     │  │  ├─ yara.py
│  │     │  │  ├─ zig.py
│  │     │  │  ├─ _ada_builtins.py
│  │     │  │  ├─ _asy_builtins.py
│  │     │  │  ├─ _cl_builtins.py
│  │     │  │  ├─ _cocoa_builtins.py
│  │     │  │  ├─ _csound_builtins.py
│  │     │  │  ├─ _css_builtins.py
│  │     │  │  ├─ _googlesql_builtins.py
│  │     │  │  ├─ _julia_builtins.py
│  │     │  │  ├─ _lasso_builtins.py
│  │     │  │  ├─ _lilypond_builtins.py
│  │     │  │  ├─ _luau_builtins.py
│  │     │  │  ├─ _lua_builtins.py
│  │     │  │  ├─ _mapping.py
│  │     │  │  ├─ _mql_builtins.py
│  │     │  │  ├─ _mysql_builtins.py
│  │     │  │  ├─ _openedge_builtins.py
│  │     │  │  ├─ _php_builtins.py
│  │     │  │  ├─ _postgres_builtins.py
│  │     │  │  ├─ _qlik_builtins.py
│  │     │  │  ├─ _scheme_builtins.py
│  │     │  │  ├─ _scilab_builtins.py
│  │     │  │  ├─ _sourcemod_builtins.py
│  │     │  │  ├─ _sql_builtins.py
│  │     │  │  ├─ _stan_builtins.py
│  │     │  │  ├─ _stata_builtins.py
│  │     │  │  ├─ _tsql_builtins.py
│  │     │  │  ├─ _usd_builtins.py
│  │     │  │  ├─ _vbscript_builtins.py
│  │     │  │  ├─ _vim_builtins.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ modeline.py
│  │     │  ├─ plugin.py
│  │     │  ├─ regexopt.py
│  │     │  ├─ scanner.py
│  │     │  ├─ sphinxext.py
│  │     │  ├─ style.py
│  │     │  ├─ styles
│  │     │  │  ├─ abap.py
│  │     │  │  ├─ algol.py
│  │     │  │  ├─ algol_nu.py
│  │     │  │  ├─ arduino.py
│  │     │  │  ├─ autumn.py
│  │     │  │  ├─ borland.py
│  │     │  │  ├─ bw.py
│  │     │  │  ├─ coffee.py
│  │     │  │  ├─ colorful.py
│  │     │  │  ├─ default.py
│  │     │  │  ├─ dracula.py
│  │     │  │  ├─ emacs.py
│  │     │  │  ├─ friendly.py
│  │     │  │  ├─ friendly_grayscale.py
│  │     │  │  ├─ fruity.py
│  │     │  │  ├─ gh_dark.py
│  │     │  │  ├─ gruvbox.py
│  │     │  │  ├─ igor.py
│  │     │  │  ├─ inkpot.py
│  │     │  │  ├─ lightbulb.py
│  │     │  │  ├─ lilypond.py
│  │     │  │  ├─ lovelace.py
│  │     │  │  ├─ manni.py
│  │     │  │  ├─ material.py
│  │     │  │  ├─ monokai.py
│  │     │  │  ├─ murphy.py
│  │     │  │  ├─ native.py
│  │     │  │  ├─ night_owl.py
│  │     │  │  ├─ nord.py
│  │     │  │  ├─ onedark.py
│  │     │  │  ├─ paraiso_dark.py
│  │     │  │  ├─ paraiso_light.py
│  │     │  │  ├─ pastie.py
│  │     │  │  ├─ perldoc.py
│  │     │  │  ├─ rainbow_dash.py
│  │     │  │  ├─ rrt.py
│  │     │  │  ├─ sas.py
│  │     │  │  ├─ solarized.py
│  │     │  │  ├─ staroffice.py
│  │     │  │  ├─ stata_dark.py
│  │     │  │  ├─ stata_light.py
│  │     │  │  ├─ tango.py
│  │     │  │  ├─ trac.py
│  │     │  │  ├─ vim.py
│  │     │  │  ├─ vs.py
│  │     │  │  ├─ xcode.py
│  │     │  │  ├─ zenburn.py
│  │     │  │  ├─ _mapping.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ token.py
│  │     │  ├─ unistring.py
│  │     │  ├─ util.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ pygments-2.21.0.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ AUTHORS
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ pytest
│  │     │  ├─ py.typed
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ pytest-9.1.1.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ python_dotenv-1.2.4.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ pyyaml-6.0.3.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ requests
│  │     │  ├─ adapters.py
│  │     │  ├─ api.py
│  │     │  ├─ auth.py
│  │     │  ├─ certs.py
│  │     │  ├─ compat.py
│  │     │  ├─ cookies.py
│  │     │  ├─ exceptions.py
│  │     │  ├─ help.py
│  │     │  ├─ hooks.py
│  │     │  ├─ models.py
│  │     │  ├─ packages.py
│  │     │  ├─ py.typed
│  │     │  ├─ sessions.py
│  │     │  ├─ status_codes.py
│  │     │  ├─ structures.py
│  │     │  ├─ utils.py
│  │     │  ├─ _internal_utils.py
│  │     │  ├─ _types.py
│  │     │  ├─ __init__.py
│  │     │  └─ __version__.py
│  │     ├─ requests-2.34.2.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  ├─ LICENSE
│  │     │  │  └─ NOTICE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ sniffio
│  │     │  ├─ py.typed
│  │     │  ├─ _impl.py
│  │     │  ├─ _tests
│  │     │  │  ├─ test_sniffio.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _version.py
│  │     │  └─ __init__.py
│  │     ├─ sniffio-1.3.1.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ LICENSE
│  │     │  ├─ LICENSE.APACHE2
│  │     │  ├─ LICENSE.MIT
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ starlette
│  │     │  ├─ applications.py
│  │     │  ├─ authentication.py
│  │     │  ├─ background.py
│  │     │  ├─ concurrency.py
│  │     │  ├─ config.py
│  │     │  ├─ convertors.py
│  │     │  ├─ datastructures.py
│  │     │  ├─ endpoints.py
│  │     │  ├─ exceptions.py
│  │     │  ├─ formparsers.py
│  │     │  ├─ middleware
│  │     │  │  ├─ authentication.py
│  │     │  │  ├─ base.py
│  │     │  │  ├─ body_limit.py
│  │     │  │  ├─ cors.py
│  │     │  │  ├─ errors.py
│  │     │  │  ├─ exceptions.py
│  │     │  │  ├─ gzip.py
│  │     │  │  ├─ httpsredirect.py
│  │     │  │  ├─ opentelemetry.py
│  │     │  │  ├─ sessions.py
│  │     │  │  ├─ trustedhost.py
│  │     │  │  ├─ wsgi.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ py.typed
│  │     │  ├─ requests.py
│  │     │  ├─ responses.py
│  │     │  ├─ routing.py
│  │     │  ├─ schemas.py
│  │     │  ├─ staticfiles.py
│  │     │  ├─ status.py
│  │     │  ├─ templating.py
│  │     │  ├─ testclient.py
│  │     │  ├─ types.py
│  │     │  ├─ websockets.py
│  │     │  ├─ _exception_handler.py
│  │     │  ├─ _utils.py
│  │     │  └─ __init__.py
│  │     ├─ starlette-1.8.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ truststore
│  │     │  ├─ py.typed
│  │     │  ├─ _api.py
│  │     │  ├─ _macos.py
│  │     │  ├─ _openssl.py
│  │     │  ├─ _ssl_constants.py
│  │     │  ├─ _windows.py
│  │     │  └─ __init__.py
│  │     ├─ truststore-0.10.5.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ typing_extensions-4.16.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ typing_extensions.py
│  │     ├─ typing_inspection
│  │     │  ├─ introspection.py
│  │     │  ├─ py.typed
│  │     │  ├─ typing_objects.py
│  │     │  ├─ typing_objects.pyi
│  │     │  └─ __init__.py
│  │     ├─ typing_inspection-0.4.4.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ urllib3
│  │     │  ├─ connection.py
│  │     │  ├─ connectionpool.py
│  │     │  ├─ contrib
│  │     │  │  ├─ emscripten
│  │     │  │  │  ├─ connection.py
│  │     │  │  │  ├─ emscripten_fetch_worker.js
│  │     │  │  │  ├─ fetch.py
│  │     │  │  │  ├─ request.py
│  │     │  │  │  ├─ response.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ pyopenssl.py
│  │     │  │  ├─ socks.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ exceptions.py
│  │     │  ├─ fields.py
│  │     │  ├─ filepost.py
│  │     │  ├─ http2
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ probe.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ poolmanager.py
│  │     │  ├─ py.typed
│  │     │  ├─ response.py
│  │     │  ├─ util
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ proxy.py
│  │     │  │  ├─ request.py
│  │     │  │  ├─ response.py
│  │     │  │  ├─ retry.py
│  │     │  │  ├─ ssltransport.py
│  │     │  │  ├─ ssl_.py
│  │     │  │  ├─ ssl_match_hostname.py
│  │     │  │  ├─ timeout.py
│  │     │  │  ├─ url.py
│  │     │  │  ├─ util.py
│  │     │  │  ├─ wait.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _base_connection.py
│  │     │  ├─ _collections.py
│  │     │  ├─ _request_methods.py
│  │     │  ├─ _version.py
│  │     │  └─ __init__.py
│  │     ├─ urllib3-2.8.0.dist-info
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.txt
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  └─ WHEEL
│  │     ├─ uvicorn
│  │     │  ├─ config.py
│  │     │  ├─ importer.py
│  │     │  ├─ lifespan
│  │     │  │  ├─ off.py
│  │     │  │  ├─ on.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ logging.py
│  │     │  ├─ loops
│  │     │  │  ├─ asyncio.py
│  │     │  │  ├─ auto.py
│  │     │  │  ├─ uvloop.py
│  │     │  │  ├─ zuvloop.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ main.py
│  │     │  ├─ middleware
│  │     │  │  ├─ asgi2.py
│  │     │  │  ├─ message_logger.py
│  │     │  │  ├─ proxy_headers.py
│  │     │  │  ├─ wsgi.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ protocols
│  │     │  │  ├─ http
│  │     │  │  │  ├─ auto.py
│  │     │  │  │  ├─ auto_zttp_impl.py
│  │     │  │  │  ├─ flow_control.py
│  │     │  │  │  ├─ h11_impl.py
│  │     │  │  │  ├─ httptools_impl.py
│  │     │  │  │  ├─ zttp_h2_impl.py
│  │     │  │  │  ├─ zttp_impl.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  ├─ utils.py
│  │     │  │  ├─ websockets
│  │     │  │  │  ├─ auto.py
│  │     │  │  │  ├─ websockets_impl.py
│  │     │  │  │  ├─ websockets_sansio_impl.py
│  │     │  │  │  ├─ wsproto_impl.py
│  │     │  │  │  └─ __init__.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ py.typed
│  │     │  ├─ server.py
│  │     │  ├─ supervisors
│  │     │  │  ├─ basereload.py
│  │     │  │  ├─ multiprocess.py
│  │     │  │  ├─ statreload.py
│  │     │  │  ├─ watchfilesreload.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ workers.py
│  │     │  ├─ _ansi.py
│  │     │  ├─ _compat.py
│  │     │  ├─ _subprocess.py
│  │     │  ├─ _types.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ uvicorn-0.54.0.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE.md
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ REQUESTED
│  │     │  └─ WHEEL
│  │     ├─ watchfiles
│  │     │  ├─ cli.py
│  │     │  ├─ filters.py
│  │     │  ├─ main.py
│  │     │  ├─ py.typed
│  │     │  ├─ run.py
│  │     │  ├─ version.py
│  │     │  ├─ _rust_notify.pyd
│  │     │  ├─ _rust_notify.pyi
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ watchfiles-1.3.0.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ sboms
│  │     │  │  └─ watchfiles_rust_notify.cyclonedx.json
│  │     │  └─ WHEEL
│  │     ├─ websockets
│  │     │  ├─ asyncio
│  │     │  │  ├─ client.py
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ messages.py
│  │     │  │  ├─ router.py
│  │     │  │  ├─ server.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ auth.py
│  │     │  ├─ cli.py
│  │     │  ├─ client.py
│  │     │  ├─ connection.py
│  │     │  ├─ datastructures.py
│  │     │  ├─ exceptions.py
│  │     │  ├─ extensions
│  │     │  │  ├─ base.py
│  │     │  │  ├─ permessage_deflate.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ frames.py
│  │     │  ├─ headers.py
│  │     │  ├─ http11.py
│  │     │  ├─ imports.py
│  │     │  ├─ legacy
│  │     │  │  ├─ auth.py
│  │     │  │  ├─ client.py
│  │     │  │  ├─ exceptions.py
│  │     │  │  ├─ framing.py
│  │     │  │  ├─ handshake.py
│  │     │  │  ├─ http.py
│  │     │  │  ├─ protocol.py
│  │     │  │  ├─ server.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ protocol.py
│  │     │  ├─ proxy.py
│  │     │  ├─ py.typed
│  │     │  ├─ server.py
│  │     │  ├─ speedups.c
│  │     │  ├─ speedups.cp314-win_amd64.pyd
│  │     │  ├─ speedups.pyi
│  │     │  ├─ streams.py
│  │     │  ├─ sync
│  │     │  │  ├─ client.py
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ messages.py
│  │     │  │  ├─ router.py
│  │     │  │  ├─ server.py
│  │     │  │  ├─ utils.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ trio
│  │     │  │  ├─ client.py
│  │     │  │  ├─ connection.py
│  │     │  │  ├─ messages.py
│  │     │  │  ├─ router.py
│  │     │  │  ├─ server.py
│  │     │  │  ├─ utils.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ typing.py
│  │     │  ├─ uri.py
│  │     │  ├─ utils.py
│  │     │  ├─ version.py
│  │     │  ├─ __init__.py
│  │     │  └─ __main__.py
│  │     ├─ websockets-17.2.dist-info
│  │     │  ├─ entry_points.txt
│  │     │  ├─ INSTALLER
│  │     │  ├─ licenses
│  │     │  │  └─ LICENSE
│  │     │  ├─ METADATA
│  │     │  ├─ RECORD
│  │     │  ├─ top_level.txt
│  │     │  └─ WHEEL
│  │     ├─ yaml
│  │     │  ├─ composer.py
│  │     │  ├─ constructor.py
│  │     │  ├─ cyaml.py
│  │     │  ├─ dumper.py
│  │     │  ├─ emitter.py
│  │     │  ├─ error.py
│  │     │  ├─ events.py
│  │     │  ├─ loader.py
│  │     │  ├─ nodes.py
│  │     │  ├─ parser.py
│  │     │  ├─ reader.py
│  │     │  ├─ representer.py
│  │     │  ├─ resolver.py
│  │     │  ├─ scanner.py
│  │     │  ├─ serializer.py
│  │     │  ├─ tokens.py
│  │     │  ├─ _yaml.cp314-win_amd64.pyd
│  │     │  └─ __init__.py
│  │     ├─ _pytest
│  │     │  ├─ assertion
│  │     │  │  ├─ compare_text.py
│  │     │  │  ├─ highlight.py
│  │     │  │  ├─ rewrite.py
│  │     │  │  ├─ truncate.py
│  │     │  │  ├─ util.py
│  │     │  │  ├─ _compare_any.py
│  │     │  │  ├─ _compare_mapping.py
│  │     │  │  ├─ _compare_sequence.py
│  │     │  │  ├─ _compare_set.py
│  │     │  │  ├─ _guards.py
│  │     │  │  ├─ _typing.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ cacheprovider.py
│  │     │  ├─ capture.py
│  │     │  ├─ compat.py
│  │     │  ├─ config
│  │     │  │  ├─ argparsing.py
│  │     │  │  ├─ exceptions.py
│  │     │  │  ├─ findpaths.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ debugging.py
│  │     │  ├─ deprecated.py
│  │     │  ├─ doctest.py
│  │     │  ├─ faulthandler.py
│  │     │  ├─ fixtures.py
│  │     │  ├─ freeze_support.py
│  │     │  ├─ helpconfig.py
│  │     │  ├─ hookspec.py
│  │     │  ├─ junitxml.py
│  │     │  ├─ legacypath.py
│  │     │  ├─ logging.py
│  │     │  ├─ main.py
│  │     │  ├─ mark
│  │     │  │  ├─ expression.py
│  │     │  │  ├─ structures.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ monkeypatch.py
│  │     │  ├─ nodes.py
│  │     │  ├─ outcomes.py
│  │     │  ├─ pastebin.py
│  │     │  ├─ pathlib.py
│  │     │  ├─ py.typed
│  │     │  ├─ pytester.py
│  │     │  ├─ pytester_assertions.py
│  │     │  ├─ python.py
│  │     │  ├─ python_api.py
│  │     │  ├─ raises.py
│  │     │  ├─ recwarn.py
│  │     │  ├─ reports.py
│  │     │  ├─ runner.py
│  │     │  ├─ scope.py
│  │     │  ├─ setuponly.py
│  │     │  ├─ setupplan.py
│  │     │  ├─ skipping.py
│  │     │  ├─ stash.py
│  │     │  ├─ stepwise.py
│  │     │  ├─ subtests.py
│  │     │  ├─ terminal.py
│  │     │  ├─ terminalprogress.py
│  │     │  ├─ threadexception.py
│  │     │  ├─ timing.py
│  │     │  ├─ tmpdir.py
│  │     │  ├─ tracemalloc.py
│  │     │  ├─ unittest.py
│  │     │  ├─ unraisableexception.py
│  │     │  ├─ warnings.py
│  │     │  ├─ warning_types.py
│  │     │  ├─ _argcomplete.py
│  │     │  ├─ _code
│  │     │  │  ├─ code.py
│  │     │  │  ├─ source.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _io
│  │     │  │  ├─ pprint.py
│  │     │  │  ├─ saferepr.py
│  │     │  │  ├─ terminalwriter.py
│  │     │  │  ├─ wcwidth.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _py
│  │     │  │  ├─ error.py
│  │     │  │  ├─ path.py
│  │     │  │  └─ __init__.py
│  │     │  ├─ _version.py
│  │     │  └─ __init__.py
│  │     └─ _yaml
│  │        └─ __init__.py
│  ├─ pyvenv.cfg
│  └─ Scripts
│     ├─ activate
│     ├─ activate.bat
│     ├─ activate.fish
│     ├─ Activate.ps1
│     ├─ deactivate.bat
│     ├─ dotenv.exe
│     ├─ fastapi.exe
│     ├─ httpx.exe
│     ├─ httpx2.exe
│     ├─ idna.exe
│     ├─ normalizer.exe
│     ├─ pip.exe
│     ├─ pip3.14.exe
│     ├─ pip3.exe
│     ├─ py.test.exe
│     ├─ pygmentize.exe
│     ├─ pytest.exe
│     ├─ python.exe
│     ├─ pythonw.exe
│     ├─ uvicorn.exe
│     ├─ watchfiles.exe
│     └─ websockets.exe
├─ app
│  ├─ db.py
│  ├─ detectors.py
│  ├─ events.py
│  ├─ main.py
│  ├─ matchinfo.py
│  ├─ narrator.py
│  ├─ simulate.py
│  ├─ store.py
│  └─ __init__.py
├─ data
│  └─ sample_match.json
├─ Dockerfile
├─ frontend-starter
│  ├─ App.tsx
│  ├─ types.ts
│  └─ useInsightStream.ts
├─ list_models.py
├─ pytest.ini
├─ README.md
├─ requirements.txt
├─ scripts
│  ├─ check_db.py
│  └─ smoke_nvidia.py
├─ simulate_match.py
├─ tests
│  ├─ conftest.py
│  ├─ test_api.py
│  ├─ test_backbone.py
│  └─ test_detectors.py
└─ web
   ├─ .oxlintrc.json
   ├─ components.json
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ public
   │  ├─ favicon.svg
   │  └─ icons.svg
   ├─ README.md
   ├─ src
   │  ├─ Actions.tsx
   │  ├─ api.ts
   │  ├─ App.tsx
   │  ├─ index.css
   │  ├─ InsightCard.tsx
   │  ├─ lib
   │  │  └─ utils.ts
   │  ├─ main.tsx
   │  ├─ match.ts
   │  ├─ matchContext.ts
   │  ├─ MatchProvider.tsx
   │  ├─ pages
   │  │  ├─ AboutPage.tsx
   │  │  ├─ AnnouncersPage.tsx
   │  │  ├─ FansPage.tsx
   │  │  ├─ InsightPage.tsx
   │  │  ├─ LivePage.tsx
   │  │  └─ RecapPage.tsx
   │  ├─ Pitch.tsx
   │  ├─ Recap.tsx
   │  ├─ share.ts
   │  ├─ types.ts
   │  ├─ useHashRoute.ts
   │  ├─ useMatchStream.ts
   │  └─ vite-env.d.ts
   ├─ tsconfig.app.json
   ├─ tsconfig.json
   ├─ tsconfig.node.json
   └─ vite.config.ts

```
```
why-it-happened
├─ app
│  ├─ db.py
│  ├─ detectors.py
│  ├─ events.py
│  ├─ main.py
│  ├─ matchinfo.py
│  ├─ narrator.py
│  ├─ simulate.py
│  ├─ store.py
│  └─ __init__.py
├─ data
│  └─ sample_match.json
├─ Dockerfile
├─ frontend-starter
│  ├─ App.tsx
│  ├─ types.ts
│  └─ useInsightStream.ts
├─ list_models.py
├─ pytest.ini
├─ README.md
├─ requirements.txt
├─ scripts
│  ├─ check_db.py
│  └─ smoke_nvidia.py
├─ simulate_match.py
├─ tests
│  ├─ conftest.py
│  ├─ test_api.py
│  ├─ test_backbone.py
│  └─ test_detectors.py
└─ web
   ├─ .oxlintrc.json
   ├─ components.json
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ public
   │  ├─ favicon.svg
   │  └─ icons.svg
   ├─ README.md
   ├─ src
   │  ├─ Actions.tsx
   │  ├─ api.ts
   │  ├─ App.tsx
   │  ├─ index.css
   │  ├─ InsightCard.tsx
   │  ├─ lib
   │  │  └─ utils.ts
   │  ├─ main.tsx
   │  ├─ match.ts
   │  ├─ matchContext.ts
   │  ├─ MatchProvider.tsx
   │  ├─ pages
   │  │  ├─ AboutPage.tsx
   │  │  ├─ AnnouncersPage.tsx
   │  │  ├─ FansPage.tsx
   │  │  ├─ InsightPage.tsx
   │  │  ├─ LivePage.tsx
   │  │  └─ RecapPage.tsx
   │  ├─ Pitch.tsx
   │  ├─ Recap.tsx
   │  ├─ share.ts
   │  ├─ types.ts
   │  ├─ useHashRoute.ts
   │  ├─ useMatchStream.ts
   │  └─ vite-env.d.ts
   ├─ tsconfig.app.json
   ├─ tsconfig.json
   ├─ tsconfig.node.json
   └─ vite.config.ts

```
```
why-it-happened
├─ .dockerignore
├─ app
├─ data
│  ├─ demo_match.json
│  └─ sample_match.json
├─ Dockerfile
├─ frontend-starter
│  ├─ App.tsx
│  ├─ types.ts
│  └─ useInsightStream.ts
├─ pytest.ini
├─ README.md
├─ requirements.txt
├─ scripts
├─ tests
└─ web
   ├─ .oxlintrc.json
   ├─ components.json
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ public
   │  ├─ favicon.svg
   │  └─ icons.svg
   ├─ README.md
   ├─ src
   │  ├─ Actions.tsx
   │  ├─ analytics.ts
   │  ├─ AnimatedNumber.tsx
   │  ├─ api.ts
   │  ├─ App.tsx
   │  ├─ charts.tsx
   │  ├─ icons.tsx
   │  ├─ index.css
   │  ├─ InsightCard.tsx
   │  ├─ lib
   │  │  └─ utils.ts
   │  ├─ Loader.tsx
   │  ├─ main.tsx
   │  ├─ match.ts
   │  ├─ matchContext.ts
   │  ├─ MatchProvider.tsx
   │  ├─ pages
   │  │  ├─ AboutPage.tsx
   │  │  ├─ AnalyticsPage.tsx
   │  │  ├─ AnnouncersPage.tsx
   │  │  ├─ FansPage.tsx
   │  │  ├─ InsightPage.tsx
   │  │  ├─ LivePage.tsx
   │  │  ├─ PlayerPage.tsx
   │  │  ├─ PlayersPage.tsx
   │  │  └─ RecapPage.tsx
   │  ├─ Pitch.tsx
   │  ├─ PlayerName.tsx
   │  ├─ players.ts
   │  ├─ PowerSwitch.tsx
   │  ├─ Recap.tsx
   │  ├─ ReviewPanel.tsx
   │  ├─ share.ts
   │  ├─ Sidebar.tsx
   │  ├─ Switch.tsx
   │  ├─ types.ts
   │  ├─ useApi.ts
   │  ├─ useHashRoute.ts
   │  ├─ useMatchStream.ts
   │  ├─ useTheme.ts
   │  └─ vite-env.d.ts
   ├─ tsconfig.app.json
   ├─ tsconfig.json
   ├─ tsconfig.node.json
   └─ vite.config.ts

```