package cyberlab.burp;

import burp.api.montoya.BurpExtension;
import burp.api.montoya.MontoyaApi;
import burp.api.montoya.http.message.requests.HttpRequest;
import burp.api.montoya.proxy.http.InterceptedRequest;
import burp.api.montoya.proxy.http.InterceptedResponse;
import burp.api.montoya.proxy.http.ProxyRequestHandler;
import burp.api.montoya.proxy.http.ProxyRequestReceivedAction;
import burp.api.montoya.proxy.http.ProxyRequestToBeSentAction;
import burp.api.montoya.proxy.http.ProxyResponseHandler;
import burp.api.montoya.proxy.http.ProxyResponseReceivedAction;
import burp.api.montoya.proxy.http.ProxyResponseToBeSentAction;
import burp.api.montoya.http.message.HttpHeader;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CyberLabBurpExtension
        implements BurpExtension, ProxyRequestHandler, ProxyResponseHandler {

    private static final String DEFAULT_CYBERLAB_URL =
            "http://127.0.0.1:3000";

    private static final String BRIDGE_PATH =
            "/api/integrations/burp/bridge/traffic";

    private static final String INTERCEPT_STATE_PATH =
            "/api/integrations/burp/bridge/intercept";

    private static final String INTERCEPT_DECISION_PATH =
            "/api/integrations/burp/bridge/intercept/";

    private static final long INTERCEPT_POLL_MS =
            250L;

    private static final long INTERCEPT_TIMEOUT_MS =
            30L * 60L * 1000L;

    private final Map<Integer, Long> requestStartTimes =
            new ConcurrentHashMap<>();

    private final Map<Integer, InterceptedRequest> pendingRequests =
            new ConcurrentHashMap<>();

    private final ExecutorService bridgeExecutor =
            Executors.newSingleThreadExecutor(runnable -> {
                Thread thread = new Thread(
                        runnable,
                        "cyberlab-burp-bridge"
                );
                thread.setDaemon(true);
                return thread;
            });

    private HttpClient httpClient;
    private String cyberLabBaseUrl;
    private String bridgeToken;
    private MontoyaApi api;

    @Override
    public void initialize(MontoyaApi api) {
        this.api = api;

        cyberLabBaseUrl = normalizeBaseUrl(
                System.getenv("CYBERLAB_BURP_BRIDGE_URL")
        );

        if (cyberLabBaseUrl == null) {
            cyberLabBaseUrl = DEFAULT_CYBERLAB_URL;
        }

        bridgeToken = valueOrEmpty(
                System.getenv("CYBERLAB_BURP_BRIDGE_TOKEN")
        );

        httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();

        api.extension().setName("CyberLab Burp Bridge");

        api.proxy().registerRequestHandler(this);
        api.proxy().registerResponseHandler(this);

        log(
                "CyberLab Burp Bridge initialized. " +
                "CyberLab endpoint: " +
                cyberLabBaseUrl +
                BRIDGE_PATH
        );

        if (bridgeToken.isEmpty()) {
            log(
                "WARNING: CYBERLAB_BURP_BRIDGE_TOKEN is not configured. " +
                "Traffic will be observed but bridge submissions will fail."
            );
        }
    }

    @Override
    public ProxyRequestReceivedAction handleRequestReceived(
            InterceptedRequest request
    ) {
        requestStartTimes.put(
                request.messageId(),
                System.nanoTime()
        );

        pendingRequests.put(
                request.messageId(),
                request
        );

        if (bridgeToken.isEmpty()) {
            return ProxyRequestReceivedAction.continueWith(request);
        }

        try {
            if (!isCyberLabInterceptEnabled()) {
                return ProxyRequestReceivedAction.continueWith(request);
            }

            return handleCyberLabInterception(request);
        } catch (Exception error) {
            log(
                    "CyberLab interception failed; " +
                    "allowing request through: " +
                    error.getMessage()
            );

            return ProxyRequestReceivedAction.continueWith(request);
        }
    }

    @Override
    public ProxyRequestToBeSentAction handleRequestToBeSent(
            InterceptedRequest request
    ) {
        return ProxyRequestToBeSentAction.continueWith(request);
    }

    @Override
    public ProxyResponseReceivedAction handleResponseReceived(
            InterceptedResponse response
    ) {
        InterceptedRequest request =
                pendingRequests.get(response.messageId());

        if (request != null) {
            long startedAt =
                    requestStartTimes.getOrDefault(
                            request.messageId(),
                            System.nanoTime()
                    );

            long durationMs =
                    Math.max(
                            0L,
                            (System.nanoTime() - startedAt) / 1_000_000L
                    );

            requestStartTimes.remove(request.messageId());
            pendingRequests.remove(request.messageId());

            submitTrafficAsync(
                    request,
                    response,
                    durationMs
            );
        }

        return ProxyResponseReceivedAction.continueWith(response);
    }

    @Override
    public ProxyResponseToBeSentAction handleResponseToBeSent(
            InterceptedResponse response
    ) {
        return ProxyResponseToBeSentAction.continueWith(response);
    }

    private ProxyRequestReceivedAction handleCyberLabInterception(
            InterceptedRequest request
    ) throws Exception {
        String recordId =
                "burp-proxy-" +
                request.messageId() +
                "-" +
                UUID.randomUUID();

        String json =
                buildHeldRequestJson(
                        recordId,
                        request
                );

        java.net.http.HttpRequest bridgeRequest =
                java.net.http.HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        cyberLabBaseUrl +
                                        BRIDGE_PATH
                                )
                        )
                        .timeout(Duration.ofSeconds(5))
                        .header(
                                "Content-Type",
                                "application/json"
                        )
                        .header(
                                "X-CyberLab-Burp-Token",
                                bridgeToken
                        )
                        .POST(
                                java.net.http.HttpRequest.BodyPublishers.ofString(
                                        json,
                                        StandardCharsets.UTF_8
                                )
                        )
                        .build();

        HttpResponse<String> bridgeResponse =
                httpClient.send(
                        bridgeRequest,
                        HttpResponse.BodyHandlers.ofString()
                );

        if (
                bridgeResponse.statusCode() < 200 ||
                bridgeResponse.statusCode() >= 300
        ) {
            throw new IllegalStateException(
                    "CyberLab rejected held request. HTTP " +
                    bridgeResponse.statusCode()
            );
        }

        log(
                "CyberLab intercepted Burp request " +
                recordId +
                " " +
                request.method() +
                " " +
                request.url()
        );

        long deadline =
                System.currentTimeMillis() +
                INTERCEPT_TIMEOUT_MS;

        try {
            while (
                    System.currentTimeMillis() < deadline
            ) {
                InterceptDecision decision =
                        getCyberLabInterceptDecision(
                                recordId
                        );

                if (decision == null) {
                    Thread.sleep(
                            INTERCEPT_POLL_MS
                    );
                    continue;
                }

                if ("dropped".equalsIgnoreCase(
                        decision.state
                )) {
                    log(
                            "CyberLab dropped Burp request " +
                            recordId
                    );

                    return ProxyRequestReceivedAction.drop();
                }

                if ("forwarded".equalsIgnoreCase(
                        decision.state
                )) {
                    HttpRequest modified =
                            applyCyberLabRequestEdits(
                                    request,
                                    decision
                            );

                    log(
                            "CyberLab forwarded Burp request " +
                            recordId
                    );

                    return ProxyRequestReceivedAction
                            .continueWith(modified);
                }

                Thread.sleep(
                        INTERCEPT_POLL_MS
                );
            }

            log(
                    "CyberLab interception timed out for " +
                    recordId +
                    "; allowing original request through."
            );

            return ProxyRequestReceivedAction
                    .continueWith(request);
        } finally {
            pendingRequests.remove(
                    request.messageId()
            );
        }
    }

    private boolean isCyberLabInterceptEnabled()
            throws Exception {
        java.net.http.HttpRequest request =
                java.net.http.HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        cyberLabBaseUrl +
                                        INTERCEPT_STATE_PATH
                                )
                        )
                        .timeout(Duration.ofSeconds(3))
                        .header(
                                "X-CyberLab-Burp-Token",
                                bridgeToken
                        )
                        .GET()
                        .build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        if (response.statusCode() != 200) {
            return false;
        }

        String body =
                response.body() == null
                        ? ""
                        : response.body();

        return body.contains("enabled=1");
    }

    private InterceptDecision getCyberLabInterceptDecision(
            String recordId
    ) throws Exception {
        java.net.http.HttpRequest request =
                java.net.http.HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        cyberLabBaseUrl +
                                        INTERCEPT_DECISION_PATH +
                                        encodePathSegment(recordId)
                                )
                        )
                        .timeout(Duration.ofSeconds(3))
                        .header(
                                "X-CyberLab-Burp-Token",
                                bridgeToken
                        )
                        .GET()
                        .build();

        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );

        if (response.statusCode() == 404) {
            return null;
        }

        if (response.statusCode() != 200) {
            throw new IllegalStateException(
                    "CyberLab decision endpoint returned HTTP " +
                    response.statusCode()
            );
        }

        return parseInterceptDecision(
                response.body()
        );
    }

    private static String encodePathSegment(
            String value
    ) {
        return java.net.URLEncoder
                .encode(
                        value,
                        StandardCharsets.UTF_8
                )
                .replace("+", "%20");
    }

    private static InterceptDecision parseInterceptDecision(
            String body
    ) {
        InterceptDecision decision =
                new InterceptDecision();

        if (body == null) {
            return decision;
        }

        String[] lines =
                body.split("\\R");

        for (String line : lines) {
            int separator =
                    line.indexOf('=');

            if (separator <= 0) {
                continue;
            }

            String key =
                    line.substring(
                            0,
                            separator
                    );

            String value =
                    line.substring(
                            separator + 1
                    );

            switch (key) {
                case "state" ->
                        decision.state = value;

                case "method_b64" ->
                        decision.method =
                                decodeBase64(value);

                case "url_b64" ->
                        decision.url =
                                decodeBase64(value);

                case "body_b64" ->
                        decision.body =
                                decodeBase64(value);

                case "header_b64" -> {
                    int split =
                            value.indexOf(':');

                    if (split > 0) {
                        String name =
                                decodeBase64(
                                        value.substring(
                                                0,
                                                split
                                        )
                                );

                        String headerValue =
                                decodeBase64(
                                        value.substring(
                                                split + 1
                                        )
                                );

                        decision.headers.put(
                                name,
                                headerValue
                        );
                    }
                }

                default -> {
                    // Ignore fields introduced by newer CyberLab versions.
                }
            }
        }

        return decision;
    }

    private static String decodeBase64(
            String value
    ) {
        try {
            return new String(
                    Base64.getDecoder().decode(value),
                    StandardCharsets.UTF_8
            );
        } catch (IllegalArgumentException error) {
            return "";
        }
    }

    private static HttpRequest applyCyberLabRequestEdits(
            InterceptedRequest original,
            InterceptDecision decision
    ) {
        HttpRequest modified;

        if (
                decision.url != null &&
                !decision.url.isBlank() &&
                !decision.url.equals(original.url())
        ) {
            modified =
                    HttpRequest.httpRequestFromUrl(
                            decision.url
                    );
        } else {
            modified = original;
        }

        if (
                decision.method != null &&
                !decision.method.isBlank()
        ) {
            modified =
                    modified.withMethod(
                            decision.method
                    );
        }

        for (HttpHeader header : original.headers()) {
            if (
                    !containsHeaderIgnoreCase(
                            decision.headers,
                            header.name()
                    )
            ) {
                modified =
                        modified.withRemovedHeader(
                                header.name()
                        );
            }
        }

        for (
                Map.Entry<String, String> entry :
                decision.headers.entrySet()
        ) {
            modified =
                    modified.withUpdatedHeader(
                            entry.getKey(),
                            entry.getValue()
                    );
        }

        if (decision.body != null) {
            modified =
                    modified.withBody(
                            decision.body
                    );
        }

        return modified;
    }

    private static boolean containsHeaderIgnoreCase(
            Map<String, String> headers,
            String name
    ) {
        for (String existing : headers.keySet()) {
            if (
                    existing.equalsIgnoreCase(name)
            ) {
                return true;
            }
        }

        return false;
    }

    private static String buildHeldRequestJson(
            String id,
            InterceptedRequest request
    ) {
        Map<String, String> requestHeaders =
                headersToMap(request.headers());

        StringBuilder json =
                new StringBuilder(8192);

        json.append("{");

        appendJsonString(
                json,
                "id",
                id
        );

        appendJsonString(
                json,
                "timestamp",
                Instant.now().toString()
        );

        appendJsonString(
                json,
                "method",
                request.method()
        );

        appendJsonString(
                json,
                "url",
                request.url()
        );

        appendJsonNull(
                json,
                "status"
        );

        appendJsonObject(
                json,
                "requestHeaders",
                requestHeaders
        );

        appendJsonString(
                json,
                "requestBody",
                request.bodyToString()
        );

        appendJsonObject(
                json,
                "responseHeaders",
                new LinkedHashMap<>()
        );

        appendJsonString(
                json,
                "responseBody",
                ""
        );

        appendJsonNumber(
                json,
                "requestBytes",
                request.toByteArray().getBytes().length
        );

        appendJsonNumber(
                json,
                "responseBytes",
                0
        );

        appendJsonNumber(
                json,
                "durationMs",
                0
        );

        appendJsonNull(
                json,
                "mimeType"
        );

        appendJsonNull(
                json,
                "targetId"
        );

        appendJsonString(
                json,
                "requestState",
                "held"
        );

        appendJsonString(
                json,
                "rawRequest",
                request.toString()
        );

        appendJsonString(
                json,
                "rawResponse",
                ""
        );

        appendJsonBoolean(
                json,
                "intercepted",
                true
        );

        appendJsonString(
                json,
                "stateUpdatedAt",
                Instant.now().toString()
        );

        json.append("}");

        return json.toString();
    }

    private static final class InterceptDecision {
        private String state = "held";
        private String method = "GET";
        private String url = "";
        private String body = "";
        private final Map<String, String> headers =
                new LinkedHashMap<>();
    }

    private void submitTrafficAsync(
            InterceptedRequest request,
            InterceptedResponse response,
            long durationMs
    ) {
        if (bridgeToken.isEmpty()) {
            return;
        }

        CompletableFuture.runAsync(
                () -> submitTraffic(
                        request,
                        response,
                        durationMs
                ),
                bridgeExecutor
        );
    }

    private void submitTraffic(
            InterceptedRequest request,
            InterceptedResponse response,
            long durationMs
    ) {
        try {
            Map<String, String> requestHeaders =
                    headersToMap(request.headers());

            Map<String, String> responseHeaders =
                    headersToMap(response.headers());

            byte[] requestBytes =
                    request.toByteArray().getBytes();

            byte[] responseBytes =
                    response.toByteArray().getBytes();

            String mimeType =
                    response.headerValue("Content-Type");

            if (mimeType == null || mimeType.isBlank()) {
                mimeType = null;
            }

            String recordId =
                    "burp-proxy-" +
                    request.messageId() +
                    "-" +
                    UUID.randomUUID();

            String json = buildJson(
                    recordId,
                    request,
                    response,
                    requestHeaders,
                    responseHeaders,
                    requestBytes.length,
                    responseBytes.length,
                    durationMs,
                    mimeType
            );

            java.net.http.HttpRequest bridgeRequest =
                    java.net.http.HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            cyberLabBaseUrl +
                                            BRIDGE_PATH
                                    )
                            )
                            .timeout(Duration.ofSeconds(5))
                            .header(
                                    "Content-Type",
                                    "application/json"
                            )
                            .header(
                                    "X-CyberLab-Burp-Token",
                                    bridgeToken
                            )
                            .POST(
                                    java.net.http.HttpRequest.BodyPublishers.ofString(
                                            json,
                                            StandardCharsets.UTF_8
                                    )
                            )
                            .build();

            httpClient
                    .sendAsync(
                            bridgeRequest,
                            HttpResponse.BodyHandlers.ofString()
                    )
                    .thenAccept(result -> {
                        int status =
                                result.statusCode();

                        if (status < 200 || status >= 300) {
                            log(
                                "CyberLab bridge rejected Burp traffic. " +
                                "HTTP " +
                                status +
                                " for " +
                                request.method() +
                                " " +
                                request.url()
                            );
                        }
                    })
                    .exceptionally(error -> {
                        log(
                            "CyberLab bridge submission failed: " +
                            error.getMessage()
                        );
                        return null;
                    });

        } catch (Exception error) {
            log(
                "Unable to prepare CyberLab Burp traffic: " +
                error.getMessage()
            );
        }
    }

    private static Map<String, String> headersToMap(
            List<HttpHeader> headers
    ) {
        Map<String, String> result =
                new LinkedHashMap<>();

        for (HttpHeader header : headers) {
            result.put(
                    header.name(),
                    header.value()
            );
        }

        return result;
    }

    private static String buildJson(
            String id,
            InterceptedRequest request,
            InterceptedResponse response,
            Map<String, String> requestHeaders,
            Map<String, String> responseHeaders,
            int requestBytes,
            int responseBytes,
            long durationMs,
            String mimeType
    ) {
        StringBuilder json =
                new StringBuilder(8192);

        json.append("{");

        appendJsonString(
                json,
                "id",
                id
        );

        appendJsonString(
                json,
                "timestamp",
                Instant.now().toString()
        );

        appendJsonString(
                json,
                "method",
                request.method()
        );

        appendJsonString(
                json,
                "url",
                request.url()
        );

        appendJsonNumber(
                json,
                "status",
                response.statusCode()
        );

        appendJsonObject(
                json,
                "requestHeaders",
                requestHeaders
        );

        appendJsonString(
                json,
                "requestBody",
                request.bodyToString()
        );

        appendJsonObject(
                json,
                "responseHeaders",
                responseHeaders
        );

        appendJsonString(
                json,
                "responseBody",
                response.bodyToString()
        );

        appendJsonNumber(
                json,
                "requestBytes",
                requestBytes
        );

        appendJsonNumber(
                json,
                "responseBytes",
                responseBytes
        );

        appendJsonNumber(
                json,
                "durationMs",
                durationMs
        );

        if (mimeType == null) {
            appendJsonNull(
                    json,
                    "mimeType"
            );
        } else {
            appendJsonString(
                    json,
                    "mimeType",
                    mimeType
            );
        }

        appendJsonString(
                json,
                "source",
                "burp-proxy"
        );

        appendJsonNull(
                json,
                "targetId"
        );

        appendJsonString(
                json,
                "requestState",
                "forwarded"
        );

        appendJsonString(
                json,
                "rawRequest",
                request.toString()
        );

        appendJsonString(
                json,
                "rawResponse",
                response.toString()
        );

        appendJsonBoolean(
                json,
                "intercepted",
                false
        );

        appendJsonString(
                json,
                "stateUpdatedAt",
                Instant.now().toString()
        );

        json.append("}");

        return json.toString();
    }

    private static void appendJsonString(
            StringBuilder json,
            String key,
            String value
    ) {
        appendComma(json);

        json.append("\"")
                .append(jsonEscape(key))
                .append("\":\"")
                .append(jsonEscape(
                        value == null ? "" : value
                ))
                .append("\"");
    }

    private static void appendJsonNumber(
            StringBuilder json,
            String key,
            long value
    ) {
        appendComma(json);

        json.append("\"")
                .append(jsonEscape(key))
                .append("\":")
                .append(value);
    }

    private static void appendJsonBoolean(
            StringBuilder json,
            String key,
            boolean value
    ) {
        appendComma(json);

        json.append("\"")
                .append(jsonEscape(key))
                .append("\":")
                .append(value);
    }

    private static void appendJsonNull(
            StringBuilder json,
            String key
    ) {
        appendComma(json);

        json.append("\"")
                .append(jsonEscape(key))
                .append("\":null");
    }

    private static void appendJsonObject(
            StringBuilder json,
            String key,
            Map<String, String> values
    ) {
        appendComma(json);

        json.append("\"")
                .append(jsonEscape(key))
                .append("\":{");

        boolean first = true;

        for (Map.Entry<String, String> entry :
                values.entrySet()) {

            if (!first) {
                json.append(",");
            }

            first = false;

            json.append("\"")
                    .append(jsonEscape(entry.getKey()))
                    .append("\":\"")
                    .append(jsonEscape(
                            entry.getValue()
                    ))
                    .append("\"");
        }

        json.append("}");
    }

    private static void appendComma(
            StringBuilder json
    ) {
        if (json.length() > 1) {
            json.append(",");
        }
    }

    private static String jsonEscape(
            String value
    ) {
        if (value == null) {
            return "";
        }

        StringBuilder escaped =
                new StringBuilder(
                        value.length() + 16
                );

        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);

            switch (c) {
                case '"':
                    escaped.append("\\\"");
                    break;

                case '\\':
                    escaped.append("\\\\");
                    break;

                case '\b':
                    escaped.append("\\b");
                    break;

                case '\f':
                    escaped.append("\\f");
                    break;

                case '\n':
                    escaped.append("\\n");
                    break;

                case '\r':
                    escaped.append("\\r");
                    break;

                case '\t':
                    escaped.append("\\t");
                    break;

                default:
                    if (c < 0x20) {
                        escaped.append(
                                String.format(
                                        "\\u%04x",
                                        (int) c
                                )
                        );
                    } else {
                        escaped.append(c);
                    }
            }
        }

        return escaped.toString();
    }

    private static String normalizeBaseUrl(
            String value
    ) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized =
                value.trim();

        while (normalized.endsWith("/")) {
            normalized =
                    normalized.substring(
                            0,
                            normalized.length() - 1
                    );
        }

        return normalized;
    }

    private static String valueOrEmpty(
            String value
    ) {
        return value == null
                ? ""
                : value.trim();
    }

    private void log(String message) {
        if (api != null) {
            api.logging().logToOutput(
                    "[CyberLab Burp Bridge] " +
                    message
            );
        }
    }
}