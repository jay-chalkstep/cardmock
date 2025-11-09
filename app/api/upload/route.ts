import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError, checkRequiredFields } from '@/lib/api/error-handler';
import { supabase, LOGOS_BUCKET } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

// Mark as dynamic to prevent build-time evaluation
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;

    logger.api('/api/upload', 'POST', { orgId });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyName = formData.get('companyName') as string;
    const domain = formData.get('domain') as string;
    const logoType = formData.get('logoType') as string;

    if (!file || !companyName) {
      return badRequestResponse('File and company name are required');
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(LOGOS_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logger.error('Storage upload failed', uploadError, { fileName, bucket: LOGOS_BUCKET });
      return errorResponse(uploadError, 'Failed to upload file to storage');
    }

    logger.debug('Storage upload successful', { fileName });

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(LOGOS_BUCKET)
      .getPublicUrl(fileName);

    logger.debug('Public URL generated', { url: publicUrl });

    // Step 1: Create or find brand (within organization)
    const brandDomain = domain || `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

    logger.db('Checking for existing brand', { domain: brandDomain, orgId });

    const { data: existingBrand } = await supabase
      .from('brands')
      .select('id')
      .eq('domain', brandDomain)
      .eq('organization_id', orgId)
      .single();

    let brandId: string;

    if (existingBrand) {
      brandId = existingBrand.id;
      logger.debug('Using existing brand', { brandId });
    } else {
      logger.db('Creating new brand', { companyName, domain: brandDomain, orgId });

      const { data: newBrand, error: brandError } = await supabase
        .from('brands')
        .insert({
          company_name: companyName,
          domain: brandDomain,
          organization_id: orgId,
        })
        .select()
        .single();

      if (brandError) {
        logger.error('Brand creation failed', brandError, { companyName, domain: brandDomain });
        await supabase.storage.from(LOGOS_BUCKET).remove([fileName]);
        return handleSupabaseError(brandError);
      }

      brandId = newBrand.id;
      logger.info('Brand created successfully', { brandId, companyName });
    }

    // Step 2: Save logo variant to database
    logger.db('Inserting logo variant', { brandId, orgId });

    const { data: logoData, error: dbError } = await supabase
      .from('logo_variants')
      .insert({
        brand_id: brandId,
        organization_id: orgId,
        logo_url: publicUrl,
        logo_type: fileExt,
        logo_format: logoType,
        is_uploaded: true,
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Logo variant insert failed', dbError, { brandId, orgId });
      // Try to delete uploaded file if database insert fails
      await supabase.storage.from(LOGOS_BUCKET).remove([fileName]);
      return handleSupabaseError(dbError);
    }

    // Step 3: Set as primary logo variant if brand doesn't have one
    const { data: brandData } = await supabase
      .from('brands')
      .select('primary_logo_variant_id')
      .eq('id', brandId)
      .single();

    if (!brandData?.primary_logo_variant_id) {
      await supabase
        .from('brands')
        .update({ primary_logo_variant_id: logoData.id })
        .eq('id', brandId);
      logger.debug('Set as primary logo variant', { brandId, logoVariantId: logoData.id });
    }

    logger.info('Logo uploaded successfully', { logoId: logoData.id, brandId, companyName });

    return successResponse({
      message: 'Logo uploaded successfully',
      data: logoData
    }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to upload logo');
  }
}

// Configure max file size for the route (optional)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};