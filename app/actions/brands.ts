'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

/**
 * Server Action to save a brand with all its logo variants, colors, and fonts
 */
export async function saveBrand(data: {
  companyName: string;
  domain: string;
  description?: string;
  logoUrl: string;
  allLogos?: Array<{
    type: string;
    theme?: string;
    formats: Array<{
      src: string;
      format: string;
      width?: number;
      height?: number;
      size?: number;
      background?: string;
    }>;
  }>;
  brandColors?: Array<{ hex: string; type?: string; brightness?: number }>;
  brandFonts?: Array<{ name: string; type?: string; origin?: string }>;
  logoType: string;
  logoFormat: string;
  logoTheme?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoSize?: number;
}) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    // Step 1: Check if brand exists or create it
    const { data: existingBrands, error: fetchError } = await supabase
      .from('brands')
      .select('id')
      .eq('domain', data.domain)
      .eq('organization_id', orgId)
      .single();

    let brandId: string;

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingBrands) {
      brandId = existingBrands.id;
    } else {
      // Create new brand
      const { data: newBrand, error: createError } = await supabase
        .from('brands')
        .insert([{
          company_name: data.companyName,
          domain: data.domain,
          description: data.description || null,
          organization_id: orgId,
          client_id: (data as any).client_id || null, // Support client_id if provided
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating brand:', createError);
        return { error: createError.message };
      }

      if (!newBrand?.id) {
        return { error: 'Failed to create brand' };
      }

      brandId = newBrand.id;
    }

    // Step 2: Insert logo variants
    const variantsToInsert = [];
    let clickedLogoId: string | null = null;

    if (data.allLogos && data.allLogos.length > 0) {
      // Save ALL logo variants
      for (const logoGroup of data.allLogos) {
        for (const logoFormat of logoGroup.formats) {
          variantsToInsert.push({
            brand_id: brandId,
            organization_id: orgId,
            logo_url: logoFormat.src,
            logo_type: logoGroup.type,
            logo_format: logoFormat.format,
            theme: logoGroup.theme,
            width: logoFormat.width,
            height: logoFormat.height,
            file_size: logoFormat.size,
            background_color: logoFormat.background || data.brandColors?.find(c => c.type === 'brand')?.hex,
            accent_color: data.brandColors?.find(c => c.type === 'accent')?.hex,
          });
        }
      }
    } else {
      // Save only the clicked logo
      variantsToInsert.push({
        brand_id: brandId,
        organization_id: orgId,
        logo_url: data.logoUrl,
        logo_type: data.logoType,
        logo_format: data.logoFormat,
        theme: data.logoTheme,
        width: data.logoWidth,
        height: data.logoHeight,
        file_size: data.logoSize,
        background_color: data.brandColors?.find(c => c.type === 'brand')?.hex,
        accent_color: data.brandColors?.find(c => c.type === 'accent')?.hex,
      });
    }

    const { data: insertedVariants, error: variantError } = await supabase
      .from('logo_variants')
      .insert(variantsToInsert)
      .select();

    if (variantError) {
      return { error: variantError.message };
    }

    if (!insertedVariants || insertedVariants.length === 0) {
      return { error: 'Failed to insert logo variants' };
    }

    // Find the ID of the clicked logo
    const clickedVariant = insertedVariants.find(v => v.logo_url === data.logoUrl);
    clickedLogoId = clickedVariant?.id || insertedVariants[0].id;

    // Step 3: Set primary logo variant if not set
    const { data: brand } = await supabase
      .from('brands')
      .select('primary_logo_variant_id')
      .eq('id', brandId)
      .single();

    if (!brand?.primary_logo_variant_id && clickedLogoId) {
      await supabase
        .from('brands')
        .update({ primary_logo_variant_id: clickedLogoId })
        .eq('id', brandId);
    }

    // Step 4: Insert brand colors
    if (data.brandColors && data.brandColors.length > 0) {
      const { data: existingColors } = await supabase
        .from('brand_colors')
        .select('id')
        .eq('brand_id', brandId)
        .limit(1);

      if (!existingColors || existingColors.length === 0) {
        const colorInserts = data.brandColors.map(color => ({
          brand_id: brandId,
          hex: color.hex,
          type: color.type,
          brightness: color.brightness,
        }));

        await supabase.from('brand_colors').insert(colorInserts);
      }
    }

    // Step 5: Insert brand fonts
    if (data.brandFonts && data.brandFonts.length > 0) {
      const { data: existingFonts } = await supabase
        .from('brand_fonts')
        .select('id')
        .eq('brand_id', brandId)
        .limit(1);

      if (!existingFonts || existingFonts.length === 0) {
        const fontInserts = data.brandFonts.map(font => ({
          brand_id: brandId,
          font_name: font.name,
          font_type: font.type,
          origin: font.origin,
        }));

        await supabase.from('brand_fonts').insert(fontInserts);
      }
    }

    revalidatePath('/brands');
    revalidatePath('/search');

    return { success: true, brandId };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Server Action to delete a brand and all associated data
 */
export async function deleteBrand(brandId: string) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return { error: 'Unauthorized' };
    }

    const supabase = createServerClient();

    // Fetch logo variants to delete storage files
    const { data: logoVariants } = await supabase
      .from('logo_variants')
      .select('logo_url')
      .eq('brand_id', brandId)
      .eq('organization_id', orgId);

    // Delete logo files from storage
    if (logoVariants && logoVariants.length > 0) {
      const filesToDelete: string[] = [];
      logoVariants.forEach((variant) => {
        const url = variant.logo_url;
        const match = url.match(/\/logos\/([^?]+)/);
        if (match && match[1]) {
          filesToDelete.push(match[1]);
        }
      });

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('logos')
          .remove(filesToDelete);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database deletion even if storage fails
        }
      }
    }

    // Delete the brand (cascade delete variants, colors, fonts)
    const { error: deleteError } = await supabase
      .from('brands')
      .delete()
      .eq('id', brandId)
      .eq('organization_id', orgId);

    if (deleteError) {
      console.error('Error deleting brand:', deleteError);
      return { error: deleteError.message };
    }

    revalidatePath('/brands');
    revalidatePath('/search');

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'An unexpected error occurred' };
  }
}
