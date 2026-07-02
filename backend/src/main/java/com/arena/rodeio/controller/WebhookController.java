package com.arena.rodeio.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.SupabaseWebhookPayload;
import com.arena.rodeio.service.AprovacaoTokenService;
import com.arena.rodeio.service.EmailService;

/**
 * Recebe o Database Webhook do Supabase disparado a cada INSERT em
 * perfis_funcionarios (ou seja, a cada cadastro novo — a trigger do banco
 * cria o perfil no mesmo instante do signUp).
 *
 * Configuração no Supabase: Database > Webhooks > Create webhook
 *   - Table: perfis_funcionarios | Events: INSERT
 *   - URL: {APP_PUBLIC_BASE_URL}/api/webhooks/novo-cadastro
 *   - HTTP Header: X-Webhook-Secret = {APP_WEBHOOK_SECRET}
 */
@RestController
@RequestMapping("/api/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final EmailService emailService;
    private final AprovacaoTokenService tokenService;
    private final String webhookSecret;
    private final String publicBaseUrl;

    public WebhookController(EmailService emailService,
                             AprovacaoTokenService tokenService,
                             @Value("${app.seguranca.webhook-secret}") String webhookSecret,
                             @Value("${app.public-base-url}") String publicBaseUrl) {
        this.emailService = emailService;
        this.tokenService = tokenService;
        this.webhookSecret = webhookSecret;
        this.publicBaseUrl = publicBaseUrl;
    }

    @PostMapping("/novo-cadastro")
    public ResponseEntity<Void> novoCadastro(
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secretRecebido,
            @RequestBody SupabaseWebhookPayload payload) {

        if (!segredoValido(secretRecebido)) {
            log.warn("Webhook recusado: segredo ausente ou inválido.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (!"INSERT".equalsIgnoreCase(payload.type())
                || !"perfis_funcionarios".equals(payload.table())
                || payload.registro() == null) {
            // Evento que não interessa; responde 200 para o Supabase não reenviar
            return ResponseEntity.ok().build();
        }

        var userId = UUID.fromString(String.valueOf(payload.registro().get("id")));
        var nome = String.valueOf(payload.registro().getOrDefault("nome_completo", ""));
        var email = String.valueOf(payload.registro().getOrDefault("email", ""));

        var linkAprovacao = "%s/api/auth/aprovar?userId=%s&token=%s"
            .formatted(publicBaseUrl, userId, tokenService.gerarToken(userId));

        emailService.enviarPedidoAprovacao(nome, email, linkAprovacao);
        log.info("Pedido de aprovação enviado à gerência para o cadastro {}", userId);

        return ResponseEntity.ok().build();
    }

    private boolean segredoValido(String recebido) {
        if (recebido == null) {
            return false;
        }
        return MessageDigest.isEqual(
            webhookSecret.getBytes(StandardCharsets.UTF_8),
            recebido.getBytes(StandardCharsets.UTF_8));
    }
}
