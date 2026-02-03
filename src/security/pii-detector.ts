/**
 * PII Detection and Masking
 * Original implementation using regex patterns (not Presidio)
 * For production, integrate with Presidio or similar enterprise solution
 */

import { PIIDetectionResult, PIIEntity } from '../types.js';

export class PIIDetector {
  private patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    // Simplified name detection - production should use NER models
    name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
  };

  detect(text: string): PIIDetectionResult {
    const entities: PIIEntity[] = [];
    const maskingMap: Record<string, string> = {};
    let maskedText = text;
    let maskCounter = 1;

    // Detect each PII type
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        if (match.index === undefined) continue;

        const value = match[0];
        const placeholder = `[${type.toUpperCase()}_${maskCounter}]`;

        entities.push({
          type: type as PIIEntity['type'],
          value,
          start: match.index,
          end: match.index + value.length,
          confidence: 0.9, // Regex-based has high confidence for exact matches
        });

        maskingMap[placeholder] = value;
        maskedText = maskedText.replace(value, placeholder);
        maskCounter++;
      }
    }

    return {
      hasPII: entities.length > 0,
      entities,
      maskedText,
      maskingMap,
    };
  }

  unmask(maskedText: string, maskingMap: Record<string, string>): string {
    let unmasked = maskedText;

    for (const [placeholder, originalValue] of Object.entries(maskingMap)) {
      unmasked = unmasked.replace(placeholder, originalValue);
    }

    return unmasked;
  }
}
