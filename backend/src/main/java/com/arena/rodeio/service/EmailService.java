package com.arena.rodeio.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import jakarta.mail.MessagingException;

/**
 * Envia o pedido de aprovação de cadastro para a gerência.
 * E-mail HTML com estilos inline (clientes de e-mail não carregam CSS
 * externo), seguindo a paleta Rodeio Premium do CLAUDE.md.
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String emailGerencia;
    private final String remetente;

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.gerencia.email}") String emailGerencia,
                        @Value("${spring.mail.username}") String remetente) {
        this.mailSender = mailSender;
        this.emailGerencia = emailGerencia;
        this.remetente = remetente;
    }

    public void enviarPedidoAprovacao(String nomeFuncionario,
                                      String emailFuncionario,
                                      String linkAprovacao) {
        try {
            var mensagem = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(mensagem, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(emailGerencia);
            helper.setSubject("Novo peão na porteira — aprovação pendente");
            helper.setText(construirHtml(nomeFuncionario, emailFuncionario, linkAprovacao), true);
            mailSender.send(mensagem);
        } catch (MessagingException exception) {
            throw new IllegalStateException("Falha ao montar o e-mail de aprovação", exception);
        }
    }

    private String construirHtml(String nome, String email, String linkAprovacao) {
        // Dados vindos do cadastro são escapados para evitar injeção de HTML
        var nomeSeguro = HtmlUtils.htmlEscape(nome == null || nome.isBlank() ? "(sem nome)" : nome);
        var emailSeguro = HtmlUtils.htmlEscape(email);

        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <body style="margin:0;padding:0;background-color:#120a05;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                     style="background-color:#120a05;padding:32px 16px;">
                <tr><td align="center">
                  <table role="presentation" width="480" cellpadding="0" cellspacing="0"
                         style="background-color:#2b1a0e;border:1px solid #6f4a2f;border-radius:16px;padding:32px;">
                    <tr><td align="center" style="padding-bottom:8px;">
                      <span style="color:#d4af37;font-size:26px;font-weight:bold;letter-spacing:2px;">
                        CONTROLE DA ARENA
                      </span>
                    </td></tr>
                    <tr><td align="center" style="padding-bottom:24px;">
                      <span style="color:#c69a6d;font-size:12px;letter-spacing:4px;text-transform:uppercase;">
                        Gest&atilde;o Financeira de Rodeio
                      </span>
                    </td></tr>
                    <tr><td style="border-top:1px solid #6f4a2f;padding-top:24px;">
                      <p style="color:#e0c3a0;font-size:16px;margin:0 0 16px;">
                        Um novo pe&atilde;o est&aacute; na porteira aguardando sua autoriza&ccedil;&atilde;o
                        para entrar na arena:
                      </p>
                      <table role="presentation" width="100%%" cellpadding="8" cellspacing="0"
                             style="background-color:#1c1008;border-radius:8px;margin-bottom:24px;">
                        <tr>
                          <td style="color:#a9764f;font-size:13px;width:90px;">Nome</td>
                          <td style="color:#f2dd94;font-size:14px;font-weight:bold;">%s</td>
                        </tr>
                        <tr>
                          <td style="color:#a9764f;font-size:13px;">E-mail</td>
                          <td style="color:#f2dd94;font-size:14px;font-weight:bold;">%s</td>
                        </tr>
                      </table>
                    </td></tr>
                    <tr><td align="center" style="padding-bottom:24px;">
                      <a href="%s"
                         style="display:inline-block;background-color:#d4af37;color:#120a05;
                                font-size:15px;font-weight:bold;text-decoration:none;
                                text-transform:uppercase;letter-spacing:2px;
                                padding:14px 40px;border-radius:8px;">
                        Aprovar Pe&atilde;o
                      </a>
                    </td></tr>
                    <tr><td align="center">
                      <p style="color:#8b5e3c;font-size:12px;margin:0;">
                        Se voc&ecirc; n&atilde;o reconhece este cadastro, ignore este e-mail —
                        o acesso permanecer&aacute; bloqueado.
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(nomeSeguro, emailSeguro, linkAprovacao);
    }
}
