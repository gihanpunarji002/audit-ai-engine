import fs from 'fs/promises';
import { GoogleGenAI } from '@google/genai';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AuthenticityVerdict, RiskLevel } from '../constants/audit.js';

class GeminiService {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.modelName = config.gemini.model || 'gemini-2.5-flash';
    this.client = null;

    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        logger.info(`Google Gemini AI client initialized using model: ${this.modelName}`);
      } catch (err) {
        logger.error('Failed to initialize Google Gemini client', { error: err.message });
      }
    } else {
      logger.warn('GEMINI_API_KEY is not configured in .env. Running in simulated fallback mode.');
    }
  }

  /**
   * Audit an uploaded document using Google Gemini AI
   * @param {Object} params
   * @param {string} params.filePath - Local filesystem path to the uploaded file
   * @param {string} params.mimeType - MIME type of the file
   * @param {string} params.originalName - Original file name
   * @param {string} params.fileType - Categorized file type ('image' | 'document' | 'text')
   * @returns {Promise<Object>} Standardized audit analysis object
   */
  async auditDocument({ filePath, mimeType, originalName, fileType }) {
    // If no client or API key is set, return a realistic simulated audit response
    if (!this.client || !this.apiKey) {
      return this._generateSimulatedAudit({ originalName, fileType, mimeType });
    }

    try {
      logger.info(`Sending document '${originalName}' (${mimeType}) to Gemini AI (${this.modelName})`);

      const fileBuffer = await fs.readFile(filePath);
      const isImage = mimeType.startsWith('image/');
      const isPdf = mimeType === 'application/pdf';

      const contents = [];

      // Construct prompt request
      const auditPrompt = `
You are an expert Senior Document Forensics & Cybersecurity Auditor.
Perform an exhaustive, deep forensic audit of the attached document: "${originalName}" (Type: ${mimeType}).

Your analysis must rigorously evaluate:
1. Comprehensive Summary: Provide an in-depth breakdown of what this document is, its content, purpose, entities, and context.
2. Authenticity Analysis: Is it authentic, suspicious, fake, or spam? Check for forged layouts, altered fonts, deceptive text, manipulated watermarks, phishing language, spam characteristics, or illicit instructions.
3. Faults & Discrepancies: Detect all logical inconsistencies, grammatical/formatting anomalies, invalid dates, fake addresses, calculation errors, or signature defects.
4. Security & Compliance Measures: Detail concrete security protections, validation checks, and risk mitigation steps.
5. Quantitative Scores:
   - authenticity_score: 0.0 to 100.0 (where 100 is completely genuine/authentic)
   - overall_score: 0.0 to 100.0 (overall audit health and compliance score)
   - risk_level: "low", "medium", "high", or "critical"

You must reply with pure valid JSON strictly matching this schema:
{
  "summary": "Detailed, professional multi-paragraph forensic summary...",
  "authenticity_verdict": "authentic" | "suspicious" | "fake" | "spam" | "undetermined",
  "authenticity_score": 88.5,
  "is_fake": false,
  "is_spam": false,
  "faults": [
    {
      "category": "Typography / Formatting" | "Consistency" | "Security" | "Payload" | "Fraud Indicator",
      "severity": "low" | "medium" | "high" | "critical",
      "description": "Specific issue discovered"
    }
  ],
  "security_measures": [
    {
      "priority": "high" | "medium" | "low",
      "recommendation": "Prescribed security action",
      "action": "Immediate step to mitigate"
    }
  ],
  "overall_score": 92.0,
  "risk_level": "low" | "medium" | "high" | "critical"
}
`;

      if (isImage || isPdf) {
        // Multi-modal image/PDF inline part
        contents.push({
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType,
          },
        });
        contents.push(auditPrompt);
      } else {
        // Text / Markdown / CSV / JSON document
        const textContent = fileBuffer.toString('utf8');
        contents.push(`Document Content:\n${textContent}\n\n${auditPrompt}`);
      }

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          responseMimeType: 'application/json',
          systemInstruction:
            'You are a premier AI Document Authenticity, Fraud Detection, and Cybersecurity Audit engine. Always deliver structured forensic assessments in pure JSON.',
        },
      });

      const responseText = response.text;
      let parsedAnalysis;

      try {
        parsedAnalysis = JSON.parse(responseText);
      } catch (jsonErr) {
        logger.error('Failed to parse Gemini response as JSON', { responseText });
        parsedAnalysis = this._parseJsonFromMarkdown(responseText);
      }

      // Sanitize and normalize parsed fields
      return {
        summary: parsedAnalysis.summary || 'Document audit completed successfully.',
        authenticity_verdict: this._normalizeVerdict(parsedAnalysis.authenticity_verdict),
        authenticity_score: parseFloat(parsedAnalysis.authenticity_score) || 75.0,
        is_fake: Boolean(parsedAnalysis.is_fake),
        is_spam: Boolean(parsedAnalysis.is_spam),
        faults: Array.isArray(parsedAnalysis.faults) ? parsedAnalysis.faults : [],
        security_measures: Array.isArray(parsedAnalysis.security_measures) ? parsedAnalysis.security_measures : [],
        overall_score: parseFloat(parsedAnalysis.overall_score) || 80.0,
        risk_level: this._normalizeRiskLevel(parsedAnalysis.risk_level),
        model_used: this.modelName,
        raw_analysis: parsedAnalysis,
      };
    } catch (error) {
      logger.error('Gemini AI audit execution failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Fallback extractor in case LLM wraps JSON in markdown blocks
   */
  _parseJsonFromMarkdown(text) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Could not parse JSON response from Gemini');
  }

  /**
   * Normalize verdict to valid enum values
   */
  _normalizeVerdict(verdict) {
    const v = String(verdict || '').toLowerCase().trim();
    if (Object.values(AuthenticityVerdict).includes(v)) {
      return v;
    }
    return AuthenticityVerdict.AUTHENTIC;
  }

  /**
   * Normalize risk level to valid enum values
   */
  _normalizeRiskLevel(level) {
    const l = String(level || '').toLowerCase().trim();
    if (Object.values(RiskLevel).includes(l)) {
      return l;
    }
    return RiskLevel.LOW;
  }

  /**
   * Simulated audit generator when GEMINI_API_KEY is not yet populated
   */
  _generateSimulatedAudit({ originalName, fileType, mimeType }) {
    logger.info(`Generating simulated audit report for '${originalName}' (Gemini API key not configured)`);

    const isSuspicious = originalName.toLowerCase().includes('invoice') || originalName.toLowerCase().includes('fake');
    const authenticity_score = isSuspicious ? 58.0 : 94.5;
    const overall_score = isSuspicious ? 62.0 : 91.0;
    const risk_level = isSuspicious ? RiskLevel.MEDIUM : RiskLevel.LOW;
    const authenticity_verdict = isSuspicious ? AuthenticityVerdict.SUSPICIOUS : AuthenticityVerdict.AUTHENTIC;

    return {
      summary: `Automated forensic inspection completed for document "${originalName}" (${mimeType}). The structural layout, character encoding, and content patterns were analyzed. ${
        isSuspicious
          ? 'Minor discrepancies in formatting and metadata consistency were flagged for secondary auditor review.'
          : 'Document structure adheres to standard compliance protocols with verified integrity signatures.'
      }`,
      authenticity_verdict,
      authenticity_score,
      is_fake: false,
      is_spam: false,
      faults: isSuspicious
        ? [
            {
              category: 'Metadata Consistency',
              severity: 'medium',
              description: 'Creation timestamp does not strictly align with embedded document header dates.',
            },
            {
              category: 'Layout Formatting',
              severity: 'low',
              description: 'Variable font Kerning detected across tabular columns.',
            },
          ]
        : [],
      security_measures: [
        {
          priority: 'high',
          recommendation: 'Enable cryptographic digital signatures (PKI) on future exports.',
          action: 'Require digital signing certificate verification before approval.',
        },
        {
          priority: 'medium',
          recommendation: 'Enforce organization access-control policies on audited documents.',
          action: 'Restrict export and download access to authorized organization auditors.',
        },
      ],
      overall_score,
      risk_level,
      model_used: `${this.modelName} (simulated-mode: set GEMINI_API_KEY in .env for live Gemini output)`,
      raw_analysis: {
        note: 'Set GEMINI_API_KEY in your .env file to enable live Google Gemini 2.5 multimodal audits.',
      },
    };
  }
}

export default new GeminiService();
