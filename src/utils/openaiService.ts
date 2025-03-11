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
  msl_communication: string;
  payer_communication: string;
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
            content: `You are a Medical Science Liaison (MSL) analyzing medical slide content. For each slide, provide:

1. TITLE: Extract the exact title as shown on the slide, preserving all formatting and punctuation.

2. SUMMARY: Write a clear, one-line summary of the slide's main message.

3. TAXONOMY: Select ALL relevant terms from this specific list that apply to the slide content:
${JSON.stringify(request.taxonomyTerms?.content_taxonomy || [], null, 2)}

4. MSL COMMUNICATION: Write a single, concise sentence as an expert MSL would communicate this slide's key message to a healthcare professional (HCP). Focus on clinical relevance and scientific evidence.

5. PAYER COMMUNICATION: Write a single, concise sentence focusing on the economic and value proposition aspects that would be relevant to payers and market access teams.

CRITICAL RULES:
1. Only use terms from the provided taxonomy list - no variations or new terms
2. Never return "Unable to determine" - always select appropriate terms
3. MSL communication should be evidence-based and clinically focused
4. Payer communication should emphasize value, outcomes, and economic aspects
5. Keep all communications professional and scientifically accurate

Format your response as a JSON object:
{
  "title": "exact slide title",
  "summary": "one-line content summary",
  "content_taxonomy": ["term1", "term2"],
  "msl_communication": "one-line expert MSL communication to HCP",
  "payer_communication": "one-line value proposition for payers"
}`
          },
          {
            role: 'user',
            content: `Analyze this slide and provide the title, summary, relevant taxonomy terms, MSL communication, and payer communication. Remember to only use terms from the provided taxonomy list:

${request.content}`
          }
        ],
        temperature: 0.1,
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
        if (!terms || terms.length === 0) {
          return [availableTerms[0]];
        }
        // Clean up terms by removing any extra whitespace and special characters
        const cleanTerms = terms.map(term => 
          term.replace(/\u00a0/g, ' ').trim()
        );
        // Filter to only include valid terms from the available list
        const validTerms = cleanTerms.filter(term => 
          availableTerms.some(validTerm => 
            validTerm.replace(/\u00a0/g, ' ').trim() === term
          )
        );
        return validTerms.length > 0 ? validTerms : [availableTerms[0]];
      };

      // Validate and ensure proper taxonomy terms
      const validatedResponse = {
        title: parsedResult.title || "Title not provided",
        summary: parsedResult.summary || "Summary not provided",
        content_taxonomy: ensureValidTaxonomyTerms(
          parsedResult.content_taxonomy,
          request.taxonomyTerms?.content_taxonomy || []
        ),
        msl_communication: parsedResult.msl_communication || "Clinical evidence demonstrates significant therapeutic potential for addressing unmet needs in isolated proctitis management.",
        payer_communication: parsedResult.payer_communication || "Treatment approach may reduce disease progression and associated healthcare costs."
      };
      
      return validatedResponse;
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      
      // Attempt to extract information from non-JSON response
      const title = assistantMessage.match(/Title:?\s*(.*?)(?:\n|$)/i)?.[1] || "Title not provided";
      const summary = assistantMessage.match(/Summary:?\s*(.*?)(?:\n|$)/i)?.[1] || "Summary not provided";
      const content_taxonomy = assistantMessage.match(/Taxonomy:?\s*(.*?)(?:\n|$)/i)?.[1] || request.taxonomyTerms?.content_taxonomy?.[0] || "Disease Awareness";
      const msl_communication = assistantMessage.match(/MSL Communication:?\s*(.*?)(?:\n|$)/i)?.[1] || "Clinical evidence demonstrates significant therapeutic potential for addressing unmet needs in isolated proctitis management.";
      const payer_communication = assistantMessage.match(/Payer Communication:?\s*(.*?)(?:\n|$)/i)?.[1] || "Treatment approach may reduce disease progression and associated healthcare costs.";
      
      return {
        title,
        summary,
        content_taxonomy: [content_taxonomy],
        msl_communication,
        payer_communication
      };
    }
    
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    throw new Error(`Failed to analyze content with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
  }
}
