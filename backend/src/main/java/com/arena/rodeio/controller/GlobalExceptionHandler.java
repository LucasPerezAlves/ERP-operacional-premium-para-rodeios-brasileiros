package com.arena.rodeio.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Converte erros de validação Bean Validation em um mapa campo → mensagem
 * (pt-BR), no formato que o front-end exibe junto de cada input.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException exception) {

        Map<String, String> campos = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
            campos.putIfAbsent(error.getField(), error.getDefaultMessage()));

        return ResponseEntity.badRequest().body(Map.of(
            "status", HttpStatus.BAD_REQUEST.value(),
            "mensagem", "Dados inválidos. Corrija os campos destacados.",
            "campos", campos));
    }
}
