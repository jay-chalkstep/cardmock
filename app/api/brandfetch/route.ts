import { NextRequest } from 'next/server';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { logger } from '@/lib/utils/logger';

const BRANDFETCH_API_URL = 'https://api.brandfetch.io/v2/brands';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get('domain');

    logger.api('/api/brandfetch', 'GET', { domain });

    if (!domain) {
      return badRequestResponse('Domain parameter is required');
    }

    const apiKey = process.env.NEXT_PUBLIC_BRANDFETCH_API_KEY;

    if (!apiKey) {
      return errorResponse(new Error('Brandfetch API key is not configured'), 'API key not configured');
    }

    // Clean the input - if it looks like a domain, use it; otherwise try adding .com
    let searchDomain = domain.trim().toLowerCase();

    // If it doesn't contain a dot, it's probably a company name, try adding .com
    if (!searchDomain.includes('.')) {
      // Remove spaces and special characters for company names
      searchDomain = searchDomain.replace(/\s+/g, '') + '.com';
    }

    // Remove protocol if present
    searchDomain = searchDomain.replace(/^https?:\/\//, '').replace(/^www\./, '');

    logger.debug('Searching Brandfetch API', { searchDomain });

    const response = await fetch(`${BRANDFETCH_API_URL}/${searchDomain}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return notFoundResponse(`Brand not found for "${domain}". Try using the exact company domain (e.g., apple.com, nike.com)`);
      }
      if (response.status === 400) {
        return badRequestResponse(`Invalid domain format. Please enter a valid domain like "apple.com" or company name like "apple"`);
      }
      if (response.status === 401) {
        return errorResponse(new Error('Invalid API key'), 'Invalid API key. Please check your Brandfetch API key in settings.');
      }
      throw new Error(`Brandfetch API error: ${response.status}`);
    }

    const data = await response.json();

    // Process and structure the response
    const processedData = {
      name: data.name || domain,
      domain: data.domain || domain,
      description: data.description,
      logos: data.logos || [],
      colors: data.colors || [],
      fonts: data.fonts || [],
    };

    logger.info('Brandfetch data fetched successfully', { domain: searchDomain });

    return successResponse(processedData);
  } catch (error) {
    return errorResponse(error, 'Failed to fetch brand data');
  }
}