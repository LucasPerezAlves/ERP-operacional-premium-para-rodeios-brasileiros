package com.arena.rodeio.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Payload padrão dos Database Webhooks do Supabase:
 * { "type": "INSERT", "table": "...", "schema": "...", "record": {...} }
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SupabaseWebhookPayload(
    String type,
    String table,
    String schema,
    @JsonProperty("record") Map<String, Object> registro
) {}
