import { notFound } from 'next/navigation';
import { createServerAdminClient } from '@/lib/supabase/server';
import SharePreviewClient from './SharePreviewClient';

export const dynamic = 'force-dynamic';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

async function getShareData(token: string) {
  const supabase = createServerAdminClient();

  // Get share link
  const { data: shareLink, error: shareError } = await supabase
    .from('public_share_links')
    .select(`
      id,
      token,
      expires_at,
      password_hash,
      permissions,
      use_count,
      asset_id
    `)
    .eq('token', token)
    .single();

  if (shareError || !shareLink) {
    return null;
  }

  // Check if expired
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return { expired: true };
  }

  // Check if password protected
  if (shareLink.password_hash) {
    return { requiresPassword: true, shareLinkId: shareLink.id };
  }

  // Get the mockup data
  const { data: mockup, error: mockupError } = await supabase
    .from('assets')
    .select(`
      id,
      mockup_name,
      mockup_image_url,
      created_at,
      updated_at
    `)
    .eq('id', shareLink.asset_id)
    .single();

  if (mockupError || !mockup) {
    return null;
  }

  // Update view count
  await supabase
    .from('public_share_links')
    .update({
      use_count: (shareLink.use_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', shareLink.id);

  return {
    mockup,
    canDownload: shareLink.permissions === 'view', // For now, view permission includes download
    shareLinkId: shareLink.id,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const data = await getShareData(token);

  if (!data) {
    notFound();
  }

  if (data.expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600">
            This share link has expired. Please request a new link from the owner.
          </p>
        </div>
      </div>
    );
  }

  if (data.requiresPassword) {
    return <SharePreviewClient requiresPassword shareLinkId={data.shareLinkId} token={token} />;
  }

  return (
    <SharePreviewClient
      mockup={data.mockup}
      canDownload={data.canDownload}
      shareLinkId={data.shareLinkId}
      token={token}
    />
  );
}
