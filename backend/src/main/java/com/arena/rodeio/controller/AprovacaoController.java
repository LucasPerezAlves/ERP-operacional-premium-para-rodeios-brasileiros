package com.arena.rodeio.controller;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import com.arena.rodeio.service.AprovacaoTokenService;
import com.arena.rodeio.service.PerfilFuncionarioService;

/**
 * Endpoint público clicado pela gerência a partir do e-mail "Aprovar Peão".
 * A proteção é o token HMAC embutido no link — sem ele, nada é aprovado.
 * Responde uma página HTML simples (a gerência abre no navegador).
 */
@RestController
@RequestMapping("/api/auth")
public class AprovacaoController {

    private final PerfilFuncionarioService perfilService;
    private final AprovacaoTokenService tokenService;

    public AprovacaoController(PerfilFuncionarioService perfilService,
                               AprovacaoTokenService tokenService) {
        this.perfilService = perfilService;
        this.tokenService = tokenService;
    }

    @GetMapping(value = "/aprovar", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> aprovar(@RequestParam UUID userId,
                                          @RequestParam String token) {
        if (!tokenService.validarToken(userId, token)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(pagina("Link inválido",
                    "Este link de aprovação não é válido. Use o botão do e-mail original."));
        }

        try {
            var perfil = perfilService.aprovar(userId);
            var nome = perfil.nomeCompleto().isBlank() ? perfil.email() : perfil.nomeCompleto();
            return ResponseEntity.ok(
                pagina("Porteira liberada!",
                    HtmlUtils.htmlEscape(nome) + " foi aprovado e já pode entrar na arena."));
        } catch (ResponseStatusException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(pagina("Cadastro não encontrado",
                    "Este cadastro não existe mais no sistema."));
        }
    }

    private String pagina(String titulo, String mensagem) {
        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8"><title>%s — Controle da Arena</title></head>
            <body style="margin:0;background:#120a05;font-family:Arial,Helvetica,sans-serif;
                         display:flex;align-items:center;justify-content:center;min-height:100vh;">
              <div style="background:#2b1a0e;border:1px solid #6f4a2f;border-radius:16px;
                          padding:48px;max-width:420px;text-align:center;">
                <div style="color:#d4af37;font-size:22px;font-weight:bold;letter-spacing:2px;
                            margin-bottom:8px;">CONTROLE DA ARENA</div>
                <h1 style="color:#f2dd94;font-size:24px;margin:24px 0 12px;">%s</h1>
                <p style="color:#e0c3a0;font-size:15px;margin:0;">%s</p>
              </div>
            </body>
            </html>
            """.formatted(HtmlUtils.htmlEscape(titulo), HtmlUtils.htmlEscape(titulo), mensagem);
    }
}
