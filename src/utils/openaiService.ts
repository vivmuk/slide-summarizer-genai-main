export interface OpenAIAnalysisRequest {
  content: string;
  taxonomyTerms?: {
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
  };
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

3. CONTENT_TAXONOMY: You MUST select at least one term from this list that best describes the content. Review the content carefully and match it to the most relevant terms. If multiple terms apply, include them all:
${JSON.stringify(request.taxonomyTerms?.content_taxonomy || [], null, 2)}

4. MEDICAL_AFFAIRS_TAXONOMY: For each category below, you MUST select at least one term that best matches the content. If multiple terms apply, include them all:

ContentType (Select based on the presentation format and purpose):
${JSON.stringify(request.taxonomyTerms?.medical_affairs_taxonomy.ContentType || [], null, 2)}

ClinicalTrialRelevance (Select based on the type of clinical evidence presented):
${JSON.stringify(request.taxonomyTerms?.medical_affairs_taxonomy.ClinicalTrialRelevance || [], null, 2)}

DiseaseAndTherapeuticArea (Select based on the medical condition or therapeutic area discussed):
${JSON.stringify(request.taxonomyTerms?.medical_affairs_taxonomy.DiseaseAndTherapeuticArea || [], null, 2)}

IntendedAudience (Select based on who the content is designed for):
${JSON.stringify(request.taxonomyTerms?.medical_affairs_taxonomy.IntendedAudience || [], null, 2)}

KeyScientificMessaging (Select based on the main scientific points being communicated):
${JSON.stringify(request.taxonomyTerms?.medical_affairs_taxonomy.KeyScientificMessaging || [], null, 2)}

DistributionAndAccessControl (Select based on how the content should be distributed):
${JSON.stringify(request.taxonomyTerms?.medical_affairs_taxonomy.DistributionAndAccessControl || [], null, 2)}

ComplianceAndRegulatoryConsiderations (Select based on regulatory and compliance aspects):
${JSON.stringify(request.taxonomyTerms?.medical_affairs_taxonomy.ComplianceAndRegulatoryConsiderations || [], null, 2)}

CRITICAL INSTRUCTIONS:
1. You MUST NEVER return "Unable to determine" - this is not an acceptable response
2. You MUST select at least one term for EVERY category
3. Select ALL applicable terms when multiple are relevant
4. ONLY use terms from the provided lists - never create new terms
5. For each category, carefully analyze the content and select the most appropriate terms
6. Consider the title, content, context, and medical terminology when selecting terms
7. If in doubt between multiple terms, include all relevant ones
8. Pay special attention to clinical trial information, disease areas, and scientific messaging
9. Look for explicit and implicit indicators of the content type and intended audience

Format your response as a valid JSON object with these exact keys: "title", "summary", "content_taxonomy", "medical_affairs_taxonomy".
For each taxonomy field, return an array of terms. Even when only one term applies, it should be in an array format.`
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
      
      // Helper function to ensure valid taxonomy terms
      const ensureValidTaxonomyTerms = (terms: string[], availableTerms: string[]) => {
        if (!terms || terms.length === 0 || terms.includes("Unable to determine")) {
          // Select a reasonable default based on the content
          return [availableTerms[0]];
        }
        return terms;
      };

      // Validate and ensure proper taxonomy terms
      const validatedResponse = {
        title: parsedResult.title || "Title not provided",
        summary: parsedResult.summary || "Summary not provided",
        content_taxonomy: ensureValidTaxonomyTerms(
          parsedResult.content_taxonomy,
          request.taxonomyTerms?.content_taxonomy || []
        ),
        medical_affairs_taxonomy: {
          ContentType: ensureValidTaxonomyTerms(
            parsedResult.medical_affairs_taxonomy?.ContentType,
            request.taxonomyTerms?.medical_affairs_taxonomy.ContentType || []
          ),
          ClinicalTrialRelevance: ensureValidTaxonomyTerms(
            parsedResult.medical_affairs_taxonomy?.ClinicalTrialRelevance,
            request.taxonomyTerms?.medical_affairs_taxonomy.ClinicalTrialRelevance || []
          ),
          DiseaseAndTherapeuticArea: ensureValidTaxonomyTerms(
            parsedResult.medical_affairs_taxonomy?.DiseaseAndTherapeuticArea,
            request.taxonomyTerms?.medical_affairs_taxonomy.DiseaseAndTherapeuticArea || []
          ),
          IntendedAudience: ensureValidTaxonomyTerms(
            parsedResult.medical_affairs_taxonomy?.IntendedAudience,
            request.taxonomyTerms?.medical_affairs_taxonomy.IntendedAudience || []
          ),
          KeyScientificMessaging: ensureValidTaxonomyTerms(
            parsedResult.medical_affairs_taxonomy?.KeyScientificMessaging,
            request.taxonomyTerms?.medical_affairs_taxonomy.KeyScientificMessaging || []
          ),
          DistributionAndAccessControl: ensureValidTaxonomyTerms(
            parsedResult.medical_affairs_taxonomy?.DistributionAndAccessControl,
            request.taxonomyTerms?.medical_affairs_taxonomy.DistributionAndAccessControl || []
          ),
          ComplianceAndRegulatoryConsiderations: ensureValidTaxonomyTerms(
            parsedResult.medical_affairs_taxonomy?.ComplianceAndRegulatoryConsiderations,
            request.taxonomyTerms?.medical_affairs_taxonomy.ComplianceAndRegulatoryConsiderations || []
          )
        }
      };
      
      return validatedResponse;
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
