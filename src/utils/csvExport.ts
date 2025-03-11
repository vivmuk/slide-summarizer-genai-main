import { SlideData } from '@/components/ResultsList';

export function exportToCSV(results: SlideData[]) {
  // Define CSV headers
  const headers = [
    'File Name',
    'Page Number',
    'Title',
    'Summary',
    'Content Taxonomy',
    'Content Type',
    'Clinical Trial Relevance',
    'Disease & Therapeutic Area',
    'Intended Audience',
    'Key Scientific Messaging',
    'Distribution & Access Control',
    'Compliance & Regulatory'
  ];

  // Convert results to CSV rows
  const rows = results.map(result => [
    result.fileName,
    result.pageNumber,
    result.title,
    result.summary,
    result.content_taxonomy.join('; '),
    result.medical_affairs_taxonomy.ContentType.join('; '),
    result.medical_affairs_taxonomy.ClinicalTrialRelevance.join('; '),
    result.medical_affairs_taxonomy.DiseaseAndTherapeuticArea.join('; '),
    result.medical_affairs_taxonomy.IntendedAudience.join('; '),
    result.medical_affairs_taxonomy.KeyScientificMessaging.join('; '),
    result.medical_affairs_taxonomy.DistributionAndAccessControl.join('; '),
    result.medical_affairs_taxonomy.ComplianceAndRegulatoryConsiderations.join('; ')
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `slide_analysis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
