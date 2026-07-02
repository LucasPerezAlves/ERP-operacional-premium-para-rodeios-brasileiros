package com.arena.rodeio.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * O link "Aprovar Peão" do e-mail é público (a gerência clica sem estar
 * logada), então ele carrega um token HMAC-SHA256 do userId assinado com um
 * segredo do servidor. Sem o token correto, o endpoint de aprovação recusa —
 * impede que qualquer pessoa com um UUID aprove cadastros.
 */
@Service
public class AprovacaoTokenService {

    private static final String ALGORITMO = "HmacSHA256";

    private final String segredo;

    public AprovacaoTokenService(@Value("${app.seguranca.aprovacao-secret}") String segredo) {
        this.segredo = segredo;
    }

    public String gerarToken(UUID userId) {
        try {
            var mac = Mac.getInstance(ALGORITMO);
            mac.init(new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), ALGORITMO));
            byte[] assinatura = mac.doFinal(userId.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(assinatura);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Falha ao gerar token de aprovação", exception);
        }
    }

    /** Comparação em tempo constante para evitar timing attacks. */
    public boolean validarToken(UUID userId, String token) {
        byte[] esperado = gerarToken(userId).getBytes(StandardCharsets.UTF_8);
        byte[] recebido = token.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(esperado, recebido);
    }
}
