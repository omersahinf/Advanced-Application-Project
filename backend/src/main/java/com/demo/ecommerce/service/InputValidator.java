package com.demo.ecommerce.service;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Pattern;

/**
 * SECURITY: Validates chat input before sending to AI.
 * Detects prompt injection, SQL injection attempts, and out-of-scope requests.
 */
@Component
public class InputValidator {

    // SQL injection patterns
    private static final List<Pattern> SQL_PATTERNS = List.of(
            Pattern.compile("(?i)\\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\\b.*\\b(FROM|INTO|TABLE|DATABASE)\\b"),
            Pattern.compile("(?i)\\bUNION\\s+SELECT\\b"),
            Pattern.compile("(?i)\\bOR\\s+1\\s*=\\s*1\\b"),
            Pattern.compile("(?i)\\bWHERE\\s+1\\s*=\\s*1\\b"),
            Pattern.compile("(?i)\\b(DROP|ALTER|TRUNCATE)\\s+TABLE\\b"),
            Pattern.compile("(?i)\\bSELECT\\s+\\*\\s+FROM\\s+users\\b"),
            Pattern.compile("(?i)--;"),
            Pattern.compile("(?i)\\bINSERT\\s+INTO\\b")
    );

    // Prompt injection / privilege escalation patterns
    private static final List<Pattern> INJECTION_PATTERNS = List.of(
            // Instruction override / prompt injection
            Pattern.compile("(?i)ignore\\s+(your\\s+)?(previous\\s+)?(instructions|rules|prompt|policy|guidelines)"),
            Pattern.compile("(?i)pretend\\s+(that\\s+)?(policy|rules|restrictions?)\\s+(do(es)?\\s+not|don.?t)\\s+matter"),
            Pattern.compile("(?i)you\\s+are\\s+(now\\s+)?(no\\s+longer\\s+)?(an?\\s+)?(admin|restricted|bound)"),
            Pattern.compile("(?i)assume\\s+(i|you)\\s+(am|are|have)\\s+(an?\\s+)?(admin|administrator|root|superadmin|no\\s+restriction)"),
            Pattern.compile("(?i)\\b(act|behave|pretend)\\s+(as|like)\\s+(an?\\s+)?(root|admin|superadmin|superuser)"),
            Pattern.compile("(?i)for\\s+testing\\s+purposes"),
            // System prompt / internal config reveal
            Pattern.compile("(?i)\\bsystem\\s+prompt\\b"),
            Pattern.compile("(?i)\\bhidden\\s+(instructions|prompt|rules)\\b"),
            Pattern.compile("(?i)\\binternal\\s+(config|rules|instructions|context)\\b"),
            Pattern.compile("(?i)(repeat|reveal|show|output|print|display)\\s+(your\\s+)?(system|hidden|internal)\\s+(prompt|instructions|rules|config|context)"),
            Pattern.compile("(?i)(output|print|show|reveal|display)\\s+(the\\s+)?raw\\s+(product\\s+)?context"),
            // Cross-user / cross-company data access
            Pattern.compile("(?i)what\\s+products\\s+does\\s+company"),
            Pattern.compile("(?i)show\\s+(me\\s+)?products\\s+of\\s+user\\s+id"),
            Pattern.compile("(?i)show\\s+(me\\s+)?(the\\s+)?product\\s+(list|data)\\s+of\\s+(user|account)"),
            Pattern.compile("(?i)show\\s+(me\\s+)?all\\s+(products|users|data)\\s+in\\s+(the\\s+)?database"),
            Pattern.compile("(?i)(another|other|different)\\s+company.?s?\\s+(products?|data|catalog)"),
            Pattern.compile("(?i)products?\\s+(that\\s+)?(are\\s+)?not\\s+(mine|my)"),
            Pattern.compile("(?i)(give|show|list|get)\\s+(me\\s+)?(products?|data)\\s+of\\s+user"),
            Pattern.compile("(?i)what\\s+(else|other)\\s+(exists|is\\s+there)\\s+(besides|other\\s+than)"),
            Pattern.compile("(?i)\\blist\\s+all\\s+users\\b"),
            Pattern.compile("(?i)what\\s+tables\\s+exist"),
            // Privilege escalation
            Pattern.compile("(?i)\\b(no\\s+longer|not)\\s+restricted\\s+by\\s+(company|data|user)\\s+boundar"),
            Pattern.compile("(?i)\\belevat(e|ed)\\s+privile"),
            Pattern.compile("(?i)\\bgrant\\s+(me\\s+)?access")
    );

    public ValidationResult validate(String input) {
        if (input == null || input.isBlank()) {
            return ValidationResult.rejected("Please enter a valid question.");
        }

        // Check SQL injection
        for (Pattern pattern : SQL_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return ValidationResult.rejected(
                        "I can only answer questions about your products using natural language. " +
                        "Database queries are not supported.");
            }
        }

        // Check prompt injection / privilege escalation
        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return ValidationResult.rejected(
                        "I can only help you with questions about your own product catalog. " +
                        "I cannot access other users' data, system internals, or change my behavior.");
            }
        }

        return ValidationResult.ok();
    }

    public static class ValidationResult {
        private final boolean valid;
        private final String rejectionMessage;

        private ValidationResult(boolean valid, String rejectionMessage) {
            this.valid = valid;
            this.rejectionMessage = rejectionMessage;
        }

        public static ValidationResult ok() {
            return new ValidationResult(true, null);
        }

        public static ValidationResult rejected(String message) {
            return new ValidationResult(false, message);
        }

        public boolean isValid() { return valid; }
        public String getRejectionMessage() { return rejectionMessage; }
    }
}
