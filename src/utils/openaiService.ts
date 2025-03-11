export interface OpenAIAnalysisRequest {
  content: string;
}

export interface OpenAIAnalysisResponse {
  title: string;
  summary: string;
  content_taxonomy: string[];
  medical_affairs_taxonomy: {
    ContentType: string[];
    ClinicalTrialRelevance: string[];
    DiseaseAndTherapeuticArea: string[];
    IntendedAudience: string[];
    KeyScientificMessaging: string[];
    DistributionAndAccessControl: string[];
    ComplianceAndRegulatoryConsiderations: string[];
  };
}

export interface OpenAIModel {
  id: string;
  name: string;
}

export async function getAvailableModels(apiKey: string): Promise<OpenAIModel[]> {
  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid API key format. OpenAI API keys should start with "sk-"');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to fetch models: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Filter for GPT models and sort by ID
    const gptModels = data.data
      .filter((model: any) => 
        model.id.includes('gpt') && 
        !model.id.includes('instruct') && 
        !model.id.includes('vision'))
      .map((model: any) => ({
        id: model.id,
        name: model.id.replace('gpt-', 'GPT ').replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      }))
      .sort((a: OpenAIModel, b: OpenAIModel) => a.id.localeCompare(b.id));
    
    // Add a few specific models even if they weren't returned
    const specificModels = [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ];
    
    // Combine and remove duplicates
    const allModels = [...specificModels];
    
    for (const model of gptModels) {
      if (!allModels.some(m => m.id === model.id)) {
        allModels.push(model);
      }
    }
    
    return allModels;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    throw new Error(`Failed to fetch OpenAI models: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function analyzeWithOpenAI(
  apiKey: string,
  model: string,
  request: OpenAIAnalysisRequest
): Promise<OpenAIAnalysisResponse> {
  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid API key format. OpenAI API keys should start with "sk-"');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are a medical content analyzer specializing in precise information extraction and classification from medical slides. Your task is to analyze each slide and STRICTLY use only the provided taxonomy terms.

1. TITLE: Extract the exact title as it appears on the slide. If no clear title exists, use the first prominent text or heading.

2. SUMMARY: Create a single-line, plain language summary that captures the main point of the slide. Use simple, clear language.

3. CONTENT_TAXONOMY: Select ALL applicable terms from this list that describe the content types present in the slide. You MUST use only terms from this list:
[Access, Availability, Brand Awareness and News, Brand Experience, Clinical Trial and Study Info, Clinical Trial Diversity, Clinical Trial Enrollment, Colloquialism, Confirmation, Contractual Terms, Corporate News, Diagnosis, Disease Awareness, Dispense As Written, Dosing, Efficacy, ePermission or Consent or Unsubscribe, Epidemiology, Invitation to Other MCM, Mechanism of Action, Notations, Pathology, Patient Stories, Patient Type, Pfizer Internal Use Only, Product Form Strength Function, Product Label Info, Real World Evidence, Resources HCP, Resources Patient, Safety, Sample, Special Offers and Discounts, Storage and Handling, Summary Messages, Treatment Options, Unmet Need]

4. MEDICAL_AFFAIRS_TAXONOMY: For each category below, select ALL applicable terms from the provided options that apply to the slide. You MUST only use terms from these lists:

ContentType - Select based on all purposes the slide serves:
[Scientific Platform, Key Scientific Messages (KSMs), Medical Information Response (MIRs), Plain Language Summary (PLS), Clinical Trial Results Deck, Mechanism of Action (MOA) Deck, Real-World Evidence (RWE) Deck, Health Economics & Outcomes Research (HEOR) Deck, Advisory Board Deck, Regulatory & Labeling Deck]

ClinicalTrialRelevance - Select all types of clinical evidence presented:
[Phase 1 Clinical Trial Data, Phase 2 Clinical Trial Data, Phase 3 Clinical Trial Data, Phase 4/Post-Marketing Surveillance Data, Head-to-Head Trials, Biomarker/Companion Diagnostics Evidence, Meta-Analyses & Systematic Reviews]

DiseaseAndTherapeuticArea - Select all relevant medical conditions:
[Oncology, Cardiology, Immunology, Neurology, Rare Diseases, Non-Small Cell Lung Cancer, Crohn's Disease, Multiple Sclerosis]

IntendedAudience - Select all target audiences:
[Internal Medical Affairs, Healthcare Professionals (HCPs), Payers & Market Access Teams, Regulatory & Compliance Teams, Patients & Advocacy Groups]

KeyScientificMessaging - Select all scientific messages present:
[Efficacy Data, Safety & Tolerability Profile, Dosing & Administration Guidelines, Real-World Clinical Outcomes, Unmet Medical Need & Differentiation]

DistributionAndAccessControl - Select all appropriate distribution channels:
[Veeva CRM & MSL Tools, Medical Affairs Internal Repository, Congress Presentations, HCP Portals & Educational Websites, Advisory Board Meetings]

ComplianceAndRegulatoryConsiderations - Select all applicable compliance statuses:
[Medical Affairs Approved, Internal Use Only, Market-Specific Adaptations (Regional Variations), Fair Balance Statement, Pre-Approval vs. Post-Approval Use]

IMPORTANT:
- You MUST select at least one term for each category
- You MAY select multiple terms when appropriate
- Only use terms from the provided lists
- Never return "Unable to determine" or create new terms
- Consider all aspects of the slide's content when selecting terms
- If uncertain about a category, select the most relevant term(s) based on available content

Format your response as a valid JSON object with these exact keys: "title", "summary", "content_taxonomy", "medical_affairs_taxonomy".
For each taxonomy field, return an array of terms. Even when only one term applies, it should be in an array format.
Example format:
{
  "title": "Example Title",
  "summary": "Example summary",
  "content_taxonomy": ["Term1", "Term2"],
  "medical_affairs_taxonomy": {
    "ContentType": ["Term1", "Term2"],
    "ClinicalTrialRelevance": ["Term1"],
    ...
  }
}`
          },
          {
            role: 'user',
            content: request.content
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the response
    const assistantMessage = data.choices[0].message.content;
    
    try {
      // Parse the JSON from the response
      const parsedResult = JSON.parse(assistantMessage);
      
      return {
        title: parsedResult.title || "Unable to extract title",
        summary: parsedResult.summary || "Unable to extract summary",
        content_taxonomy: parsedResult.content_taxonomy || ["Unable to determine taxonomy"],
        medical_affairs_taxonomy: {
          ContentType: parsedResult.medical_affairs_taxonomy?.ContentType || ["Unable to determine"],
          ClinicalTrialRelevance: parsedResult.medical_affairs_taxonomy?.ClinicalTrialRelevance || ["Unable to determine"],
          DiseaseAndTherapeuticArea: parsedResult.medical_affairs_taxonomy?.DiseaseAndTherapeuticArea || ["Unable to determine"],
          IntendedAudience: parsedResult.medical_affairs_taxonomy?.IntendedAudience || ["Unable to determine"],
          KeyScientificMessaging: parsedResult.medical_affairs_taxonomy?.KeyScientificMessaging || ["Unable to determine"],
          DistributionAndAccessControl: parsedResult.medical_affairs_taxonomy?.DistributionAndAccessControl || ["Unable to determine"],
          ComplianceAndRegulatoryConsiderations: parsedResult.medical_affairs_taxonomy?.ComplianceAndRegulatoryConsiderations || ["Unable to determine"]
        }
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      
      // Attempt to extract information from non-JSON response
      const title = assistantMessage.match(/Title:?\s*(.*?)(?:\n|$)/i)?.[1] || "Unable to extract title";
      const summary = assistantMessage.match(/Summary:?\s*(.*?)(?:\n|$)/i)?.[1] || "Unable to extract summary";
      const content_taxonomy = assistantMessage.match(/Content Taxonomy:?\s*(.*?)(?:\n|$)/i)?.[1] || "Unable to determine taxonomy";
      
      return {
        title,
        summary,
        content_taxonomy: [content_taxonomy],
        medical_affairs_taxonomy: {
          ContentType: ["Unable to determine"],
          ClinicalTrialRelevance: ["Unable to determine"],
          DiseaseAndTherapeuticArea: ["Unable to determine"],
          IntendedAudience: ["Unable to determine"],
          KeyScientificMessaging: ["Unable to determine"],
          DistributionAndAccessControl: ["Unable to determine"],
          ComplianceAndRegulatoryConsiderations: ["Unable to determine"]
        }
      };
    }
    
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    throw new Error(`Failed to analyze content with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
  }
}
